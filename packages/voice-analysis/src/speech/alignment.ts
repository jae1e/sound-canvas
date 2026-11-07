/** A script/transcript token mismatch with the source index (script or transcript). */
export interface ScriptDifference {
  index: number;
  word: string;
  scriptIndex?: number;
  transcriptIndex?: number;
}
/** Alignment result categorizes skipped script words, added transcript words and substitutions. */
export interface ScriptAlignment {
  skipped: ScriptDifference[];
  added: ScriptDifference[];
  substituted: { scriptIndex: number; transcriptIndex: number; expected: string; actual: string }[];
}
function tokens(s: string): string[] {
  return s.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}
function norm(s: string): string {
  return s.toLocaleLowerCase().replace(/[’]/g, "'");
}
/** Align script to transcript with global edit-distance dynamic programming; indices are token indices. */
export function alignScript(script: string, transcript: string): ScriptAlignment {
  const a = tokens(script),
    b = tokens(transcript),
    d = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0)),
    op = Array.from({ length: a.length + 1 }, () => Array<'=' | 's' | 'd' | 'i'>(b.length + 1).fill('='));
  for (let i = 1; i <= a.length; i++) {
    d[i]![0] = i;
    op[i]![0] = 'd';
  }
  for (let j = 1; j <= b.length; j++) {
    d[0]![j] = j;
    op[0]![j] = 'i';
  }
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const same = norm(a[i - 1]!) === norm(b[j - 1]!),
        vals = [d[i - 1]![j - 1]! + (same ? 0 : 1), d[i - 1]![j]! + 1, d[i]![j - 1]! + 1],
        m = Math.min(...vals);
      d[i]![j] = m;
      op[i]![j] = m === vals[0] ? (same ? '=' : 's') : m === vals[1] ? 'd' : 'i';
    }
  const skipped: ScriptDifference[] = [],
    added: ScriptDifference[] = [],
    substituted: ScriptAlignment['substituted'] = [];
  let i = a.length,
    j = b.length;
  while (i || j) {
    const o = op[i]![j]!;
    if (o === '=') {
      i--;
      j--;
    } else if (o === 's') {
      substituted.push({
        scriptIndex: i - 1,
        transcriptIndex: j - 1,
        expected: a[i - 1]!,
        actual: b[j - 1]!,
      });
      i--;
      j--;
    } else if (o === 'd') {
      skipped.push({ index: i - 1, word: a[i - 1]!, scriptIndex: i - 1 });
      i--;
    } else {
      added.push({ index: j - 1, word: b[j - 1]!, transcriptIndex: j - 1 });
      j--;
    }
  }
  return { skipped: skipped.reverse(), added: added.reverse(), substituted: substituted.reverse() };
}
