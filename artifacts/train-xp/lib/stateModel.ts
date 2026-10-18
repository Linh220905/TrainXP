import { defaultProfile, defaultStats } from "./stateDefaults";
import { z } from "zod";
import type {
  Profile,
  PlayerStats,
  Routine,
  BodyweightLog,
  WorkoutResult,
} from "@/context/AppState";
import type { WorkoutHistoryItem } from "./effort";
import { calculateInitialGamification } from "./onboardingGamification";
import { calculate1RM } from "./progression";
import { musclesOf } from "./muscles";
import { localDateKey } from "./units";
import EXERCISES from "../../../data/exercises_supabase_seed.json";

const numeric = z.number().finite().nonnegative();
const exerciseById = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
);
const policy = z.enum(["off", "linear", "greyskull", "double", "time"]);
const setSchema = z.object({
  weight: z.union([numeric, z.string()]).optional(),
  reps: z.union([numeric, z.string()]).optional(),
  targetReps: numeric.optional(),
  rir: z.number().finite().min(0).max(10).optional(),
  rpe: z.number().finite().min(0).max(10).optional(),
  done: z.boolean(),
  isDropSet: z.boolean().optional(),
  setType: z.enum(["normal", "warmup", "dropset", "failure"]).optional(),
  sec: numeric.optional(),
});
const historySchema = z.object({
  id: z.string().min(1),
  date: z.string().refine((s) => Number.isFinite(Date.parse(s))),
  duration: z.string(),
  volume: numeric,
  xp: numeric,
  routineName: z.string().optional(),
  entries: z.array(
    z.object({
      id: z.string().min(1),
      sets: z.array(setSchema),
      supersetId: z.string().optional(),
      progression: policy.optional(),
    }),
  ),
});
const routineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  progression: policy,
  exercises: z.array(
    z.object({
      id: z.string().min(1),
      sets: z.number().int().min(1).max(20),
      reps: z.number().int().min(1).max(100),
      targetReps: numeric.optional(),
      targetWeight: numeric.optional(),
      rir: z.number().min(0).max(10).optional(),
      supersetId: z.string().optional(),
      progression: policy.optional(),
      minReps: numeric.optional(),
      maxReps: numeric.optional(),
    }),
  ),
});
const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().finite().min(15).max(300),
  timestamp: numeric,
});

export interface StateSnapshot {
  schemaVersion: 3;
  hasOnboarded: boolean;
  profile: Profile;
  stats: PlayerStats;
  lastWorkout: WorkoutResult | null;
  routines: Routine[];
  weekSchedule: Record<number, string | null>;
  bodyweightLogs: BodyweightLog[];
  workoutsHistory: WorkoutHistoryItem[];
  baselineXp: number;
  clocks: Record<string, number>;
}

export function emptySnapshot(): StateSnapshot {
  return {
    schemaVersion: 3,
    hasOnboarded: false,
    profile: { ...defaultProfile },
    stats: { ...defaultStats },
    lastWorkout: null,
    routines: [],
    weekSchedule: {
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    },
    bodyweightLogs: [],
    workoutsHistory: [],
    baselineXp: 0,
    clocks: {},
  };
}

function records<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function normalizeSnapshot(
  raw: unknown,
  defaults: StateSnapshot,
): StateSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const saved = raw as Record<string, unknown>;
  const profile = { ...defaults.profile };
  const incoming =
    saved.profile && typeof saved.profile === "object"
      ? (saved.profile as Record<string, unknown>)
      : {};
  for (const key of Object.keys(profile) as (keyof Profile)[]) {
    const value = incoming[key];
    if (value === undefined) continue;
    const fallback = profile[key];
    if (
      Array.isArray(fallback) &&
      Array.isArray(value) &&
      value.every((v) => typeof v === "string")
    )
      (profile as any)[key] = value;
    else if (
      typeof fallback === "number" &&
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    )
      (profile as any)[key] = value;
    else if (typeof fallback === "boolean" && typeof value === "boolean")
      (profile as any)[key] = value;
    else if (typeof fallback === "string" && typeof value === "string")
      (profile as any)[key] = value;
  }
  for (const key of ["username", "referralSource", "authEmail", "authUserId"] as const)
    if (typeof incoming[key] === "string") profile[key] = incoming[key];
  if (typeof incoming.rating === "number" && Number.isFinite(incoming.rating))
    profile.rating = incoming.rating;
  profile.authProvider =
    incoming.authProvider === "apple" ||
    incoming.authProvider === "google" ||
    incoming.authProvider === "email"
      ? incoming.authProvider
      : null;
  profile.unit = incoming.unit === "Imperial" ? "Imperial" : "Metric";
  profile.gender = incoming.gender === "Female" ? "Female" : "Male";
  if (profile.weight < 15 || profile.weight > 300)
    profile.weight = defaults.profile.weight;
  if (profile.height < 80 || profile.height > 250)
    profile.height = defaults.profile.height;
  profile.daysPerWeek = Math.min(
    6,
    Math.max(2, Math.round(profile.daysPerWeek)),
  );
  const history = records(saved.workoutsHistory, historySchema).sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  const routines =
    saved.routines === undefined
      ? defaults.routines
      : records(saved.routines, routineSchema);
  const ids = new Set(routines.map((r) => r.id));
  const schedule = { ...defaults.weekSchedule };
  const source =
    saved.weekSchedule && typeof saved.weekSchedule === "object"
      ? (saved.weekSchedule as any)
      : {};
  for (let day = 0; day < 7; day++)
    schedule[day] =
      typeof source[day] === "string" && ids.has(source[day])
        ? source[day]
        : null;
  const baseline = calculateInitialGamification({
    benchKg: profile.benchPressPR,
    squatKg: profile.prSquat,
    deadliftKg: profile.deadliftPR,
    bodyweightKg: profile.weight,
  }).totalExp;
  const normalized: StateSnapshot = {
    ...defaults,
    schemaVersion: 3,
    hasOnboarded: saved.hasOnboarded === true,
    profile,
    workoutsHistory: history,
    routines,
    weekSchedule: schedule,
    bodyweightLogs: records(saved.bodyweightLogs, logSchema).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    baselineXp:
      typeof saved.baselineXp === "number" && Number.isFinite(saved.baselineXp)
        ? Math.max(0, saved.baselineXp)
        : saved.hasOnboarded
          ? baseline
          : 0,
    clocks: z.record(z.string(), numeric).catch({}).parse(saved.clocks),
  };
  return withDerivedStats(normalized);
}

export function levelFromXp(totalXp: number) {
  const total = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  const level = Math.floor((1 + Math.sqrt(1 + (8 * total) / 1000)) / 2);
  const xp = total - (1000 * level * (level - 1)) / 2;
  return { level, xp, xpToNext: level * 1000 };
}

export function currentStreak(
  history: WorkoutHistoryItem[],
  today = new Date(),
): number {
  const days = new Set(history.map((w) => localDateKey(new Date(w.date))));
  const cursor = new Date(today);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function withDerivedStats(state: StateSnapshot): StateSnapshot {
  const best = new Map<string, number>();
  for (const [id, kg] of [
    ["barbell_bench_press", state.profile.benchPressPR],
    ["barbell_squat", state.profile.prSquat],
    ["barbell_back_squat", state.profile.prSquat],
    ["deadlift_barbell", state.profile.deadliftPR],
  ] as const)
    if (kg) best.set(id, kg);
  let prs = [
    state.profile.benchPressPR,
    state.profile.prSquat,
    state.profile.deadliftPR,
  ].filter((v) => Number(v) > 0).length;
  const counts: PlayerStats["muscleTrainedCount"] = {};
  for (const workout of [...state.workoutsHistory].reverse()) {
    let record = false;
    const muscles = new Set<keyof typeof counts>();
    for (const entry of workout.entries) {
      const done = entry.sets.filter((s) => s.done);
      const oneRm = Math.max(
        0,
        ...done.map((s) => calculate1RM(Number(s.weight), Number(s.reps))),
      );
      if (oneRm > (best.get(entry.id) ?? 0)) {
        best.set(entry.id, oneRm);
        record = true;
      }
      const ex = exerciseById.get(entry.id);
      if (done.length && ex)
        Object.keys(
          musclesOf({
            primary: ex.primary_muscles,
            secondary: ex.secondary_muscles,
          }),
        ).forEach((m) => muscles.add(m as keyof typeof counts));
    }
    if (record) prs++;
    muscles.forEach((m) => {
      counts[m] = (counts[m] ?? 0) + 1;
    });
  }
  const stats = {
    ...levelFromXp(
      state.baselineXp + state.workoutsHistory.reduce((n, w) => n + w.xp, 0),
    ),
    prs,
    workouts: state.workoutsHistory.length,
    totalVolume: state.workoutsHistory.reduce((n, w) => n + w.volume, 0),
    streak: currentStreak(state.workoutsHistory),
    muscleTrainedCount: counts,
  };
  const latest = state.workoutsHistory[0];
  return {
    ...state,
    stats,
    lastWorkout: latest
      ? {
          xp: latest.xp,
          duration: latest.duration,
          exercises: latest.entries.filter((e) => e.sets.some((s) => s.done))
            .length,
          sets: latest.entries.reduce(
            (n, e) => n + e.sets.filter((s) => s.done).length,
            0,
          ),
          volume: latest.volume,
          newPr: false,
          rankedUp: false,
        }
      : null,
  };
}

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function stampChanges(
  previous: StateSnapshot,
  next: StateSnapshot,
  createdAt = Date.now(),
): StateSnapshot {
  const clocks = { ...previous.clocks };
  const tick = Object.values(clocks).reduce(
    (max, value) => Math.max(max, value + 1),
    createdAt,
  );
  for (const key of Object.keys(next.profile) as (keyof Profile)[])
    if (!equal(previous.profile[key], next.profile[key]))
      clocks[`profile:${key}`] = tick;
  for (const key of ["hasOnboarded", "weekSchedule", "baselineXp"] as const)
    if (!equal(previous[key], next[key])) clocks[key] = tick;
  for (const group of [
    "routines",
    "workoutsHistory",
    "bodyweightLogs",
  ] as const) {
    const id = (item: any) =>
      group === "bodyweightLogs" ? item.date : item.id;
    const old = new Map(previous[group].map((item) => [id(item), item]));
    const fresh = new Map(next[group].map((item) => [id(item), item]));
    for (const key of new Set([...old.keys(), ...fresh.keys()]))
      if (!equal(old.get(key), fresh.get(key)))
        clocks[`${group}:${key}`] = tick;
  }
  return { ...next, clocks };
}

export function mergeSnapshots(
  local: StateSnapshot,
  remote: StateSnapshot,
): StateSnapshot {
  // Missing records with a clock are tombstones; they win against older copies.
  const merged = {
    ...local,
    profile: { ...local.profile },
    clocks: { ...remote.clocks, ...local.clocks },
  };
  const remoteWins = (
    key: string,
    localValue?: unknown,
    remoteValue?: unknown,
  ) => {
    const left = local.clocks[key] ?? 0,
      right = remote.clocks[key] ?? 0;
    if (left !== right) return right > left;
    if (!left) return remoteValue !== undefined;
    // Equal timestamps must converge; deletion wins an equal-clock update.
    if (remoteValue === undefined) return true;
    if (localValue === undefined) return false;
    return JSON.stringify(remoteValue) > JSON.stringify(localValue);
  };
  for (const key of Object.keys(remote.profile) as (keyof Profile)[])
    if (remoteWins(`profile:${key}`, local.profile[key], remote.profile[key]))
      (merged.profile as any)[key] = remote.profile[key];
  for (const key of ["hasOnboarded", "weekSchedule", "baselineXp"] as const)
    if (remoteWins(key, local[key], remote[key]))
      (merged as any)[key] = remote[key];
  for (const group of [
    "routines",
    "workoutsHistory",
    "bodyweightLogs",
  ] as const) {
    const id = (item: any) =>
      group === "bodyweightLogs" ? item.date : item.id;
    const a = new Map(local[group].map((item) => [id(item), item]));
    const b = new Map(remote[group].map((item) => [id(item), item]));
    const keys = new Set([...a.keys(), ...b.keys()]);
    (merged as any)[group] = [...keys].flatMap((key) => {
      const clockKey = `${group}:${key}`;
      const chosen = remoteWins(clockKey, a.get(key), b.get(key))
        ? b.get(key)
        : a.has(key) || clockKey in local.clocks
          ? a.get(key)
          : b.get(key);
      return chosen ? [chosen] : [];
    });
  }
  for (const key of new Set([
    ...Object.keys(local.clocks),
    ...Object.keys(remote.clocks),
  ]))
    merged.clocks[key] = Math.max(
      local.clocks[key] ?? 0,
      remote.clocks[key] ?? 0,
    );
  merged.workoutsHistory.sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  merged.bodyweightLogs.sort((a, b) => a.date.localeCompare(b.date));
  const routineIds = new Set(merged.routines.map((r) => r.id));
  merged.weekSchedule = Object.fromEntries(
    Object.entries(merged.weekSchedule).map(([day, id]) => [
      day,
      id && routineIds.has(id) ? id : null,
    ]),
  );
  return withDerivedStats(merged);
}
