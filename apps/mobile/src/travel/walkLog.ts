import { haversineM, type GpsFix, type LatLng } from '@vlc/travel';

export interface WalkPoint extends LatLng {
  /** Fix time, epoch ms. */
  t: number;
}

export interface WalkSummary {
  polyline: WalkPoint[];
  distanceM: number;
  durationMs: number;
  startedAt: number;
  endedAt: number;
}

const MAX_ACCURACY_M = 50;
/** Fixes closer than this to the last kept point are GPS jitter while standing still. */
const MIN_MOVE_M = 4;
/** Faster than this between two fixes is a GPS jump, not walking (about 30 km/h). */
const MAX_SPEED_MPS = 8.5;

/** Accumulates the walk log (thinned polyline, distance) from the session's location fixes. */
export class WalkLog {
  private points: WalkPoint[] = [];
  private distance = 0;
  private startedAt: number;
  private lastFixAt: number;

  constructor(startedAt: number) {
    this.startedAt = startedAt;
    this.lastFixAt = startedAt;
  }

  add(fix: GpsFix): boolean {
    if (fix.accuracyM > MAX_ACCURACY_M) return false;
    const p: WalkPoint = { lat: fix.lat, lng: fix.lng, t: fix.timestampMs };
    const last = this.points[this.points.length - 1];
    if (!last) {
      this.points.push(p);
      this.lastFixAt = p.t;
      return true;
    }
    const d = haversineM(last, p);
    const dt = Math.max(1, (p.t - last.t) / 1000);
    if (d < MIN_MOVE_M || d / dt > MAX_SPEED_MPS) return false;
    this.points.push(p);
    this.distance += d;
    this.lastFixAt = p.t;
    return true;
  }

  get pointCount(): number {
    return this.points.length;
  }

  get distanceM(): number {
    return this.distance;
  }

  last(): WalkPoint | null {
    return this.points[this.points.length - 1] ?? null;
  }

  summary(endedAt: number): WalkSummary {
    return {
      polyline: this.points.slice(),
      distanceM: Math.round(this.distance),
      durationMs: Math.max(0, endedAt - this.startedAt),
      startedAt: this.startedAt,
      endedAt,
    };
  }
}

/** Deterministic end-of-walk summary for the Journal (source: generated_summary). No LLM involved. */
export function walkSummaryText(p: { lang: 'ko' | 'en'; distanceM: number; durationMs: number; destination?: string | null; notes: number; points: number }): string {
  const minutes = Math.max(1, Math.round(p.durationMs / 60_000));
  const km = p.distanceM >= 1000 ? `${(p.distanceM / 1000).toFixed(1)} km` : `${Math.round(p.distanceM)} m`;
  if (p.lang === 'ko') {
    const parts = [p.points > 1 ? `산책 ${km}, ${minutes}분.` : `${minutes}분 동안 걸었어요. 이동 거리는 기록되지 않았어요.`];
    if (p.destination) parts.push(`목적지: ${p.destination}.`);
    if (p.notes > 0) parts.push(`메모 ${p.notes}개.`);
    return parts.join(' ');
  }
  const parts = [p.points > 1 ? `Walk: ${km} in ${minutes} min.` : `Walked for ${minutes} min. No distance was recorded.`];
  if (p.destination) parts.push(`Destination: ${p.destination}.`);
  if (p.notes > 0) parts.push(`${p.notes} ${p.notes === 1 ? 'note' : 'notes'}.`);
  return parts.join(' ');
}
