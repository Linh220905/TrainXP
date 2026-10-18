import { defaultProfile, defaultStats } from "@/lib/stateDefaults";
import { useTodayKey } from "@/hooks/useTodayKey";
import { withTimeout } from "@/lib/async";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState as NativeAppState } from "react-native";
import {
  fetchCloudUserData,
  hasPendingCloudMutations,
  replayCloudOutbox,
  clearCloudOutboxForUser,
  syncAppStateToCloud,
  syncCollectionsToCloud,
  syncProfileToCloud,
  supabase,
} from "@/lib/supabase";
import { type MuscleSlug, musclesOf } from "@/lib/muscles";
import { type ProgressionPolicy, calculate1RM } from "@/lib/progression";
import { type WorkoutHistoryItem } from "@/lib/effort";
import { calculateInitialGamification } from "@/lib/onboardingGamification";
import { generatePersonalizedPlan } from "@/lib/planGenerator";
import { localDateKey } from "@/lib/units";
import {
  initPurchases,
  checkHasProEntitlement,
  setupPurchasesListener,
  syncPurchasesUser,
  logOutPurchases,
} from "@/lib/purchases";
import {
  signInWithApple,
  signInWithGoogle,
  signInWithPassword,
  deleteUserAccount,
} from "@/lib/auth";
import {
  normalizeSnapshot,
  mergeSnapshots,
  stampChanges,
  withDerivedStats,
  type StateSnapshot,
} from "@/lib/stateModel";
import { writeJson, removeStored, flushStorage } from "@/lib/storage";
import { liveActivity } from "@/lib/liveActivity";

export type Experience =
  | "Regularly"
  | "Less than 1 year ago"
  | "More than 1 year ago"
  | "No experience";
export type PrimaryGoal =
  | "Build Muscle"
  | "Burn Fat"
  | "Increase Endurance"
  | "Weight Loss"
  | "Weight Gain"
  | "Optimize Workouts";
export type BodyType = "Athletic" | "Balanced" | "Strong";
export type Gender = "Male" | "Female";
export type UnitSystem = "Metric" | "Imperial";

export interface RoutineExercise {
  id: string;
  sets: number;
  reps: number;
  targetWeight?: number;
  targetReps?: number;
  rir?: number;
  supersetId?: string; // Links consecutive exercises into superset
  progression?: ProgressionPolicy;
  minReps?: number;
  maxReps?: number;
}

export interface Routine {
  id: string;
  name: string;
  emoji: string;
  progression: ProgressionPolicy;
  exercises: RoutineExercise[];
}

export interface BodyweightLog {
  date: string;
  weight: number;
  timestamp: number;
}

export interface Profile {
  name: string;
  unit: UnitSystem;
  weight: number;
  height: number;
  thinkAboutFitness: string;
  achieveMotivations: string[];
  goal: PrimaryGoal;
  sensitiveJoints: string[];
  experience: Experience;
  hasRoutine: boolean;
  equipment: string[];
  lastMusclesWorked: string[];
  workoutDuration: string;
  daysPerWeek: number;
  targetMuscles: string[];
  bodyType: BodyType;
  gender: Gender;
  birthYear: number;
  birthMonth: string;
  birthDay: number;
  prSquat: number;
  benchPressPR?: number;
  deadliftPR?: number;
  goalWeight: number;
  goalWeeks: number;
  streakCommitment: number;
  notificationsEnabled: boolean;
  username?: string;
  referralSource?: string;
  rating?: number;
  isPro: boolean;
  authEmail?: string;
  authProvider?: "apple" | "google" | "email" | null;
  authUserId?: string;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  workouts: number;
  prs: number;
  totalVolume: number;
  muscleTrainedCount: Partial<Record<MuscleSlug, number>>;
}

export interface WorkoutResult {
  xp: number;
  duration: string;
  exercises: number;
  sets: number;
  volume: number;
  newPr: boolean;
  rankedUp: boolean;
}

interface AppStateValue {
  hydrated: boolean;
  isAuthenticated: boolean;
  syncStatus: "local" | "syncing" | "synced" | "error";
  retrySync: () => Promise<void>;
  hasOnboarded: boolean;
  profile: Profile;
  stats: PlayerStats;
  lastWorkout: WorkoutResult | null;
  routines: Routine[];
  weekSchedule: Record<number, string | null>; // 0=Sun, 1=Mon... 6=Sat -> routineId or null
  bodyweightLogs: BodyweightLog[];
  workoutsHistory: WorkoutHistoryItem[];
  addRoutine: (routine: Omit<Routine, "id">) => Routine;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  deleteWorkout: (id: string) => void;
  assignWeekSchedule: (dayIdx: number, routineId: string | null) => void;
  loadStarterPlan: (customProfile?: Profile) => void;
  logBodyweight: (weight: number) => void;
  finishWorkout: (customMetrics?: {
    sessionId?: string;
    volume?: number;
    exercises?: number;
    sets?: number;
    muscles?: MuscleSlug[];
    duration?: string;
    routineName?: string;
    entries?: {
      id: string;
      sets: {
        weight?: number | string;
        reps?: number | string;
        targetReps?: number;
        rir?: number;
        isDropSet?: boolean;
        setType?: "normal" | "warmup" | "dropset" | "failure";
        done: boolean;
      }[];
      supersetId?: string;
      progression?: ProgressionPolicy;
    }[];
  }) => WorkoutResult;
  completeOnboarding: (profile: Profile) => void;
  resetOnboarding: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  setProStatus: (isPro: boolean) => void;
  loginApple: () => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  loginPassword: (identifier: string, password: string) => Promise<boolean>;
  logoutAuth: () => Promise<void>;
  deleteAccountData: () => Promise<void>;
}

const LEGACY_STORAGE_KEY = "@train-xp/state";
const STORAGE_KEY_PREFIX = "@train-xp/state:";

export const STARTER_ROUTINES: Routine[] = [
  {
    id: "starter_push",
    name: "Push Day (Chest, Shoulders & Tris)",
    emoji: "zap",
    progression: "linear",
    exercises: [
      { id: "barbell_bench_press", sets: 4, reps: 8, targetWeight: 60, rir: 2 },
      {
        id: "incline_barbell_bench_press",
        sets: 3,
        reps: 10,
        targetWeight: 50,
        rir: 2,
      },
      {
        id: "overhead_shoulder_press",
        sets: 3,
        reps: 8,
        targetWeight: 40,
        rir: 2,
      },
      {
        id: "pec_deck_fly",
        sets: 3,
        reps: 12,
        targetWeight: 45,
        rir: 1,
        supersetId: "ss_push_1",
      },
      {
        id: "tricep_rope_pushdown",
        sets: 3,
        reps: 12,
        targetWeight: 25,
        rir: 1,
        supersetId: "ss_push_1",
      },
    ],
  },
  {
    id: "starter_pull",
    name: "Pull Day (Back & Biceps)",
    emoji: "anchor",
    progression: "linear",
    exercises: [
      { id: "lat_pulldown", sets: 4, reps: 10, targetWeight: 55, rir: 2 },
      {
        id: "barbell_bent_over_row",
        sets: 4,
        reps: 8,
        targetWeight: 60,
        rir: 2,
      },
      { id: "seated_cable_row", sets: 3, reps: 10, targetWeight: 50, rir: 2 },
      {
        id: "standing_bicep_cable_curl",
        sets: 3,
        reps: 12,
        targetWeight: 25,
        rir: 1,
      },
      { id: "hammer_curls", sets: 3, reps: 12, targetWeight: 14, rir: 1 },
    ],
  },
  {
    id: "starter_legs",
    name: "Leg Day (Quads, Glutes & Calves)",
    emoji: "shield",
    progression: "linear",
    exercises: [
      { id: "barbell_back_squat", sets: 4, reps: 8, targetWeight: 80, rir: 2 },
      { id: "leg_press_machine", sets: 3, reps: 10, targetWeight: 140, rir: 2 },
      {
        id: "lying_leg_curl",
        sets: 3,
        reps: 12,
        targetWeight: 40,
        rir: 1,
        supersetId: "ss_leg_1",
      },
      {
        id: "leg_extension_machine",
        sets: 3,
        reps: 12,
        targetWeight: 45,
        rir: 1,
        supersetId: "ss_leg_1",
      },
      {
        id: "standing_calf_raise",
        sets: 4,
        reps: 15,
        targetWeight: 50,
        rir: 1,
      },
    ],
  },
];

const defaultWeekSchedule: Record<number, string | null> = {
  1: "starter_push", // Mon
  2: null, // Tue
  3: "starter_pull", // Wed
  4: null, // Thu
  5: "starter_legs", // Fri
  6: null, // Sat
  0: null, // Sun
};

const defaultWorkoutsHistory: WorkoutHistoryItem[] = [];
const defaultBodyweightLogs: BodyweightLog[] = [];

const AppStateContext = createContext<AppStateValue | null>(null);
const GUEST_KEY = `${STORAGE_KEY_PREFIX}local-guest`;
const initialState: StateSnapshot = {
  schemaVersion: 3,
  hasOnboarded: false,
  profile: defaultProfile,
  stats: defaultStats,
  lastWorkout: null,
  routines: STARTER_ROUTINES,
  weekSchedule: defaultWeekSchedule,
  bodyweightLogs: [],
  workoutsHistory: [],
  baselineXp: 0,
  clocks: {},
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const todayKey = useTodayKey();
  const [snapshot, setSnapshot] = useState(initialState);
  const current = useRef(snapshot);
  const storageKey = useRef(GUEST_KEY);
  const activeUser = useRef<string | null>(null);
  const generation = useRef(0);
  const ready = useRef(false);
  const mounted = useRef(true);
  const authLock = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] =
    useState<AppStateValue["syncStatus"]>("local");
  const listenerCleanup = useRef<(() => void) | null>(null);
  const syncing = useRef<Promise<void> | null>(null);

  const publish = (next: StateSnapshot) => {
    current.current = next;
    if (mounted.current) setSnapshot(next);
  };
  const save = (next: StateSnapshot, previous?: StateSnapshot) => {
    const key = storageKey.current,
      userId = activeUser.current,
      version = generation.current;
    if (!userId) return Promise.resolve();
    return writeJson(key, next)
      .then(async () => {
        if (version !== generation.current || !mounted.current) return;
        if (userId) {
          setSyncStatus("syncing");
          await syncAppStateToCloud(next, userId);
          if (previous) await syncCollectionsToCloud(previous, next, userId);
          if (next.hasOnboarded)
            await syncProfileToCloud(next.profile, next.stats, undefined, userId);
          if (version === generation.current && mounted.current)
            setSyncStatus("synced");
        } else setSyncStatus("local");
      })
      .catch(() => {
        if (version === generation.current && mounted.current)
          setSyncStatus("error");
      });
  };
  const commit = (change: (state: StateSnapshot) => StateSnapshot) => {
    if (!ready.current) return current.current;
    const before = current.current;
    const changed = change(before);
    const needsStats =
      changed.workoutsHistory !== before.workoutsHistory ||
      changed.baselineXp !== before.baselineXp ||
      changed.profile.prSquat !== before.profile.prSquat ||
      changed.profile.benchPressPR !== before.profile.benchPressPR ||
      changed.profile.deadliftPR !== before.profile.deadliftPR;
    const next = stampChanges(
      before,
      needsStats ? withDerivedStats(changed) : changed,
    );
    publish(next);
    void save(next, before);
    return next;
  };
  const bindPurchases = async (userId: string | null, version: number) => {
    listenerCleanup.current?.();
    listenerCleanup.current = null;
    if (!userId || !(await initPurchases(userId))) return;
    const entitlement = await checkHasProEntitlement();
    if (!mounted.current || generation.current !== version) return;
    if (entitlement !== null && entitlement !== current.current.profile.isPro)
      commit((s) => ({ ...s, profile: { ...s.profile, isPro: entitlement } }));
    listenerCleanup.current = setupPurchasesListener((isPro) => {
      if (generation.current === version && mounted.current)
        commit((s) => ({ ...s, profile: { ...s.profile, isPro } }));
    });
  };
  const reconcile = async (userId: string, version: number) => {
    try {
      setSyncStatus("syncing");
      // A failed replay does not discard local mutations. Remote merge respects their clocks.
      await replayCloudOutbox(userId).catch(() => undefined);
      const pending = await hasPendingCloudMutations(userId);
      const cloud = await withTimeout(fetchCloudUserData(userId));
      if (!cloud) throw new Error("Cloud unavailable");
      if (!mounted.current || generation.current !== version) return;
      if (cloud.appState || cloud.profile) {
        const raw = cloud.appState ?? {
          hasOnboarded: true,
          profile: cloud.profile,
          routines: cloud.routines,
          weekSchedule: cloud.weekSchedule,
          workoutsHistory: cloud.workouts,
          bodyweightLogs: cloud.bodyweightLogs,
        };
        const remote = normalizeSnapshot(raw, initialState);
        const local = current.current;
        const hasLocalData = pending || Object.keys(local.clocks).length > 0;
        const merged = hasLocalData ? mergeSnapshots(local, remote) : remote;
        publish({
          ...merged,
          profile: {
            ...merged.profile,
            authUserId: userId,
            authEmail: local.profile.authEmail,
            authProvider: local.profile.authProvider,
            isPro: local.profile.isPro,
          },
        });
      }
      await save(current.current);
      if (generation.current !== version || !mounted.current) return;
      const collectionsKey = `@train-xp/collections-synced:${userId}`;
      if (
        !(await hasPendingCloudMutations(userId)) &&
        !(await AsyncStorage.getItem(collectionsKey))
      ) {
        await syncCollectionsToCloud(initialState, current.current, userId);
        await AsyncStorage.setItem(collectionsKey, "1");
      }
    } catch {
      if (generation.current === version && mounted.current)
        setSyncStatus("error");
    }
  };
  const activate = async (
    userId: string | null,
    migrateLegacy = false,
    guest?: StateSnapshot,
  ) => {
    const version = ++generation.current;
    ready.current = false;
    setHydrated(false);
    listenerCleanup.current?.();
    listenerCleanup.current = null;
    activeUser.current = userId;
    storageKey.current = userId ? `${STORAGE_KEY_PREFIX}${userId}` : GUEST_KEY;

    if (!userId) {
      publish({
        ...initialState,
        hasOnboarded: false,
        profile: { ...defaultProfile },
      });
      ready.current = true;
      setHydrated(true);
      setSyncStatus("local");
      return;
    }

    publish({
      ...initialState,
      profile: { ...defaultProfile, authUserId: userId },
    });
    let raw: string | null = null;
    try {
      await flushStorage();
      raw = await AsyncStorage.getItem(storageKey.current);
      if (!raw && migrateLegacy)
        raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Local guest remains usable. */
    }
    if (generation.current !== version || !mounted.current) return;
    let local = initialState;
    try {
      if (raw) local = normalizeSnapshot(JSON.parse(raw), initialState);
    } catch {
      /* Malformed cache is not trusted. */
    }
    // Carry the guest survey only into a new account. Remote data is merged when it arrives.
    if (!raw && guest && !guest.profile.authProvider && userId) {
      const cloud = await withTimeout(fetchCloudUserData(userId)).catch(
        () => null,
      );
      if (generation.current !== version || !mounted.current) return;
      if (cloud?.appState)
        local = normalizeSnapshot(cloud.appState, initialState);
      else if (cloud?.profile)
        local = normalizeSnapshot(
          {
            hasOnboarded: true,
            profile: cloud.profile,
            routines: cloud.routines,
            weekSchedule: cloud.weekSchedule,
            workoutsHistory: cloud.workouts,
            bodyweightLogs: cloud.bodyweightLogs,
          },
          initialState,
        );
      else if (cloud) local = guest;
      // A failed account lookup never uploads the guest's history over an existing account.
    }
    const { data } = await withTimeout(supabase.auth.getSession()).catch(
      () => ({ data: { session: null } }),
    );
    if (generation.current !== version || !mounted.current) return;
    const user = data.session?.user;
    const provider = user?.app_metadata?.provider;
    publish({
      ...local,
      profile: {
        ...local.profile,
        authUserId: userId ?? undefined,
        authEmail:
          userId && user && !user.is_anonymous ? user.email : undefined,
        authProvider:
          provider === "apple" || provider === "google" || provider === "email"
            ? provider
            : null,
      },
    });
    ready.current = true;
    setHydrated(true);
    setSyncStatus(userId ? "syncing" : "local");
    void bindPurchases(userId, version).catch(() => {
      if (generation.current === version && mounted.current)
        setSyncStatus("error");
    });
    if (userId) void reconcile(userId, version);
  };
  const retrySync = async () => {
    if (syncing.current) return syncing.current;
    const operation = (async () => {
      if (!activeUser.current) return;
      await reconcile(activeUser.current, generation.current);
    })();
    syncing.current = operation;
    try {
      await operation;
    } catch {
      if (mounted.current) setSyncStatus("error");
    } finally {
      syncing.current = null;
    }
  };
  useEffect(() => {
    mounted.current = true;
    liveActivity.attach();
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession());
        const user = data.session?.user;
        if (user?.is_anonymous) {
          await supabase.auth.signOut().catch(() => undefined);
        }
        const id = user && !user.is_anonymous ? user.id : null;
        if (!cancelled) await activate(id);
      } catch {
        if (!cancelled) await activate(null);
      }
    })().catch(() => {
      if (!cancelled) {
        ready.current = true;
        setHydrated(true);
        setSyncStatus("error");
      }
    });
    const sub = NativeAppState.addEventListener("change", (state) => {
      if (state === "active" && ready.current) {
        publish(withDerivedStats(current.current));
        void retrySync();
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      generation.current++;
      ready.current = false;
      sub.remove();
      listenerCleanup.current?.();
      liveActivity.dispose();
    };
  }, []);

  useEffect(() => {
    if (ready.current) publish(withDerivedStats(current.current));
  }, [todayKey]);
  useEffect(() => {
    if (syncStatus !== "error") return;
    const timer = setTimeout(() => {
      if (ready.current && NativeAppState.currentState !== "background")
        void retrySync();
    }, 15000);
    return () => clearTimeout(timer);
  }, [syncStatus]);

  const addRoutine = (input: Omit<Routine, "id">): Routine => {
    const routine = {
      ...input,
      name: input.name.trim(),
      id: `routine_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
    };
    if (!routine.name || !routine.exercises.length)
      throw new Error("Routine requires a name and exercises");
    commit((s) => ({ ...s, routines: [...s.routines, routine] }));
    return routine;
  };
  const updateRoutine = (id: string, updates: Partial<Routine>) =>
    commit((s) => ({
      ...s,
      routines: s.routines.map((r) =>
        r.id === id ? { ...r, ...updates, id } : r,
      ),
    }));
  const deleteRoutine = (id: string) =>
    commit((s) => ({
      ...s,
      routines: s.routines.filter((r) => r.id !== id),
      weekSchedule: Object.fromEntries(
        Object.entries(s.weekSchedule).map(([d, r]) => [
          d,
          r === id ? null : r,
        ]),
      ),
    }));
  const assignWeekSchedule = (day: number, routineId: string | null) => {
    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      (routineId && !current.current.routines.some((r) => r.id === routineId))
    )
      return;
    commit((s) => ({
      ...s,
      weekSchedule: { ...s.weekSchedule, [day]: routineId },
    }));
  };
  const loadStarterPlan = (custom?: Profile) =>
    commit((s) => {
      const profile = custom ?? s.profile,
        plan = generatePersonalizedPlan(profile);
      return {
        ...s,
        profile: { ...s.profile, daysPerWeek: profile.daysPerWeek },
        routines: plan.routines,
        weekSchedule: plan.weekSchedule,
      };
    });
  const logBodyweight = (weight: number) => {
    if (!Number.isFinite(weight) || weight < 15 || weight > 300)
      throw new Error("Invalid bodyweight");
    const log = { date: localDateKey(), weight, timestamp: Date.now() };
    commit((s) => ({
      ...s,
      profile: { ...s.profile, weight },
      bodyweightLogs: [
        ...s.bodyweightLogs.filter((l) => l.date !== log.date),
        log,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  };
  const completeOnboarding = (input: Profile) => {
    if (!input.name.trim()) throw new Error("Display name is required");
    return commit((s) => {
      const profile = {
        ...input,
        name: input.name.trim(),
        authUserId: s.profile.authUserId,
        authEmail: s.profile.authEmail,
        authProvider: s.profile.authProvider,
        isPro: s.profile.isPro,
      };
      const firstTime =
        !s.hasOnboarded &&
        s.baselineXp === 0 &&
        !s.bodyweightLogs.length &&
        !s.workoutsHistory.length;
      const plan = generatePersonalizedPlan(profile);
      if (!firstTime) {
        const generatedIds = new Set([
          "starter_push", "starter_pull", "starter_legs",
          "routine_fb_a", "routine_fb_b",
          "routine_push", "routine_pull", "routine_legs",
          "routine_upper_a", "routine_lower_a", "routine_upper_b", "routine_lower_b",
          "routine_p1", "routine_pu1", "routine_l1", "routine_up_x", "routine_low_x",
        ]);
        return {
          ...s,
          profile,
          hasOnboarded: true,
          routines: [
            ...s.routines.filter((routine) => !generatedIds.has(routine.id)),
            ...plan.routines,
          ],
          weekSchedule: plan.weekSchedule,
        };
      }
      return {
        ...s,
        profile,
        hasOnboarded: true,
        baselineXp: calculateInitialGamification({
          benchKg: profile.benchPressPR,
          squatKg: profile.prSquat,
          deadliftKg: profile.deadliftPR,
          bodyweightKg: profile.weight,
        }).totalExp,
        routines: plan.routines,
        weekSchedule: plan.weekSchedule,
        bodyweightLogs: s.bodyweightLogs.length
          ? s.bodyweightLogs
          : [
              {
                date: localDateKey(),
                weight: profile.weight,
                timestamp: Date.now(),
              },
            ],
      };
    });
  };
  const resetOnboarding = async () => {
    const next = commit((s) => ({ ...s, hasOnboarded: false }));
    await writeJson(storageKey.current, next);
    await removeStored("@train-xp/onboarding-draft");
  };
  const updateProfile = (updates: Partial<Profile>) =>
    commit((s) => ({
      ...s,
      profile: {
        ...s.profile,
        ...updates,
        authUserId: s.profile.authUserId,
        authEmail: s.profile.authEmail,
        authProvider: s.profile.authProvider,
        isPro: s.profile.isPro,
      },
    }));
  const setProStatus = (isPro: boolean) =>
    commit((s) => ({ ...s, profile: { ...s.profile, isPro } }));
  const login = async (provider: "apple" | "google") => {
    if (authLock.current) return false;
    authLock.current = true;
    const guest = current.current;
    try {
      await flushStorage();
      const user =
        provider === "apple"
          ? await signInWithApple()
          : await signInWithGoogle();
      if (!user) return false;
      await activate(user.id, false, guest);
      await syncPurchasesUser(user.id);
      const isPro = await checkHasProEntitlement();
      commit((s) => ({
        ...s,
        profile: {
          ...s.profile,
          authUserId: user.id,
          authEmail: user.email,
          authProvider: provider,
          isPro: isPro ?? s.profile.isPro,
        },
      }));
      return true;
    } finally {
      authLock.current = false;
    }
  };
  const loginPassword = async (identifier: string, pass: string) => {
    if (authLock.current) return false;
    authLock.current = true;
    const guest = current.current;
    try {
      await flushStorage();
      const user = await signInWithPassword(identifier, pass);
      if (!user) return false;
      await activate(user.id, false, guest);
      await syncPurchasesUser(user.id);
      const isPro = await checkHasProEntitlement();
      commit((s) => ({
        ...s,
        profile: {
          ...s.profile,
          authUserId: user.id,
          authEmail: user.email,
          authProvider: "email",
          isPro: isPro ?? s.profile.isPro,
        },
      }));
      return true;
    } finally {
      authLock.current = false;
    }
  };
  const logoutAuth = async () => {
    if (authLock.current) return;
    authLock.current = true;
    try {
      await supabase.auth.signOut().catch(() => undefined);
      await liveActivity.endActivity().catch(() => undefined);
      await logOutPurchases().catch(() => undefined);
      await removeStored(GUEST_KEY).catch(() => undefined);
      await removeStored(LEGACY_STORAGE_KEY).catch(() => undefined);
      await removeStored("@train-xp/onboarding-draft").catch(() => undefined);
      await activate(null);
    } finally {
      authLock.current = false;
    }
  };
  const deleteAccountData = async () => {
    if (authLock.current) return;
    authLock.current = true;
    const id = activeUser.current,
      key = storageKey.current;
    const before = current.current;
    generation.current++;
    ready.current = false;
    listenerCleanup.current?.();
    listenerCleanup.current = null;
    try {
      await flushStorage();
      await deleteUserAccount();
      if (id) await clearCloudOutboxForUser(id);
      await removeStored(key);
      if (id) await removeStored(`@train-xp/workout-draft:${id}`);
      await liveActivity.endActivity().catch(() => undefined);
      await logOutPurchases().catch(() => undefined);
      await removeStored(GUEST_KEY).catch(() => undefined);
      await removeStored(LEGACY_STORAGE_KEY).catch(() => undefined);
      await removeStored("@train-xp/onboarding-draft").catch(() => undefined);
      await activate(null);
    } catch (error) {
      ready.current = true;
      publish(before);
      void bindPurchases(id, generation.current).catch(() =>
        setSyncStatus("error"),
      );
      throw error;
    } finally {
      authLock.current = false;
    }
  };
  const deleteWorkout = (id: string) =>
    commit((s) => ({
      ...s,
      workoutsHistory: s.workoutsHistory.filter((w) => w.id !== id),
    }));
  const finishWorkout: AppStateValue["finishWorkout"] = (metrics = {}) => {
    if (!ready.current || !metrics.sessionId)
      throw new Error("Workout session is not ready");
    const existing = current.current.workoutsHistory.find(
      (w) => w.id === metrics.sessionId,
    );
    if (existing)
      return {
        xp: existing.xp,
        duration: existing.duration,
        exercises: existing.entries.length,
        sets: existing.entries.reduce(
          (n, e) => n + e.sets.filter((s) => s.done).length,
          0,
        ),
        volume: existing.volume,
        newPr: false,
        rankedUp: false,
      };
    const entries = metrics.entries ?? [];
    if (!entries.some((e) => e.sets.some((s) => s.done)))
      throw new Error("No completed sets");
    let volume = 0;
    for (const entry of entries) {
      for (const set of entry.sets) {
        if (!set.done) continue;
        const weight = Number(set.weight),
          reps = Number(set.reps);
        if (
          !Number.isFinite(weight) ||
          weight < 0 ||
          weight > 1000 ||
          !Number.isInteger(reps) ||
          reps < 1 ||
          reps > 100
        )
          throw new Error("Invalid completed set");
        volume += weight * reps;
      }
    }
    const oldStats = current.current.stats;
    const xp = current.current.profile.isPro ? 250 : 180;
    const item: WorkoutHistoryItem = {
      id: metrics.sessionId,
      date: new Date().toISOString(),
      duration: metrics.duration ?? "00:00",
      volume: Math.round(volume),
      xp,
      routineName: metrics.routineName ?? "Custom Workout",
      entries,
    };
    const next = commit((s) => ({
      ...s,
      workoutsHistory: [item, ...s.workoutsHistory],
    }));
    return {
      ...next.lastWorkout!,
      newPr: next.stats.prs > oldStats.prs,
      rankedUp: next.stats.level > oldStats.level,
    };
  };
  const isAuthenticated = useMemo(() => {
    return Boolean(
      activeUser.current &&
        snapshot.profile.authUserId &&
        snapshot.profile.authProvider,
    );
  }, [snapshot.profile.authUserId, snapshot.profile.authProvider]);
  const value = useMemo<AppStateValue>(
    () => ({
      ...snapshot,
      hydrated,
      isAuthenticated,
      syncStatus,
      retrySync,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      assignWeekSchedule,
      loadStarterPlan,
      logBodyweight,
      completeOnboarding,
      resetOnboarding,
      updateProfile,
      setProStatus,
      loginApple: () => login("apple"),
      loginGoogle: () => login("google"),
      loginPassword,
      logoutAuth,
      deleteAccountData,
      deleteWorkout,
      finishWorkout,
    }),
    [snapshot, hydrated, isAuthenticated, syncStatus],
  );
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context)
    throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
