#!/usr/bin/env node

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;

if (!url || !anonKey || !revenueCatKey) {
  console.error(
    "Release check needs EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_REVENUECAT_APPLE_KEY.",
  );
  process.exit(1);
}

async function request(label, endpoint, headers = {}) {
  const response = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response;
}

const supabaseHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};
const failures = [];

try {
  await request(
    "Supabase user_app_state",
    `${url}/rest/v1/user_app_state?select=user_id&limit=0`,
    supabaseHeaders,
  );
  console.log("Supabase user_app_state: available");
} catch (error) {
  failures.push(`${error.message}; apply supabase/migrations/20261013_user_app_state.sql`);
}

try {
  const response = await fetch(`${url}/functions/v1/delete-account`, {
    headers: supabaseHeaders,
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404 || response.status >= 500) {
    throw new Error(`delete-account: HTTP ${response.status}`);
  }
  console.log(`delete-account: deployed (GET returned ${response.status})`);
} catch (error) {
  failures.push(`${error.message}; deploy supabase/functions/delete-account`);
}

try {
  const response = await request(
    "RevenueCat offerings",
    "https://api.revenuecat.com/v1/subscribers/%24RCAnonymousID%3Atrainxp-release-check/offerings",
    { Authorization: `Bearer ${revenueCatKey}`, "X-Platform": "ios" },
  );
  const data = await response.json();
  const offering = data.offerings?.find(
    (item) => item.identifier === "trainxp_pro",
  );
  const packages = new Set(offering?.packages?.map((item) => item.identifier));
  for (const required of ["$rc_annual", "$rc_monthly", "$rc_weekly"]) {
    if (!packages.has(required)) {
      throw new Error(`trainxp_pro is missing ${required} for the configured iOS key`);
    }
  }
  console.log("RevenueCat trainxp_pro: annual, monthly, weekly available");
} catch (error) {
  failures.push(error.message);
}

if (failures.length) {
  for (const failure of failures) console.error(`Release check failed: ${failure}`);
  process.exitCode = 1;
}
