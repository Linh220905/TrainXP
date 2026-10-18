import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import {
  mergeSnapshots,
  emptySnapshot,
  stampChanges,
  normalizeSnapshot,
  type StateSnapshot,
} from "./stateModel";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://nmnqmpjpczvoxauyosbv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbnFtcGpwY3p2b3hhdXlvc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODU5NjAsImV4cCI6MjEwNzM2MTk2MH0.D3qnHPiF8A5ttd2eqor8pl-t8gJ9TLg_duIEB7DD_K4";

const fetchWithDeadline: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const originalSignal = init?.signal;
  if (originalSignal?.aborted) cancel();
  originalSignal?.addEventListener("abort", cancel);
  const timer = setTimeout(cancel, 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    originalSignal?.removeEventListener("abort", cancel);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithDeadline },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

type CloudMutation = {
  id: string;
  userId: string;
  kind:
    | "profile"
    | "app-state-upsert"
    | "routine-upsert"
    | "routine-delete"
    | "workout-upsert"
    | "workout-delete"
    | "bodyweight-upsert"
    | "bodyweight-delete";
  payload: any;
};

const CLOUD_OUTBOX_KEY = "@train-xp/cloud-outbox";
let outboxLock: Promise<void> = Promise.resolve();
let cloudWriteLock: Promise<void> = Promise.resolve();

async function readOutbox(): Promise<CloudMutation[]> {
  const raw = await AsyncStorage.getItem(CLOUD_OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.userId === "string" &&
            typeof item.kind === "string",
        ) as CloudMutation[])
      : [];
  } catch {
    await AsyncStorage.removeItem(CLOUD_OUTBOX_KEY);
    return [];
  }
}

async function updateOutbox(
  update: (items: CloudMutation[]) => CloudMutation[],
): Promise<void> {
  const operation = outboxLock.then(async () => {
    const items = await readOutbox();
    await AsyncStorage.setItem(CLOUD_OUTBOX_KEY, JSON.stringify(update(items)));
  });
  outboxLock = operation.catch(() => undefined);
  await operation;
}

async function executeCloudMutation(mutation: CloudMutation): Promise<void> {
  const { userId, kind, payload } = mutation;
  let result: any;
  switch (kind) {
    case "profile":
      result = await supabase.from("profiles").upsert(payload);
      break;
    case "app-state-upsert": {
      // Optimistic compare-and-swap prevents two devices from replacing each other.
      let incoming = normalizeSnapshot(payload.state, emptySnapshot());
      if (!Object.keys(incoming.clocks).length)
        incoming = stampChanges(
          emptySnapshot(),
          incoming,
          Date.parse(payload.updated_at) || Date.now(),
        );
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: row, error } = await supabase
          .from("user_app_state")
          .select("state,updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        const state = row
          ? mergeSnapshots(
              incoming,
              normalizeSnapshot(row.state, emptySnapshot()),
            )
          : incoming;
        const updatedAt = new Date(
          Math.max(Date.now(), row ? Date.parse(row.updated_at) + 1 : 0),
        ).toISOString();
        if (row) {
          const update = await supabase
            .from("user_app_state")
            .update({ state, updated_at: updatedAt })
            .eq("user_id", userId)
            .eq("updated_at", row.updated_at)
            .select("user_id");
          if (update.error) throw update.error;
          if (update.data?.length) return;
        } else {
          const insert = await supabase
            .from("user_app_state")
            .insert({ user_id: userId, state, updated_at: updatedAt });
          if (!insert.error) return;
          if (insert.error.code !== "23505") throw insert.error;
        }
      }
      throw new Error("Cloud changed while saving; snapshot remains queued");
    }
    case "routine-upsert":
      result = await supabase.from("routines").upsert(payload);
      break;
    case "routine-delete":
      result = await supabase
        .from("routines")
        .delete()
        .eq("id", payload.id)
        .eq("user_id", userId);
      break;
    case "workout-upsert":
      result = await supabase.from("workouts").upsert(payload);
      break;
    case "workout-delete":
      result = await supabase
        .from("workouts")
        .delete()
        .eq("id", payload.id)
        .eq("user_id", userId);
      break;
    case "bodyweight-upsert": {
      const { data: existing, error: readError } = await supabase
        .from("bodyweight_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("date", payload.date)
        .maybeSingle();
      if (readError) throw readError;
      result = existing?.id
        ? await supabase
            .from("bodyweight_logs")
            .update({ weight: payload.weight })
            .eq("id", existing.id)
        : await supabase.from("bodyweight_logs").insert({
            user_id: userId,
            weight: payload.weight,
            date: payload.date,
          });
      break;
    }
    case "bodyweight-delete":
      result = await supabase
        .from("bodyweight_logs")
        .delete()
        .eq("user_id", userId)
        .eq("date", payload.date);
      break;
  }
  if (result?.error) throw result.error;
}

async function saveAndSyncMutation(
  userId: string,
  kind: CloudMutation["kind"],
  payload: any,
): Promise<void> {
  const mutation: CloudMutation = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    userId,
    kind,
    payload,
  };
  await updateOutbox((items) => {
    if (kind !== "app-state-upsert") return [...items, mutation];
    const older = items.filter(
      (item) => item.userId === userId && item.kind === kind,
    );
    const state = older.reduce(
      (next, item) => {
        let queued = normalizeSnapshot(item.payload?.state, emptySnapshot());
        if (!Object.keys(queued.clocks).length)
          queued = stampChanges(
            emptySnapshot(),
            queued,
            Date.parse(item.payload?.updated_at) || 1,
          );
        return mergeSnapshots(next, queued);
      },
      normalizeSnapshot(payload.state, emptySnapshot()),
    );
    return [
      ...items.filter((item) => item.userId !== userId || item.kind !== kind),
      { ...mutation, payload: { ...payload, state } },
    ];
  });
  await replayCloudOutbox(userId);
}

export async function replayCloudOutbox(expectedUserId: string): Promise<void> {
  const operation = cloudWriteLock
    .catch(() => undefined)
    .then(async () => {
      // Never create another identity while sending a mutation for an existing account.
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== expectedUserId)
        throw new Error("Cloud identity changed");
      const items = await readOutbox();
      for (const mutation of items) {
        if (mutation.userId !== expectedUserId) continue;
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user.id !== expectedUserId)
          throw new Error("Cloud identity changed");
        await executeCloudMutation(mutation);
        await updateOutbox((current) =>
          current.filter((item) => item.id !== mutation.id),
        );
      }
    });
  cloudWriteLock = operation.catch(() => undefined);
  await operation;
}

export async function hasPendingCloudMutations(
  userId: string,
): Promise<boolean> {
  return (await readOutbox()).some((item) => item.userId === userId);
}

export async function clearCloudOutboxForUser(userId: string): Promise<void> {
  await updateOutbox((items) => items.filter((item) => item.userId !== userId));
}

export async function syncAppStateToCloud(
  state: StateSnapshot,
  userId: string,
): Promise<void> {
  await saveAndSyncMutation(userId, "app-state-upsert", {
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  });
}

export async function syncCollectionsToCloud(
  previous: StateSnapshot,
  next: StateSnapshot,
  userId: string,
): Promise<void> {
  const groups = [
    {
      key: "routines",
      id: (item: any) => item.id,
      upsert: "routine-upsert",
      remove: "routine-delete",
    },
    {
      key: "workoutsHistory",
      id: (item: any) => item.id,
      upsert: "workout-upsert",
      remove: "workout-delete",
    },
    {
      key: "bodyweightLogs",
      id: (item: any) => item.date,
      upsert: "bodyweight-upsert",
      remove: "bodyweight-delete",
    },
  ] as const;

  for (const group of groups) {
    const oldItems = new Map(
      (previous[group.key] as any[]).map((item) => [group.id(item), item]),
    );
    const newItems = new Map(
      (next[group.key] as any[]).map((item) => [group.id(item), item]),
    );
    for (const [id] of oldItems) {
      if (!newItems.has(id)) {
        await saveAndSyncMutation(
          userId,
          group.remove,
          group.key === "bodyweightLogs" ? { date: id } : { id },
        );
      }
    }
    for (const [id, item] of newItems) {
      if (JSON.stringify(oldItems.get(id)) === JSON.stringify(item)) continue;
      const payload =
        group.key === "routines"
          ? {
              id,
              user_id: userId,
              name: item.name,
              emoji: item.emoji || "⚡",
              progression: item.progression || "linear",
              exercises: item.exercises || [],
            }
          : group.key === "workoutsHistory"
            ? {
                id,
                user_id: userId,
                routine_name: item.routineName || "Workout",
                duration: item.duration,
                volume: item.volume,
                xp: item.xp,
                date: item.date,
                entries: item.entries || [],
              }
            : { date: item.date, weight: item.weight };
      await saveAndSyncMutation(userId, group.upsert, payload);
    }
  }
}

let sessionRequest: Promise<string | null> | null = null;
export function ensureUserSession(): Promise<string | null> {
  if (!sessionRequest)
    sessionRequest = createUserSession().finally(() => {
      sessionRequest = null;
    });
  return sessionRequest;
}
async function createUserSession(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return null;
    }
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function syncProfileToCloud(
  profile: any,
  stats: any,
  weekSchedule?: any,
  expectedUserId?: string,
): Promise<void> {
  const userId = expectedUserId ?? (await ensureUserSession());
  if (!userId) throw new Error("No authenticated user for profile sync");

  const payload: any = {
    id: userId,
    name: profile.name,
    gender: profile.gender,
    weight: profile.weight,
    height: profile.height,
    goal: profile.goal,
    experience: profile.experience,
    level: stats.level,
    xp: stats.xp,
    xp_to_next: stats.xpToNext,
    streak: stats.streak,
    is_pro: profile.isPro,
    target_muscles: profile.targetMuscles || [],
    updated_at: new Date().toISOString(),
  };

  if (weekSchedule !== undefined) {
    payload.week_schedule = weekSchedule;
  }

  await saveAndSyncMutation(userId, "profile", payload);
}

export async function syncRoutineToCloud(routine: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, "routine-upsert", {
      id: routine.id,
      user_id: userId,
      name: routine.name,
      emoji: routine.emoji || "⚡",
      progression: routine.progression || "linear",
      exercises: routine.exercises || [],
    });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function deleteRoutineFromCloud(routineId: string): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, "routine-delete", { id: routineId });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncWorkoutToCloud(workout: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, "workout-upsert", {
      id: workout.id,
      user_id: userId,
      routine_name: workout.routineName,
      duration: workout.duration,
      volume: workout.volume,
      xp: workout.xp,
      date: workout.date,
      entries: workout.entries || [],
    });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function deleteWorkoutFromCloud(workoutId: string): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, "workout-delete", { id: workoutId });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function syncBodyweightLogToCloud(log: any): Promise<void> {
  try {
    const userId = await ensureUserSession();
    if (!userId) return;

    await saveAndSyncMutation(userId, "bodyweight-upsert", {
      date: log.date,
      weight: log.weight,
    });
  } catch {
    // Non-blocking offline fallback
  }
}

export async function fetchCloudUserData(expectedUserId?: string): Promise<{
  profile?: any;
  stats?: any;
  weekSchedule?: any;
  routines?: any[];
  workouts?: any[];
  bodyweightLogs?: any[];
  appState?: Record<string, any>;
} | null> {
  try {
    const userId = expectedUserId ?? (await ensureUserSession());
    if (!userId) return null;

    const [profileRes, routinesRes, workoutsRes, bwRes, appStateRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("routines").select("*").eq("user_id", userId),
        supabase
          .from("workouts")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false }),
        supabase
          .from("bodyweight_logs")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true }),
        supabase
          .from("user_app_state")
          .select("state")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    if (!appStateRes.error && appStateRes.data?.state)
      return { appState: appStateRes.data.state };
    const queryError =
      profileRes.error || routinesRes.error || workoutsRes.error || bwRes.error;
    if (queryError) throw queryError;

    const result: any = {};
    if (!appStateRes.error && appStateRes.data?.state)
      result.appState = appStateRes.data.state;

    if (profileRes.data) {
      const p = profileRes.data;
      result.profile = {
        name: p.name,
        gender: p.gender,
        weight: Number(p.weight),
        height: Number(p.height),
        goal: p.goal,
        experience: p.experience,
        targetMuscles: p.target_muscles || [],
        isPro: p.is_pro || false,
      };
      result.stats = {
        level: p.level || 1,
        xp: p.xp || 0,
        xpToNext: p.xp_to_next || 1000,
        streak: p.streak || 0,
      };
      if (p.week_schedule) {
        result.weekSchedule = p.week_schedule;
      }
    }

    if (routinesRes.data) {
      result.routines = routinesRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        progression: r.progression,
        exercises: r.exercises || [],
      }));
    }

    if (workoutsRes.data) {
      result.workouts = workoutsRes.data.map((w) => ({
        id: w.id,
        date: w.date,
        duration: w.duration,
        volume: Number(w.volume),
        xp: w.xp,
        routineName: w.routine_name,
        entries: w.entries || [],
      }));
    }

    if (bwRes.data) {
      result.bodyweightLogs = bwRes.data.map((b) => ({
        date: b.date,
        weight: Number(b.weight),
        timestamp: new Date(b.date).getTime(),
      }));
    }

    return result;
  } catch {
    return null;
  }
}
