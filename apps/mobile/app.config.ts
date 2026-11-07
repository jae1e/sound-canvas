import type { ConfigContext, ExpoConfig } from 'expo/config';

export function resolveVersionCode(value: string | undefined, nowMs: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : Math.floor((nowMs - Date.UTC(2026, 0, 1)) / 60_000);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: { ...config.android, versionCode: resolveVersionCode(process.env.FVL_VERSION_CODE, Date.now()) },
  extra: { ...config.extra, gitSha: process.env.FVL_GIT_SHA ?? 'dev' },
});
