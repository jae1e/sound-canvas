/** api-v0 location payload (integers only). */
export interface LocationPayload {
  lat_e7: number;
  lon_e7: number;
  accuracy_cm: number;
  altitude_cm?: number;
  provider: string;
  fix_wall_ms: number;
  fix_elapsed_us: number;
}

/** A fix as reported by expo-location (coords in degrees and metres, timestamp in epoch ms). */
export interface RawFix {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  timestamp: number;
  provider?: string;
}

export function fixToLocationPayload(
  fix: RawFix,
  nowWallMs: number,
  nowElapsedUs: number,
): LocationPayload | undefined {
  const { latitude, longitude } = fix;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  const ageMs = Math.max(0, Math.round(nowWallMs - fix.timestamp));
  const out: LocationPayload = {
    lat_e7: Math.round(latitude * 1e7),
    lon_e7: Math.round(longitude * 1e7),
    // 0 means "unknown accuracy"; the contract requires an integer.
    accuracy_cm: fix.accuracy != null && Number.isFinite(fix.accuracy) ? Math.round(fix.accuracy * 100) : 0,
    provider: fix.provider ?? 'fused',
    fix_wall_ms: Math.round(fix.timestamp),
    fix_elapsed_us: Math.round(nowElapsedUs - ageMs * 1000),
  };
  if (fix.altitude != null && Number.isFinite(fix.altitude)) out.altitude_cm = Math.round(fix.altitude * 100);
  return out;
}

export function formatPlace(loc: { lat_e7: number; lon_e7: number; accuracy_cm: number } | null | undefined): string | null {
  if (!loc) return null;
  const lat = (loc.lat_e7 / 1e7).toFixed(4);
  const lon = (loc.lon_e7 / 1e7).toFixed(4);
  const acc = loc.accuracy_cm > 0 ? ` ±${Math.round(loc.accuracy_cm / 100)} m` : '';
  return `${lat}, ${lon}${acc}`;
}
