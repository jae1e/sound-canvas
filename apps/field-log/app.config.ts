import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. Release builds pass FVL_VERSION_CODE and FVL_GIT_SHA (scripts/release-android.sh).
// The default (minutes since 2026-01-01T00:00Z) duplicates resolveVersionCode in src/core/update.ts, which
// is unit-tested; expo's config loader cannot import local TypeScript files.
function versionCode(): number {
  const n = Number(process.env.FVL_VERSION_CODE);
  if (Number.isInteger(n) && n > 0) return n;
  return Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: { ...config.android, versionCode: versionCode() },
  extra: { ...config.extra, gitSha: process.env.FVL_GIT_SHA ?? 'dev' },
});
