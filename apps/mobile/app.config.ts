import type { ConfigContext, ExpoConfig } from 'expo/config';

export function resolveVersionCode(value: string | undefined, nowMs: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : Math.floor((nowMs - Date.UTC(2026, 0, 1)) / 60_000);
}

/**
 * VC_EMULATOR=1 adds x86_64 native code for local emulator screenshots (React Native's loader does not use
 * the emulator's ARM translation). Release builds for the phone stay arm64-only.
 */
function withEmulatorArchs(plugins: ExpoConfig['plugins']): ExpoConfig['plugins'] {
  if (process.env.VC_EMULATOR !== '1' || !plugins) return plugins;
  return plugins.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin;
    const options = (plugin[1] ?? {}) as { android?: Record<string, unknown> };
    return [plugin[0], { ...options, android: { ...options.android, buildArchs: ['arm64-v8a', 'x86_64'] } }];
  });
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: withEmulatorArchs(config.plugins),
  android: { ...config.android, versionCode: resolveVersionCode(process.env.FVL_VERSION_CODE, Date.now()) },
  extra: { ...config.extra, gitSha: process.env.FVL_GIT_SHA ?? 'dev' },
});
