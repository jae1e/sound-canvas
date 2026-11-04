import { squash } from '../parser/common';
import type { Lang } from '../types';
import type { RoutineItem } from './model';
import { hasHangul, norm, NUM_SRC, parseNum } from './numtok';
import type { PreCue } from './plan';

/**
 * Personal correction notes ("오른손 먼저 나가야되는데 자꾸 왼손이 나가요") that become short voice pre-cues
 * ("오른손 먼저!") played just before the movement they belong to. Everything here is deterministic.
 */

export type Side = 'left' | 'right' | 'both';

export interface Correction {
  id: string;
  templateId: string;
  /** Movement the note belongs to, or undefined for an item-level or routine-level note. */
  movementId?: string;
  /** Exercise/hold/poomsae item the note belongs to (set together with `movementId` for movements). */
  itemId?: string;
  /** Official movement number, kept for display after the routine is edited. */
  movementNo?: number;
  /** The full note as the user said or typed it (shown in the editor and saved to the Journal). */
  text: string;
  /** Short spoken cue. */
  cue: string;
  side?: Side;
  part?: string;
  lang: Lang;
  /** Marked fixed: the cue stops playing. */
  fixed: boolean;
  createdAt: number;
  /** Times the cue was played (all sessions). */
  shown: number;
}

export interface CueExtraction {
  cue: string;
  side?: Side;
  part?: string;
}

const KO_SIDE_PART = /(오른|왼|양)\s?(손|발|팔|다리|쪽|무릎|어깨|주먹|팔꿈치|엉덩이)/u;
const KO_SIDE_PART_G = new RegExp(KO_SIDE_PART.source, 'gu');
const KO_PART = /(몸통|얼굴|허리|무릎|어깨|시선|엉덩이|골반|배|손목|발끝|손|발|팔|다리|주먹)/u;
const KO_MODS: Array<[RegExp, string]> = [
  [/높이|높게/u, '높이'],
  [/낮게|낮추/u, '낮게'],
  [/깊이|깊게/u, '깊게'],
  [/끝까지/u, '끝까지'],
  [/천천히/u, '천천히'],
  [/힘\s*(?:을\s*)?빼|힘\s*빼/u, '힘 빼'],
  [/곧게|쭉\s*펴|펴/u, '펴기'],
  [/당기|당겨/u, '당기기'],
];

const EN_SIDE_PART = /\b(right|left|both)\s+(hand|foot|feet|arm|leg|knee|shoulder|fist|elbow|hip|side)\b/u;
const EN_PART = /\b(hand|foot|feet|arm|leg|knee|shoulder|fist|elbow|hip|hips|torso|face|eyes|back|core|chest|wrist|toes)\b/u;
const EN_MODS: Array<[RegExp, string]> = [
  [/\bfirst\b/u, 'first'],
  [/\bhigher\b|\bhigh\b/u, 'higher'],
  [/\blower\b|\blow\b/u, 'lower'],
  [/\bdeeper\b|\bdeep\b/u, 'deeper'],
  [/\ball the way\b/u, 'all the way'],
  [/\bslower\b|\bslowly\b/u, 'slower'],
  [/\brelax\b/u, 'relax'],
  [/\bstraight\b/u, 'straight'],
  [/\btuck\b/u, 'tucked'],
];

function sideOf(word: string): Side | undefined {
  if (/^(오른|right)/u.test(word)) return 'right';
  if (/^(왼|left)/u.test(word)) return 'left';
  if (/^(양|both)/u.test(word)) return 'both';
  return undefined;
}

/**
 * Pulls side and body-part keywords out of a note and builds a short pre-cue.
 * "오른손 먼저 나가야되는데 자꾸 왼손이 나가요" -> "오른손 먼저!"; "right hand should go first but I lead with left" -> "right hand first!".
 */
export function extractCue(body: string, lang: Lang): CueExtraction {
  const text = norm(body);
  if (lang === 'ko') {
    const tokens = [...text.matchAll(KO_SIDE_PART_G)];
    const first = text.indexOf('먼저');
    let token = tokens[0];
    if (first >= 0 && tokens.length > 1) {
      const before = tokens.filter((m) => (m.index ?? 0) + m[0].length <= first && first - ((m.index ?? 0) + m[0].length) <= 3);
      if (before.length > 0) token = before[before.length - 1];
    }
    const part = token ? token[2] : KO_PART.exec(text)?.[1];
    const target = token ? token[0].replace(/\s/g, '') : part;
    const side = token ? sideOf(token[1]!) : undefined;
    if (target) {
      if (first >= 0) return { cue: `${target} 먼저!`, side, part };
      const mod = KO_MODS.find(([re]) => re.test(text));
      return { cue: mod ? `${target} ${mod[1]}!` : `${target}!`, side, part };
    }
    const clause = text.split(/해야|하는데|인데|[,.]/u)[0]!.trim();
    return { cue: `${(clause || text).slice(0, 14).trim()}!` };
  }
  const sp = EN_SIDE_PART.exec(text);
  const part = sp ? sp[2] : EN_PART.exec(text)?.[1];
  const target = sp ? `${sp[1]} ${sp[2]}` : part;
  const side = sp ? sideOf(sp[1]!) : undefined;
  if (target) {
    const mod = EN_MODS.find(([re]) => re.test(text));
    return { cue: mod ? `${target} ${mod[1]}!` : `${target}!`, side, part };
  }
  const words = text.split(/\s+/).filter((w) => !/^(i|keep|always|my|the|to|a|should|but)$/u.test(w));
  return { cue: `${words.slice(0, 3).join(' ')}!` };
}

const PREFIX_KO = /^(?:문제|고칠\s*점|고칠점|교정|주의|자세\s*교정|메모)\s*[:：]?\s*(.+)$/u;
const PREFIX_EN = /^(?:note|problem|issue|correction|to fix|fix)\s*[:：,]?\s+(.+)$/u;

const PLAIN_KO_MARKER = /자꾸|계속|매번|항상|맨날|또\s|해야\s*(?:되|하|돼)는데|해야되는데|해야하는데|꼭\s*.*(?:나가|틀려)|(?:나가|틀려|빼먹|까먹|놓쳐|놓쳤)(?:요|서|는|어)/u;
const PLAIN_EN_MARKER = /\bi (?:keep|always|tend to|forget|usually|often|still)\b|\bshould\b.*\bbut\b|\bkeeps? (?:going|moving|leading|coming)\b|\bmy (?:left|right)\b.*\b(?:goes|keeps|moves|leads|is)\b/u;

export interface NoteDetection {
  /** The text after the prefix (or the whole sentence). */
  body: string;
  /** Said with an explicit prefix ("문제:", "note:") rather than as a plain sentence. */
  explicit: boolean;
}

/** Detects a correction note. Plain sentences need both a problem marker and a side or body-part word. */
export function detectCorrectionNote(text: string, lang?: Lang): NoteDetection | null {
  const raw = text.normalize('NFC').trim();
  const l = lang ?? (hasHangul(raw) ? 'ko' : 'en');
  const t = raw.replace(/\s+/g, ' ');
  const pre = (l === 'ko' ? PREFIX_KO : PREFIX_EN).exec(l === 'ko' ? t : t.toLowerCase());
  if (pre) return { body: pre[1]!.trim(), explicit: true };
  const low = norm(t);
  if (l === 'ko') {
    if (PLAIN_KO_MARKER.test(low) && (KO_SIDE_PART.test(low) || KO_PART.test(low))) return { body: t, explicit: false };
  } else if (PLAIN_EN_MARKER.test(low) && (EN_SIDE_PART.test(low) || EN_PART.test(low))) return { body: t, explicit: false };
  return null;
}

// ------------------------------------------------------------------ attaching a note

export type Target =
  | { kind: 'movement'; itemId: string; movementId: string; no: number }
  | { kind: 'item'; itemId: string }
  | { kind: 'routine' };

export type Attachment = { target: Target; reason: 'named' | 'current' | 'previous' | 'item' | 'routine' } | { target: null; reason: 'ambiguous'; candidates: Target[] };

export interface PracticeContext {
  /** Item being practiced now. */
  itemId?: string;
  /** Poomsae movement being counted now / the one before it. */
  movementId?: string;
  previousMovementId?: string;
  /** A movement just finished (the user speaks right after it): attach to the previous movement. */
  justFinished?: boolean;
}

function movementTargets(items: readonly RoutineItem[]): Array<Target & { kind: 'movement' }> {
  const out: Array<Target & { kind: 'movement' }> = [];
  for (const it of items) if (it.kind === 'poomsae') for (const m of it.movements) out.push({ kind: 'movement', itemId: it.id, movementId: m.id, no: m.no });
  return out;
}

/**
 * Where a note belongs. Order: a named movement ("5번 동작", "movement 5", a technique name), a named item, the current or
 * just-finished movement during practice, the practiced item, otherwise the whole routine. A technique name that matches
 * several movements is ambiguous: the caller asks the LLM stub / the UI picks one.
 */
export function attachCorrection(text: string, items: readonly RoutineItem[], lang: Lang, practice?: PracticeContext): Attachment {
  const t = norm(text);
  const moves = movementTargets(items);
  const poomsaeIds = new Set(items.filter((i) => i.kind === 'poomsae').map((i) => i.id));
  const scope = practice?.itemId && poomsaeIds.has(practice.itemId) ? moves.filter((m) => m.itemId === practice.itemId) : moves;

  const numRe = new RegExp(
    lang === 'ko' ? `(${NUM_SRC})\\s*(?:번째|번)\\s*(?:동작|무브|품새)?` : `(?:movements?|moves?|counts?|steps?|number|no\\.?|#)\\s*(${NUM_SRC})\\b`,
    'u',
  );
  const nm = numRe.exec(t);
  if (nm && scope.length > 0 && (lang !== 'ko' || /동작|무브|번째|번\s/u.test(t))) {
    const n = parseNum(nm[1]!);
    const hit = n === undefined ? undefined : scope.find((m) => m.no === n);
    if (hit) return { target: hit, reason: 'named' };
  }

  // Technique names, only for poomsae movements.
  const named: Array<Target & { kind: 'movement' }> = [];
  for (const it of items) {
    if (it.kind !== 'poomsae') continue;
    for (const m of it.movements) {
      const names = [m.technique[lang], ...(m.technique[lang].includes(',') ? m.technique[lang].split(',').map((s) => s.trim()) : [])];
      if (names.some((n) => n && squash(t).includes(squash(n)))) named.push({ kind: 'movement', itemId: it.id, movementId: m.id, no: m.no });
    }
  }
  const namedScoped = practice?.itemId ? named.filter((m) => m.itemId === practice.itemId) : named;
  const pool = namedScoped.length > 0 ? namedScoped : named;
  if (pool.length === 1) return { target: pool[0]!, reason: 'named' };
  if (pool.length > 1) {
    const cur = practice?.movementId ? pool.find((m) => m.movementId === practice.movementId) : undefined;
    if (cur) return { target: cur, reason: 'named' };
    return { target: null, reason: 'ambiguous', candidates: pool };
  }

  // Exercise or hold named by its own name.
  const byName = items.find((i) => i.kind !== 'poomsae' && i.kind !== 'rest' && squash(i.name).length >= 2 && squash(t).includes(squash(i.name)));
  if (byName) return { target: { kind: 'item', itemId: byName.id }, reason: 'named' };

  if (practice?.itemId && poomsaeIds.has(practice.itemId)) {
    const id = practice.justFinished ? practice.previousMovementId ?? practice.movementId : practice.movementId;
    const m = id ? moves.find((x) => x.movementId === id) : undefined;
    if (m) return { target: m, reason: practice.justFinished && practice.previousMovementId ? 'previous' : 'current' };
  }
  if (practice?.itemId) return { target: { kind: 'item', itemId: practice.itemId }, reason: 'item' };
  return { target: { kind: 'routine' }, reason: 'routine' };
}

export interface NewCorrectionInput {
  id: string;
  templateId: string;
  text: string;
  lang: Lang;
  target: Target;
  now: number;
}

/** Builds the stored correction from the note and its resolved target. */
export function makeCorrection(i: NewCorrectionInput): Correction {
  const x = extractCue(i.text, i.lang);
  return {
    id: i.id,
    templateId: i.templateId,
    text: i.text,
    cue: x.cue,
    side: x.side,
    part: x.part,
    lang: i.lang,
    fixed: false,
    createdAt: i.now,
    shown: 0,
    ...(i.target.kind === 'movement' ? { movementId: i.target.movementId, itemId: i.target.itemId, movementNo: i.target.no } : {}),
    ...(i.target.kind === 'item' ? { itemId: i.target.itemId } : {}),
  };
}

/** Pre-cues the planner plays: unfixed corrections, plus the kihap reminder for movements marked with one. */
export function correctionPreCues(corrections: readonly Correction[], items: readonly RoutineItem[], lang: Lang, opts: { kihap?: boolean } = {}): PreCue[] {
  const out: PreCue[] = [];
  const ids = new Set(items.map((i) => i.id));
  const moveIds = new Set(items.flatMap((i) => (i.kind === 'poomsae' ? i.movements.map((m) => m.id) : [])));
  for (const c of corrections) {
    if (c.fixed || c.lang !== lang) continue;
    if (c.movementId) {
      if (moveIds.has(c.movementId)) out.push({ id: c.id, text: c.cue, kind: 'correction', movementId: c.movementId });
    } else if (c.itemId) {
      if (ids.has(c.itemId)) out.push({ id: c.id, text: c.cue, kind: 'correction', itemId: c.itemId });
    } else out.push({ id: c.id, text: c.cue, kind: 'correction', routine: true });
  }
  if (opts.kihap !== false) {
    for (const it of items) {
      if (it.kind !== 'poomsae') continue;
      for (const m of it.movements) if (m.kihap) out.push({ id: `kihap:${m.id}`, text: lang === 'ko' ? '기합!' : 'kihap!', kind: 'kihap', movementId: m.id });
    }
  }
  return out;
}

/** "오늘 5번 동작 오른손 큐 3번 나왔어요": one summary line for the cues that played, or null when none did. */
export function correctionSummaryLine(played: ReadonlyMap<string, number>, corrections: readonly Correction[], lang: Lang): string | null {
  const parts: string[] = [];
  for (const [id, n] of played) {
    const c = corrections.find((x) => x.id === id);
    if (!c || n <= 0) continue;
    const where = c.movementNo !== undefined ? (lang === 'ko' ? `${c.movementNo}번 동작 ` : `movement ${c.movementNo} `) : '';
    parts.push(lang === 'ko' ? `${where}${c.cue.replace(/!$/, '')} 큐 ${n}번` : `${where}"${c.cue.replace(/!$/, '')}" cue ${n} ${n === 1 ? 'time' : 'times'}`);
  }
  if (parts.length === 0) return null;
  return lang === 'ko' ? `오늘 ${parts.join(', ')} 나왔어요` : `Today: ${parts.join(', ')}`;
}

/** Marks the correction(s) the user means as fixed: the most recently played active one, or the one on the current movement. */
export function pickCorrectionToFix(corrections: readonly Correction[], opts: { movementId?: string; lastPlayedId?: string }): Correction | undefined {
  const active = corrections.filter((c) => !c.fixed);
  return (
    (opts.lastPlayedId ? active.find((c) => c.id === opts.lastPlayedId) : undefined) ??
    (opts.movementId ? active.find((c) => c.movementId === opts.movementId) : undefined) ??
    (active.length === 1 ? active[0] : undefined)
  );
}
