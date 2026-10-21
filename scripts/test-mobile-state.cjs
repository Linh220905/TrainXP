const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const mobile = path.join(root, "artifacts/train-xp");
const ts = require(path.join(root, "node_modules/typescript"));
const nativeRequire = createRequire(path.join(mobile, "package.json"));

function loader(stubs = {}) {
  const cache = new Map();
  const load = (file) => {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json"))
      return JSON.parse(fs.readFileSync(file, "utf8"));
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
      },
    }).outputText;
    const requireLocal = (id) => {
      if (id in stubs) return stubs[id];
      if (!id.startsWith(".") && !id.startsWith("@/")) return nativeRequire(id);
      const target = id.startsWith("@/")
        ? path.join(mobile, id.slice(2))
        : path.resolve(path.dirname(file), id);
      if (path.extname(target)) return load(target);
      for (const ext of [".ts", ".tsx"])
        if (fs.existsSync(target + ext)) return load(target + ext);
      throw new Error(`Cannot resolve ${id}`);
    };
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: requireLocal,
        Date,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        __DEV__: false,
        process,
      },
      { filename: file },
    );
    return module.exports;
  };
  return (id) => load(path.join(mobile, id));
}
const load = loader();
const model = load("lib/stateModel.ts");
const input = load("lib/input.ts");
const plan = load("lib/planGenerator.ts");
const units = load("lib/units.ts");
const history = load("lib/onerm.ts");
const dataset = nativeRequire(
  path.join(root, "data/exercises_supabase_seed.json"),
);
const profile = {
  name: "Tester",
  unit: "Metric",
  weight: 68,
  height: 170,
  thinkAboutFitness: "Often",
  achieveMotivations: [],
  goal: "Build Muscle",
  sensitiveJoints: [],
  experience: "No experience",
  hasRoutine: false,
  equipment: [],
  lastMusclesWorked: [],
  workoutDuration: "30 minutes",
  daysPerWeek: 3,
  targetMuscles: [],
  bodyType: "Balanced",
  gender: "Male",
  birthYear: 2000,
  birthMonth: "Jan",
  birthDay: 1,
  prSquat: 0,
  benchPressPR: 0,
  deadliftPR: 0,
  goalWeight: 68,
  goalWeeks: 4,
  streakCommitment: 7,
  notificationsEnabled: false,
  isPro: false,
};
const initial = {
  schemaVersion: 3,
  profile,
  hasOnboarded: true,
  routines: [],
  weekSchedule: {},
  workoutsHistory: [],
  bodyweightLogs: [],
  clocks: {},
  baselineXp: 500,
  stats: {},
  lastWorkout: null,
};
const session = (id, date = new Date().toISOString(), weight = 40) => ({
  id,
  date,
  duration: "10:00",
  volume: weight * 8,
  xp: 180,
  entries: [
    {
      id: "barbell_bench_press",
      sets: [{ weight, reps: 8, targetReps: 8, done: true }],
    },
  ],
});

test("XP stores progress in the current level, including several level-ups", () => {
  assert.equal(model.levelFromXp(2400).xp, 1400);
  assert.equal(model.levelFromXp(6200).level, 4);
  assert.equal(model.levelFromXp(6200).xp, 200);
});
test("a deletion tombstone survives a stale remote snapshot", () => {
  const saved = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("w1")],
  });
  const deleted = model.stampChanges(saved, { ...saved, workoutsHistory: [] });
  const merged = model.mergeSnapshots(deleted, saved);
  assert.equal(merged.workoutsHistory.length, 0);
  assert.equal(merged.stats.workouts, 0);
  assert.equal(merged.stats.totalVolume, 0);
  assert.equal(merged.stats.xp, 500);
});
test("independent offline edits on two devices are merged", () => {
  const first = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("a")],
  });
  const second = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("b")],
  });
  assert.equal(model.mergeSnapshots(first, second).workoutsHistory.length, 2);
});
test("corrupt nested collections are rejected without crashing analytics", () => {
  const safe = model.normalizeSnapshot(
    {
      profile: { weight: null },
      workoutsHistory: [{ entries: null }],
      routines: "bad",
    },
    initial,
  );
  assert.equal(safe.workoutsHistory.length, 0);
  assert.equal(safe.profile.weight, 68);
});
test("streak expires after a gap and does not increase for two sessions on one day", () => {
  const today = new Date(2026, 9, 14, 12);
  assert.equal(
    model.currentStreak([session("a", "2026-10-10T12:00:00")], today),
    0,
  );
  assert.equal(
    model.currentStreak(
      [
        session("a", "2026-10-14T12:00:00"),
        session("b", "2026-10-14T13:00:00"),
        session("c", "2026-10-13T12:00:00"),
      ],
      today,
    ),
    2,
  );
});
test("decimal input preserves commas and rejects malformed values", () => {
  assert.equal(input.parseDecimal("62,5"), 62.5);
  for (const value of ["1.2.3", "-5", "", "Infinity"])
    assert.equal(input.parseDecimal(value), null);
  assert.ok(
    Math.abs(units.displayWeightToKg(225, "Imperial") - 102.05828325) < 1e-6,
  );
});
test("age uses the actual birthday and rejects impossible dates", () => {
  assert.equal(input.ageOn(2013, "Dec", 31, new Date(2026, 9, 14)), 12);
  assert.equal(input.ageOn(2000, "Feb", 30), null);
});
test("empty equipment only yields no-equipment exercises and respects the set budget", () => {
  const generated = plan.generatePersonalizedPlan({
    ...profile,
    workoutDuration: "15 minutes",
    targetMuscles: ["Full body"],
  });
  for (const routine of generated.routines) {
    assert.ok(routine.exercises.reduce((n, ex) => n + ex.sets, 0) <= 8);
    for (const exercise of routine.exercises) {
      const definition = dataset.find((ex) => ex.id === exercise.id);
      assert.ok(
        ["bodyweight", "bodyonly", "none"].includes(
          definition.equipment.toLowerCase().replace(/[^a-z]/g, ""),
        ),
      );
      assert.equal(exercise.targetWeight, 0);
    }
  }
  assert.equal(input.matchesMuscleGroup(["abs"], "Core"), true);
  assert.equal(input.matchesMuscleGroup(["quads"], "Legs"), true);
});
test("1RM analytics consider repeated entries rather than only the first", () => {
  const workout = session("w");
  workout.entries.push({
    id: "barbell_bench_press",
    sets: [{ weight: 80, reps: 1, done: true }],
  });
  assert.equal(
    history.getExerciseBest1RM([workout], "barbell_bench_press").est1RM,
    80,
  );
});
test("Live Activity preserves rest deadline on foreground and ends the captured ID", async () => {
  const updates = [],
    ended = [];
  const native = {
    ensureActiveActivity: async () => "id",
    hasActiveActivity: async () => true,
    updateActivity: async (_, payload) => updates.push(payload),
    endActivity: async (id) => ended.push(id),
  };
  const loadLive = loader({
    "react-native": {
      Platform: { OS: "ios" },
      NativeModules: { TrainXPLiveActivity: native },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
  });
  const { liveActivity } = loadLive("lib/liveActivity.ts");
  const state = {
    workoutName: "Test",
    exerciseName: "Bench",
    currentSet: 1,
    totalSets: 3,
    weightKg: 40,
    reps: 8,
    isResting: false,
    totalDurationSeconds: 0,
    totalVolumeKg: 0,
  };
  await liveActivity.startActivity(state);
  await liveActivity.startRestTimer(120, state);
  const end = updates.at(-1).restEndTime;
  await liveActivity.ensureActiveState();
  assert.equal(updates.at(-1).restEndTime, end);
  await liveActivity.endActivity();
  assert.deepEqual(ended, ["id"]);
  liveActivity.dispose();
});

function contextHarness(options = {}) {
  const slots = [],
    effects = [],
    storage = new Map(options.storage ?? []);
  let index = 0;
  const React = {
    createContext: () => ({ Provider: "Provider" }),
    createElement: (type, props) => ({ type, props }),
    useState: (initial) => {
      const slot = index++;
      if (!(slot in slots))
        slots[slot] = typeof initial === "function" ? initial() : initial;
      return [
        slots[slot],
        (value) => {
          slots[slot] =
            typeof value === "function" ? value(slots[slot]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useMemo: (factory) => {
      index++;
      return factory();
    },
    useEffect: (effect) => {
      const slot = index++;
      if (!(slot in slots)) {
        slots[slot] = true;
        effects.push(effect);
      }
    },
  };
  const auth = {
    getSession: async () => ({ data: { session: options.session ?? null } }),
    signOut: async () => ({ error: null }),
  };
  const stubs = {
    react: React,
    "react-native": { AppState: { addEventListener: () => ({ remove() {} }) } },
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
    "@/lib/supabase": {
      supabase: { auth },
      ensureUserSession: async () => null,
      fetchCloudUserData: options.fetchCloud ?? (async () => null),
      hasPendingCloudMutations: async () => false,
      replayCloudOutbox: async () => {},
      syncAppStateToCloud: async () => {},
      syncCollectionsToCloud: async (before, after, userId) => {
        options.cloudCalls?.push({ kind: "collections", before, after, userId });
      },
      syncProfileToCloud: async (nextProfile, stats, schedule, userId) => {
        options.cloudCalls?.push({ kind: "profile", nextProfile, userId });
      },
      clearCloudOutboxForUser: async () => {},
    },
    "@/lib/purchases": {
      initPurchases: async () => false,
      checkHasProEntitlement: async () => options.entitlement ?? null,
      setupPurchasesListener: () => () => {},
      syncPurchasesUser: async () => {},
      logOutPurchases: async () => {},
    },
    "@/lib/auth": {
      signInWithApple: async () => null,
      signInWithGoogle: async () => options.user ?? null,
      deleteUserAccount: async () => {},
    },
    "@/lib/liveActivity": {
      liveActivity: { attach() {}, dispose() {}, endActivity: async () => {} },
    },
  };
  const loaded = loader(stubs)("context/AppState.tsx");
  const render = () => {
    index = 0;
    return loaded.AppStateProvider({ children: null }).props.value;
  };
  render();
  const cleanup = effects.map((effect) => effect());
  return { render, cleanup, auth, storage };
}
test("finish is idempotent per session and deleting a session rebuilds XP and volume", async () => {
  const app = contextHarness();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const state = app.render();
  assert.equal(state.hydrated, true);
  const metrics = {
    sessionId: "test-session",
    volume: 320,
    duration: "01:00",
    entries: session("unused").entries,
  };
  state.finishWorkout(metrics);
  state.finishWorkout(metrics);
  assert.equal(app.render().workoutsHistory.length, 1);
  assert.equal(app.render().stats.xp, 180);
  app.render().deleteWorkout("test-session");
  assert.equal(app.render().stats.xp, 0);
  assert.equal(app.render().stats.totalVolume, 0);
  app.cleanup.forEach((clean) => clean?.());
});

test("equal-clock conflicting edits converge in either merge order", () => {
  const first = model.stampChanges(
    initial,
    { ...initial, profile: { ...profile, name: "Alpha" } },
    100,
  );
  const second = model.stampChanges(
    initial,
    { ...initial, profile: { ...profile, name: "Beta" } },
    100,
  );
  assert.equal(
    model.mergeSnapshots(first, second).profile.name,
    model.mergeSnapshots(second, first).profile.name,
  );
});

test("new mutations retain newer clocks despite a backwards device clock", () => {
  const previous = { ...initial, clocks: { "profile:name": 10000 } };
  const next = model.stampChanges(
    previous,
    { ...previous, profile: { ...profile, name: "Changed" } },
    1,
  );
  assert.ok(next.clocks["profile:name"] > 10000);
  assert.equal(model.mergeSnapshots(next, previous).profile.name, "Changed");
});

test("redoing a novice survey preserves history, logs, plan and Pro", async () => {
  const app = contextHarness();
  await new Promise((resolve) => setTimeout(resolve, 20));
  app.render().completeOnboarding(profile);
  app
    .render()
    .finishWorkout({ sessionId: "redo", entries: session("unused").entries });
  app.render().setProStatus(true);
  const previous = app.render();
  await previous.resetOnboarding();
  app
    .render()
    .completeOnboarding({ ...profile, name: "Renamed", isPro: false });
  const next = app.render();
  assert.equal(next.profile.isPro, true);
  assert.equal(next.workoutsHistory.length, 1);
  assert.equal(next.stats.xp, previous.stats.xp);
  assert.equal(
    JSON.stringify(next.routines),
    JSON.stringify(previous.routines),
  );
  assert.equal(
    JSON.stringify(next.bodyweightLogs),
    JSON.stringify(previous.bodyweightLogs),
  );
  app.cleanup.forEach((clean) => clean?.());
});

test("invalid completed sets cannot poison XP, volume or history", async () => {
  const app = contextHarness();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.throws(() =>
    app
      .render()
      .finishWorkout({
        sessionId: "bad",
        entries: [
          { id: "bench", sets: [{ done: true, weight: Infinity, reps: 8 }] },
        ],
      }),
  );
  assert.equal(app.render().workoutsHistory.length, 0);
  app.cleanup.forEach((clean) => clean?.());
});

test("logout clears the prior account even when anonymous sign-in is unavailable", async () => {
  const app = contextHarness({
    session: {
      user: {
        id: "account",
        email: "test@example.invalid",
        app_metadata: { provider: "google" },
      },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(app.render().isAuthenticated, true);
  app
    .render()
    .finishWorkout({
      sessionId: "private",
      entries: session("unused").entries,
    });
  await app.render().logoutAuth();
  assert.equal(app.render().profile.authUserId, undefined);
  assert.equal(app.render().workoutsHistory.length, 0);
  assert.equal(app.render().isAuthenticated, false);
  assert.equal(app.render().hasOnboarded, false);
  app.cleanup.forEach((clean) => clean?.());
});

test("unauthenticated launch defaults to not onboarded and not authenticated", async () => {
  const app = contextHarness();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const state = app.render();
  assert.equal(state.hydrated, true);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.hasOnboarded, false);
  assert.equal(state.profile.authUserId, undefined);
  app.cleanup.forEach((clean) => clean?.());
});

test("a persisted session opens saved progress after app restart", async () => {
  const saved = {
    ...initial,
    profile: { ...profile, name: "Returning athlete" },
  };
  const app = contextHarness({
    storage: [["@train-xp/state:account", JSON.stringify(saved)]],
    session: {
      user: {
        id: "account",
        email: "test@example.invalid",
        app_metadata: { provider: "google" },
      },
    },
    fetchCloud: async () => ({}),
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(app.render().hydrated, true);
  assert.equal(app.render().hasOnboarded, true);
  assert.equal(app.render().profile.name, "Returning athlete");
  app.cleanup.forEach((clean) => clean?.());
});

test("an authenticated edit syncs profile and changed collections", async () => {
  const cloudCalls = [];
  const app = contextHarness({
    cloudCalls,
    storage: [["@train-xp/state:account", JSON.stringify(initial)]],
    session: {
      user: {
        id: "account",
        email: "test@example.invalid",
        app_metadata: { provider: "google" },
      },
    },
    fetchCloud: async () => ({}),
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const routine = app.render().addRoutine({
    name: "Push",
    emoji: "zap",
    progression: "linear",
    exercises: [{ id: "barbell_bench_press", sets: 3, reps: 8 }],
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(cloudCalls.some((call) => call.kind === "profile"));
  assert.ok(
    cloudCalls.some(
      (call) =>
        call.kind === "collections" &&
        call.userId === "account" &&
        call.after.routines.some((item) => item.id === routine.id),
    ),
  );
  app.cleanup.forEach((clean) => clean?.());
});

test("late Live Activity creation is cleaned up after the session ends", async () => {
  let resolveStart;
  const ended = [];
  const native = {
    startActivity: () =>
      new Promise((resolve) => {
        resolveStart = resolve;
      }),
    endActivity: async (id) => ended.push(id),
  };
  const { liveActivity } = loader({
    "react-native": {
      Platform: { OS: "ios" },
      NativeModules: { TrainXPLiveActivity: native },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
  })("lib/liveActivity.ts");
  const starting = liveActivity.startActivity({
    workoutName: "Test",
    exerciseName: "Bench",
    currentSet: 1,
    totalSets: 3,
    weightKg: 40,
    reps: 8,
    isResting: false,
    totalDurationSeconds: 0,
    totalVolumeKg: 0,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await liveActivity.endActivity();
  resolveStart("late-id");
  await starting;
  assert.deepEqual(ended, ["late-id"]);
  liveActivity.dispose();
});

function cloudHarness() {
  const storage = new Map();
  let row = null,
    fail = false,
    conflict = null;
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "account" } } },
      }),
    },
    from: () => {
      let action = "read",
        payload;
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return query;
        },
        update(value) {
          action = "update";
          payload = value;
          return query;
        },
        insert(value) {
          action = "insert";
          payload = value;
          return query;
        },
        then(resolve, reject) {
          const result = fail
            ? { data: null, error: new Error("offline") }
            : action === "read"
              ? { data: row, error: null }
              : action === "update" && conflict
                ? ((row = {
                    state: conflict,
                    updated_at: new Date().toISOString(),
                  }),
                  (conflict = null),
                  { data: [], error: null })
                : ((row = payload),
                  { data: [{ user_id: "account" }], error: null });
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const cloud = loader({
    "@supabase/supabase-js": { createClient: () => client },
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  })("lib/supabase.ts");
  return {
    cloud,
    storage,
    get row() {
      return row;
    },
    set offline(value) {
      fail = value;
    },
    set conflict(value) {
      conflict = value;
    },
  };
}

test("cloud outbox retains failed saves and migrates legacy queued snapshots", async () => {
  const fixture = cloudHarness();
  fixture.offline = true;
  fixture.storage.set(
    "@train-xp/cloud-outbox",
    JSON.stringify([
      {
        id: "legacy",
        userId: "account",
        kind: "app-state-upsert",
        payload: {
          state: {
            ...initial,
            clocks: undefined,
            workoutsHistory: [session("legacy-workout")],
          },
          updated_at: "2025-01-01T00:00:00Z",
        },
      },
    ]),
  );
  const newer = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("new-workout")],
  });
  await assert.rejects(fixture.cloud.syncAppStateToCloud(newer, "account"));
  assert.equal(await fixture.cloud.hasPendingCloudMutations("account"), true);
  fixture.offline = false;
  await fixture.cloud.replayCloudOutbox("account");
  assert.equal(fixture.row.state.workoutsHistory.length, 2);
  assert.equal(await fixture.cloud.hasPendingCloudMutations("account"), false);
});

test("cloud compare-and-swap retries preserve another device's concurrent workout", async () => {
  const fixture = cloudHarness();
  await fixture.cloud.syncAppStateToCloud(initial, "account");
  fixture.conflict = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("other-device")],
  });
  const mine = model.stampChanges(initial, {
    ...initial,
    workoutsHistory: [session("mine")],
  });
  await fixture.cloud.syncAppStateToCloud(mine, "account");
  assert.equal(fixture.row.state.workoutsHistory.length, 2);
  assert.equal(await fixture.cloud.hasPendingCloudMutations("account"), false);
});
