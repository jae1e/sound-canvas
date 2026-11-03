import type { TargetNote, TargetSpec } from './types';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const A4_HZ = 440;

export function hzToMidi(hz: number, a4 = A4_HZ): number {
  return 69 + 12 * Math.log2(hz / a4);
}
export function midiToHz(midi: number, a4 = A4_HZ): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}
/** Signed distance in cents from `ref` to `hz`. */
export function centsBetween(hz: number, ref: number): number {
  return 1200 * Math.log2(hz / ref);
}
export function noteName(midi: number): string {
  const m = Math.round(midi);
  return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}
export interface NearestNote {
  midi: number;
  name: string;
  /** Deviation of the input from the nearest equal-tempered note, in -50..+50 cents. */
  cents: number;
}
export function nearestNote(hz: number, a4 = A4_HZ): NearestNote {
  const exact = hzToMidi(hz, a4);
  const midi = Math.round(exact);
  return { midi, name: noteName(midi), cents: (exact - midi) * 100 };
}

/** Parses "A3", "c#4", "Db4", "A♭3". Returns the MIDI number or null. */
export function parseNote(text: string): number | null {
  const m = /^\s*([A-Ga-g])\s*([#♯b♭]?)\s*(-?\d)\s*$/.exec(text);
  if (!m) return null;
  const letter = m[1]!.toUpperCase();
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + LETTER_SEMITONE[letter]! + acc;
}

/**
 * Parses a target: "A3" (held), or a sequence "A3 C4 E4" / "A3:2, C4:1.5" (note:seconds).
 * Notes without a duration in a sequence get `defaultDurationS`. Returns null on a syntax error.
 */
export function parseTarget(text: string, defaultDurationS = 1): TargetSpec | null {
  const parts = text.split(/[\s,;>]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const notes: TargetNote[] = [];
  for (const p of parts) {
    const [n, d] = p.split(':');
    const midi = parseNote(n ?? '');
    if (midi === null) return null;
    if (d !== undefined) {
      const dur = Number(d);
      if (!(dur > 0)) return null;
      notes.push({ midi, durationS: dur });
    } else {
      notes.push(parts.length === 1 ? { midi } : { midi, durationS: defaultDurationS });
    }
  }
  return { notes };
}
