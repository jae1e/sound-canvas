import type { GpsFix } from '@vlc/travel';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export type GpsSource = 'native' | 'expo' | 'none';
export type Permission = 'unknown' | 'granted' | 'denied';

type NativeSub = { remove: () => void };
type NativeModule = { addListener: (name: 'location', cb: (e: { latitude: number; longitude: number; accuracy: number; fixEpochMs: number }) => void) => NativeSub };

/** The native session service is Android-only and only emits while a session runs. */
function loadNative(): NativeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../modules/vlc-session-service').default as NativeModule | undefined;
    return mod && typeof mod.addListener === 'function' ? mod : null;
  } catch {
    return null;
  }
}

const NATIVE_FRESH_MS = 4000;

/**
 * Current GPS fix for the Travel Guide screen.
 *
 * Prefers the `location` events of the native session service (about 1 Hz, keeps running with the
 * screen locked) when a session is active. Otherwise it falls back to foreground-only expo-location,
 * which stops with the screen. When the shared session is integrated, the session owns tracking.
 */
export function useGpsFix(enabled = true): { fix: GpsFix | null; source: GpsSource; permission: Permission } {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [source, setSource] = useState<GpsSource>('none');
  const [permission, setPermission] = useState<Permission>('unknown');
  const lastNativeMs = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let expoSub: Location.LocationSubscription | null = null;
    let nativeSub: NativeSub | null = null;

    nativeSub =
      loadNative()?.addListener('location', (e) => {
        lastNativeMs.current = Date.now();
        setFix({ lat: e.latitude, lng: e.longitude, accuracyM: e.accuracy, timestampMs: e.fixEpochMs });
        setSource('native');
      }) ?? null;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermission(perm.granted ? 'granted' : 'denied');
      if (!perm.granted) return;
      expoSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          if (Date.now() - lastNativeMs.current < NATIVE_FRESH_MS) return; // native fix is fresher
          setFix({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracyM: loc.coords.accuracy ?? 999, timestampMs: loc.timestamp });
          setSource('expo');
        },
      );
      if (cancelled) expoSub.remove();
    })().catch(() => setPermission('denied'));

    return () => {
      cancelled = true;
      nativeSub?.remove();
      expoSub?.remove();
    };
  }, [enabled]);

  return { fix, source, permission };
}
