export type CentsColor = 'green' | 'amber' | 'red';
export function centsColor(cents: number): CentsColor {
  return Math.abs(cents) <= 15 ? 'green' : Math.abs(cents) <= 35 ? 'amber' : 'red';
}
export function stabilityLabel(cents: number | null): 'unknown' | 'steady' | 'developing' | 'unstable' {
  return cents === null ? 'unknown' : cents <= 25 ? 'steady' : cents <= 50 ? 'developing' : 'unstable';
}
export function noteName(midi: number): string {
  const n = Math.round(midi);
  return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}
export function rangeLabel(low: number | null, high: number | null): string | null {
  return low === null || high === null ? null : `${noteName(low)}–${noteName(high)}`;
}
export function nextTip(
  stability: number | null,
  beatOffset: number | null,
): 'sound' | 'steady' | 'beat' | 'continue' {
  if (stability === null) return 'sound';
  if (stability > 50) return 'steady';
  if (beatOffset !== null && Math.abs(beatOffset) > 80) return 'beat';
  return 'continue';
}
export function centerPitchRange(current: number, samples: readonly number[], smoothing = 0.12): number {
  if (!samples.length) return current;
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  return current + (middle - current) * Math.max(0, Math.min(1, smoothing));
}
export function calibrationMedian(offsets: readonly number[]): number | null {
  const values = offsets.filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}
export function groupByDay<T>(items: readonly T[], time: (item: T) => number): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const d = new Date(time(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}
