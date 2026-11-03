/**
 * Small ko/en command parser for Voice Coach. It only recognises commands between takes; anything else returns null so the
 * utterance falls through to the shared session-engine parser (timers, notes).
 */

export type CoachCommand =
  | { kind: 'start_take' }
  | { kind: 'stop_take' }
  | { kind: 'play_back' }
  | { kind: 'same_block_again' }
  /** A note for the latest take. */
  | { kind: 'take_note'; text: string };

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.!?,~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// A note carries free text, so it is matched on the raw string (keeping case and punctuation of the note itself).
const NOTE_PREFIX = /^(?:(?:이\s*)?(?:테이크|녹음)\s*(?:에\s*대한\s*)?메모|메모|(?:take|recording)\s+note|note(?:\s+for)?(?:\s+(?:this|the last|that))?\s+take|note|memo)\s*[:：\-–—]\s*(\S[\s\S]*)$/iu;
const NOTE_KO_SPOKEN = /^(?:이\s*)?(?:테이크|녹음)\s*메모\s*(?:해\s*줘요?|해\s*주세요)?\s*[,]?\s*(\S[\s\S]+)$/u;

const START = [
  /^(?:start|begin) (?:a |the |my )?(?:new )?(?:take|recording)(?: now)?$/,
  /^(?:record|record (?:a )?take|record now|let s record)$/,
  /^(?:take|recording) start$/,
  /^(?:지금 |이제 )?(?:녹음|테이크) ?(?:시작|시작해|시작해줘|시작할게|시작해 줘|해줘|해 줘|켜줘|켜 줘)$/,
  /^(?:녹음|테이크)(?:을|를)? 시작(?:해|해줘|해 줘|할게|할래)?$/,
];
const STOP = [
  /^(?:stop|end|finish) (?:the |this |my )?(?:take|recording)$/,
  /^(?:stop|that s it|that is it|done|finished)$/,
  /^(?:녹음|테이크) ?(?:중지|정지|멈춰|멈춰줘|그만|끝|끝내|끝내줘|종료|꺼줘|꺼 줘)$/,
  /^(?:그만|멈춰|중지|정지|끝)$/,
];
const PLAY = [
  /^play (?:it|that|this|the (?:last )?(?:take|recording)|my (?:take|recording)|the last one) back$/,
  /^play back (?:it|that|this|the (?:last )?(?:take|recording)|my (?:take|recording)|the last one)$/,
  /^(?:play|replay) (?:it|that|the last take|the last recording|the take) again$/,
  /^(?:play|replay) (?:the )?(?:last )?(?:take|recording)$/,
  /^let me hear (?:it|that|the last take|the take)(?: again)?$/,
  /^(?:다시 들려줘|다시 들려 줘|다시 들을래|방금 (?:거|것|녹음|테이크) (?:들려줘|들려 줘|틀어줘|재생해줘|재생|들을래)|(?:녹음|테이크) (?:들려줘|들려 줘|재생|재생해줘|틀어줘))$/,
];
const SAME_BLOCK = [
  /^(?:same|that) (?:block|one|exercise) (?:again|one more time)$/,
  /^(?:do |run |repeat )?(?:the )?same block(?: again| one more time)?$/,
  /^(?:one more|again|once more|one more time)$/,
  /^(?:같은 블록|이 블록|블록) ?(?:다시|한 ?번 더|또)(?: ?해줘| ?해 줘| ?하자| ?할래)?$/,
  /^(?:한 ?번 더|다시 ?(?:한 ?번)?)(?: ?해줘| ?해 줘| ?하자| ?할래)?$/,
];

export function parseCoachCommand(text: string): CoachCommand | null {
  const raw = text.trim();
  const note = NOTE_PREFIX.exec(raw) ?? NOTE_KO_SPOKEN.exec(raw);
  const noteText = note?.[1]?.trim();
  if (noteText) return { kind: 'take_note', text: noteText };

  const c = clean(raw);
  if (!c) return null;
  if (SAME_BLOCK.some((r) => r.test(c))) return { kind: 'same_block_again' };
  if (PLAY.some((r) => r.test(c))) return { kind: 'play_back' };
  if (START.some((r) => r.test(c))) return { kind: 'start_take' };
  if (STOP.some((r) => r.test(c))) return { kind: 'stop_take' };
  return null;
}
