import * as Location from 'expo-location';
import { fixToLocationPayload, type LocationPayload } from '../core';
import FlNative from '../native';
import { useSettings } from '../state/settings';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(undefined), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(undefined);
      },
    );
  });
}

export async function ensureLocationPermission(): Promise<boolean> {
  if (!useSettings.getState().locationEnabled) return false;
  const cur = await Location.getForegroundPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

function toPayload(obj: Location.LocationObject | null | undefined): LocationPayload | undefined {
  if (!obj) return undefined;
  const now = FlNative.clock();
  return fixToLocationPayload(
    {
      latitude: obj.coords.latitude,
      longitude: obj.coords.longitude,
      accuracy: obj.coords.accuracy,
      altitude: obj.coords.altitude,
      timestamp: obj.timestamp,
    },
    now.wallMs,
    now.elapsedUs,
  );
}

/** Cached fix, never waits for GPS. Resolves undefined if location is off, denied or slow. */
export async function fastLocation(timeoutMs = 1000): Promise<LocationPayload | undefined> {
  if (!(await withTimeout(ensureLocationPermission(), timeoutMs))) return undefined;
  return toPayload(await withTimeout(Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }), timeoutMs));
}

/** A fresh fix with a hard timeout (used when stopping a recording). */
export async function freshLocation(timeoutMs = 3000): Promise<LocationPayload | undefined> {
  if (!useSettings.getState().locationEnabled) return undefined;
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return undefined;
  return toPayload(
    await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs),
  );
}
