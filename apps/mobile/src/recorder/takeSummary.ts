import { rangeLabel } from './derive';

export function takeSummary(createdAt: number, analysisJson: string | null, beatJson: string | null): string {
  const parts = [new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })];
  try {
    const analysis = JSON.parse(analysisJson ?? '{}');
    const range = rangeLabel(analysis.rangeLowMidi ?? null, analysis.rangeHighMidi ?? null);
    if (range) parts.push(range);
  } catch {
    // Older rows may contain invalid JSON.
  }
  try {
    const beat = JSON.parse(beatJson ?? '{}');
    if (typeof beat.bpm === 'number') parts.push(`${beat.bpm} BPM`);
  } catch {
    // Older rows may contain invalid JSON.
  }
  return parts.join(' · ');
}
