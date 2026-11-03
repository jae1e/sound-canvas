import type { Action } from '../actions';
import { type Span, findMention, normalizeSpoken, refOf, removeSpans, stripLeadingFillers } from './common';
import { scanDurations } from './duration';
import type { Intent, ParseContext } from './types';

/** Common request endings: 해줘, 해주세요, 해요, 하자, ... (all optional). */
const REQ = '(?:해?줘요?|해?주세요|해요|해봐요?|해|줄래요?|주세요|할게요?|하자|합시다|요)?';
/** Same, but at least one ending must be present. */
const REQ_NE = '(?:해?줘요?|해?주세요|해요|해봐요?|해|줄래요?|주세요|할게요?|하자|합시다)';
/** Sentence endings after a stem like 됐: 어, 어요, 습니다, ... */
const END = '(?:어요?|습니다|네요?|다|음|지요?|죠|군요?)?';

function rx(source: string): RegExp {
  return new RegExp(source);
}

// ---------------------------------------------------------------- journal

const JOURNAL_PREFIX = /^(?:메모|일기|기록|저널|노트)\s*(?:[:：\-–—]|(?:해\s*줘요?|해\s*주세요|해\s*둬요?)\s*[:：,]?)\s*(\S[\s\S]*)$/u;
const JOURNAL_SUFFIX =
  /^(\S[\s\S]*?)\s*(?:메모|기록)\s*(?:해\s*줘요?|해\s*주세요|해\s*둬요?|해\s*놔줘)[.!?\s]*$|^(\S[\s\S]*?)\s*적어\s*(?:줘요?|주세요|둬요?)[.!?\s]*$/u;

function journal(raw: string): Intent | null {
  const m = JOURNAL_PREFIX.exec(raw) ?? JOURNAL_SUFFIX.exec(raw);
  const text = (m?.[1] ?? m?.[2])?.trim();
  return text ? { kind: 'journal', text } : null;
}

// -------------------------------------------------------------- recording

const RECORD_PLAY = rx(`(?:녹음(?:한|된|했던)?(?:거|것|본|파일)?|방금(?:거|것)?|아까(?:거|것)?|다시)(?:를|을)?(?:좀)?(?:들려|틀어|재생|플레이)`);
const RECORD_STOP = rx(`^(?:이제)?녹음(?:을|좀)?(?:멈춰|멈추|중지|정지|끝내|끝났|끝|그만|종료|꺼)(?:어요?|다)?${REQ}$`);
const RECORD_START = rx(`^(?:지금|이제|좀)?녹음(?:을|좀)?(?:시작|켜|해|하|할게|할래)${REQ}$`);

function recording(c: string): Intent | null {
  if (RECORD_STOP.test(c)) return { kind: 'recording', command: 'stop' };
  if (RECORD_PLAY.test(c)) return { kind: 'recording', command: 'play' };
  if (RECORD_START.test(c)) return { kind: 'recording', command: 'start' };
  return null;
}

// ------------------------------------------------------------- navigation

const NAV_NEXT = rx(
  '다음(?:엔|에는|에|은|이)?(?:어디|뭐|어떻게|어느|길|안내|회전|방향)|어디로(?:가|꺾|돌|가야)|어디서(?:꺾|돌|회전)|어느쪽으로|다음안내|다음경로',
);
const NAV_DIST_WORD = /(?:가야|목적지|거리|도착|얼마나멀|멀어)/;
const NAV_DIST_ASK = /(?:얼마|몇|거리|멀)/;

function navigation(c: string): Intent | null {
  if (NAV_NEXT.test(c)) return { kind: 'navigation', query: 'next_instruction' };
  if (NAV_DIST_WORD.test(c) && NAV_DIST_ASK.test(c)) return { kind: 'navigation', query: 'distance_remaining' };
  return null;
}

// ------------------------------------------------------------ plan steps

const PLAN_PATTERN = /^(?:단계|스텝|순서|계획)\s*[:：\-–—]\s*(\S[\s\S]*)$/u;

function plan(raw: string): Intent | null {
  const body = PLAN_PATTERN.exec(raw)?.[1];
  if (!body) return null;
  const steps = body
    .split(/\s*(?:,|，|;|->|→|그리고|그다음에?|다음에)\s*/u)
    .map((x) => x.replace(/[.!?]+$/u, '').trim())
    .filter(Boolean);
  return steps.length > 0 ? { kind: 'plan', steps } : null;
}

const GO = '(?:가|돌아가|돌아가줘요?|가자|가줘요?|가요|갈게요?|해줘요?|해요?|줘요?|주세요|넘어가자|넘어가줘요?|넘어가요|넘어갈게요?)?';
const NEXT_STEP = rx(`^(?:다음|다음단계|다음거|다음것|다음작업|다음스텝)(?:으로|로)?${GO}$`);
const PREV_STEP = rx(
  `^(?:이전|이전단계|이전으로|전단계|한단계전|한단계뒤로|뒤로|돌아가|되돌아가|되돌려|이전스텝|전으로)(?:으로|로)?${GO}$`,
);
const STEPS_LEFT = [
  rx(`^(?:지금)?(?:뭐|뭘|뭔가|무엇|무슨일|뭐가|뭐랑)(?:가|이)?(?:더)?(?:남았|남은|남아)(?:어요?|지|나|죠|는지|니)?(?:요)?$`),
  rx(`^(?:남은|앞으로)(?:거|것|일|단계|작업|할일|스텝)(?:이?)(?:뭐|뭐야|알려줘요?|알려주세요|말해줘요?|말해줘|읽어줘요?)?$`),
  rx(`^(?:뭐|뭘)더(?:해야|하면|할게)(?:돼|되|해|하지|하나|있어)(?:요)?$`),
  rx(`^(?:단계|할일|작업)(?:이|가)?(?:몇개|얼마나)(?:나)?(?:남았|남아|남은)(?:어요?|지|나)?$`),
];
const WHERE_WAS_I = [
  rx(`^(?:나|우리)?(?:지금)?어디까지(?:했|왔|한|하고)(?:어요?|지|더라|었지|었어요?|나|죠)?(?:요)?$`),
  rx(`^(?:나|우리)?(?:지금)?(?:뭐|무엇|뭘)(?:하던|하고있던|하고있었|하는중|하고있|하고있지|하는거|하는지)(?:어요?|지|더라|였지|였어요?|나|죠|야)?(?:요)?$`),
  rx(`^(?:지금|현재)(?:몇번째|무슨|어떤|어느)?(?:단계|스텝|작업)(?:이야|인지|이지|야|이에요|이죠|가뭐야|가뭐|뭐야|뭐)?$`),
  rx(`^(?:지금|현재)(?:단계|작업)(?:알려줘요?|알려주세요|말해줘요?)$`),
];
const NEXT_PEEK = [rx(`^다음(?:은|엔|에는)?(?:뭐|뭐야|뭐지|뭐예요|뭘까|무엇|어떤단계)(?:야|예요|죠|지|요)?$`), rx(`^다음단계(?:는|가)?(?:뭐|뭐야|뭐예요|뭐지|알려줘요?|알려주세요)$`)];

// ------------------------------------------------------------------ rules

/** Leftovers next to a bare duration that are verbs, particles or time words rather than a label. */
const ELLIPTICAL_STOP = /(?:요|다|어|아|줘|까|나|네|죠|지|야|전|후|뒤|간|동안|마다|정도|만|더|씩|남|걸|뒤에|후에)$|^(?:이|그|저|좀|다시|아직|이제)/;

const EXTEND_TAIL = rx(`^(?:아직(?:도|은)?(?:이?야|이에요|이요|요|(?:안|덜)(?:됐|되었)(?:어요?|습니다)?)?|아니)?(?:만|정도|씩)?(?:더|연장|추가|늘려|더늘려|더필요|더있어야(?:해|돼|되나|합니다)?|더해)${REQ}$`);

const CHECK_IN_TAIL = rx(
  `^(?:뒤에?|후에?)(?:에)?(?:다시|한번|한번더)?(?:확인|체크|물어봐|물어보|알려|말해|깨워|불러)${REQ}$`,
);

const TIMER_POST = rx(`^(?:으로|로|를|을|은|는|가|이|좀|용)*(?:맞춰|설정|시작|켜|만들|돌려|걸어|세팅)?${REQ}$`);

const TIMER_PAUSE = rx(`^(?:를|은|는|좀|잠깐|잠시|잠깐만|잠시만)*(?:멈춰|멈추|일시정지|일시중지|정지|스톱)${REQ}$`);
const TIMER_RESUME = rx(`^(?:를|은|는|좀)*(?:다시시작|계속|재개|재시작|이어서|다시켜)(?:하|해)?${REQ}$`);
const TIMER_CANCEL = rx(`^(?:를|은|는|좀)*(?:취소|꺼|끄|삭제|없애|지워|해제)${REQ}$`);

const QUIET_OFF = [
  rx(`^다시(?:말|이야기|얘기)해(?:줘요?|주세요|도돼요?|봐)?$`),
  rx(`^소리(?:를|좀)*(?:켜|내|나게)${REQ}$`),
  rx(`^음소거(?:를)?(?:해제|풀어)${REQ}$`),
  rx(`^(?:이제)?말해도(?:돼요?|됩니다|괜찮아요?)$`),
  rx(`^조용히(?:모드)?(?:해제|풀어|그만)${REQ}$`),
];
const QUIET_ON = [
  rx(`^조용히(?:좀)?${REQ}$`),
  rx(`^말(?:을|좀)*줄여(?:줘요?|주세요|요)?$`),
  rx(`^음소거(?:모드)?${REQ}$`),
  rx(`^(?:조용한|무음)모드(?:로|켜)?${REQ}$`),
];

const SESSION_PAUSE = [
  rx(`^(?:잠깐|잠시)(?:만)?(?:멈춰|멈추|정지|스톱)${REQ}$`),
  rx(`^세션(?:을)?(?:일시정지|일시중지|멈춰|멈추|정지)${REQ}$`),
  rx(`^(?:일시정지|일시중지)${REQ}$`),
];
const SESSION_RESUME = [
  rx(`^(?:세션(?:을)?)?(?:다시시작|계속|이어서|이어가)${REQ_NE}$`),
  rx(`^(?:세션(?:을)?)?재개${REQ}$`),
];
const SESSION_END = rx(
  `^(?:이제|오늘은?)?(?:끝내자|끝낼게요?|끝내줘요?|끝내|마치자|마칠게요?|그만하자|그만할게요?|그만해|여기까지(?:하자|할게요?|해요|야|입니다)?|종료${REQ}|세션(?:을)?(?:종료|끝내|마치|끝|그만)${REQ})$`,
);

const SKIP = rx(`^(?:이거|이건|이것|그거|지금)?(?:건너뛰|건너뛸|스킵|넘어가|넘기|패스)(?:어요?|자)?${REQ}$`);

const DONE = rx(
  `^(?:다|이제|벌써|거의|모두)*(?:됐|되었|됬|완료(?:됐|했|되었)?|끝났|익었|준비됐|준비되었|다했)${END}$`,
);
const NOT_YET = [
  rx(`^아직(?:도|은)?(?:이?야|이에요|이요|요|이네요?|입니다|임)?$`),
  rx(`^(?:아직(?:도|은)?)?(?:안|못|덜)(?:됐|되었|익었|끝났)${END}$`),
  rx(`^아직(?:도|은)?(?:멀었|안했|안끝났)${END}$`),
];

const REMAINING = /(?:얼마나?|몇분|몇초|몇시간)(?:이나|정도)?(?:더)?(?:남았|남은|남아)|남은시간|시간(?:이)?얼마나?남/;
const STATUS = /(?:상황|상태)(?:가|를|좀|이)?(?:알려|말해|어때|어떻|뭐|보여)/;

// ------------------------------------------------------------------ entry

export function parseKo(raw: string, ctx: ParseContext): Intent[] {
  const text = stripLeadingFillers(raw, 'ko');
  const j = journal(text);
  if (j) return [j];
  const p = plan(text.trim());
  if (p) return [p];

  const c = normalizeSpoken(text).replace(/\s+/g, '');
  if (!c) return [];

  const rec = recording(c);
  if (rec) return [rec];
  if (NEXT_PEEK.some((re) => re.test(c))) return [{ kind: 'query', query: 'next_step' }];
  const nav = navigation(c);
  if (nav) return [nav];

  const { mention, conflict } = findMention(c, ctx, 'ko');
  if (conflict) return [];
  const ref = refOf(mention);

  // Label removal: also swallow a directly following topic/object particle.
  const durScan = scanDurations(c, 'ko');
  const durSpans: Span[] = durScan.durations;
  let labelSpan: Span[] = [];
  if (mention) {
    let end = mention.end;
    const inDuration = durSpans.some((d) => end >= d.start && end < d.end);
    if (!inDuration && /[은는을를도좀]/.test(c[end] ?? '')) end++;
    labelSpan = [{ start: mention.start, end }];
  }
  const rl = removeSpans(c, labelSpan, '');
  const r = removeSpans(c, [...labelSpan, ...durSpans], '');
  const oneDuration = durScan.durations.length === 1 ? durScan.durations[0]!.ms : undefined;
  const act = (action: Action): Intent[] => [{ kind: 'action', action }];

  if (durScan.durations.length > 1) return [];

  // Timed quiet: "조용히 10분", "10분 동안 조용히 해줘".
  if (oneDuration !== undefined && QUIET_ON.some((re) => re.test(r.replace(/^(?:동안|간|만)/, '')))) {
    return act({ type: 'set_quiet', quiet: true, forMs: oneDuration });
  }

  // Extension: "2분 더", "아직 2분만 더", "2분 연장".
  if (oneDuration !== undefined && EXTEND_TAIL.test(r.replace(/타이머(?:를|에|에서)?/, ''))) {
    return act({ type: 'extend_task', task: ref, byMs: oneDuration });
  }

  // Timer commands. Without a duration they control an existing timer; unmatched text
  // (e.g. "타이머 얼마나 남았어") falls through to the query rules below.
  if (c.includes('타이머') && oneDuration !== undefined) {
    const idx = r.indexOf('타이머');
    const pre = r
      .slice(0, idx)
      .replace(/하나|새로|새|좀|그리고|다시/g, '')
      .replace(/(?:용|짜리|으로|로|를|을|에|의|간)$/, '');
    if (TIMER_POST.test(r.slice(idx + '타이머'.length)) && !(mention && pre) && pre.length <= 8) {
      const label = mention?.label ?? (pre || '타이머');
      const action: Action = { type: 'start_timer', label, durationMs: oneDuration };
      if (mention?.source === 'task') action.task = { label: mention.label };
      return act(action);
    }
    return [];
  }
  if (c.includes('타이머')) {
    const rest = rl.replace(/타이머/g, '');
    if (TIMER_PAUSE.test(rest)) return act({ type: 'pause_timer', timer: ref });
    if (TIMER_RESUME.test(rest)) return act({ type: 'resume_timer', timer: ref });
    if (TIMER_CANCEL.test(rest)) return act({ type: 'cancel_timer', timer: ref });
  }

  // Check-in: "3분 뒤에 버섯 확인해줘".
  if (oneDuration !== undefined) {
    if (CHECK_IN_TAIL.test(r)) return act({ type: 'schedule_check_in', task: ref, inMs: oneDuration });

    // Elliptical timers: "파스타 3분", "3분 파스타", bare "3분", "3분 맞춰줘".
    const bare = r === '' || TIMER_POST.test(r);
    const noun = !mention && /^[가-힣a-z0-9]{1,8}$/.test(r) && !ELLIPTICAL_STOP.test(r);
    if (bare || noun) {
      const label = mention?.label ?? (bare ? '타이머' : r);
      const action: Action = { type: 'start_timer', label, durationMs: oneDuration };
      if (mention?.source === 'task') action.task = { label: mention.label };
      return act(action);
    }
    return [];
  }

  if (STEPS_LEFT.some((re) => re.test(rl))) return [{ kind: 'query', query: 'steps_left' }];
  if (WHERE_WAS_I.some((re) => re.test(rl))) return [{ kind: 'query', query: 'where' }];

  if (REMAINING.test(rl)) return [{ kind: 'query', query: 'remaining', target: ref }];
  if (STATUS.test(rl)) return [{ kind: 'query', query: 'status', ...(mention ? { target: ref } : {}) }];

  if (QUIET_OFF.some((re) => re.test(rl))) return act({ type: 'set_quiet', quiet: false });
  if (QUIET_ON.some((re) => re.test(rl))) return act({ type: 'set_quiet', quiet: true });

  if (SESSION_PAUSE.some((re) => re.test(rl))) return act({ type: 'pause_session' });
  if (SESSION_RESUME.some((re) => re.test(rl))) return act({ type: 'resume_session' });
  if (SESSION_END.test(rl)) return act({ type: 'end_session' });

  if (SKIP.test(rl)) return act({ type: 'skip_task', task: ref });

  if (!mention) {
    if (NEXT_STEP.test(rl)) return act({ type: 'next_step' });
    if (PREV_STEP.test(rl)) return act({ type: 'prev_step' });
  }

  const rest = mention ? rl.replace(/^(?:이|가)/, '') : rl;
  if (NOT_YET.some((re) => re.test(rest))) return act({ type: 'report_task', task: ref, report: 'not_yet' });
  if (DONE.test(rest)) return act({ type: 'report_task', task: ref, report: 'done' });
  return [];
}
