import { describe, expect, it } from 'vitest';
import type { Action } from '../src/actions';
import { type Intent, type ParseContext, parseUtterance } from '../src/parser';

const ctx: ParseContext = { taskLabels: ['파스타', '버섯', '물 끓이기'], timerLabels: ['파스타', '휴식'] };
const none: ParseContext = { taskLabels: [], timerLabels: [] };
const imp = { implicit: true } as const;
const act = (action: Action): Intent => ({ kind: 'action', action });

type Case = [utterance: string, expected: Intent | null, context?: ParseContext];

const cases: Case[] = [
  // done
  ['다 됐어', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['다됐어', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['됐어요.', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['완료', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['음, 끝났어', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['다 익었어!', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['버섯 다 됐어', act({ type: 'report_task', task: { label: '버섯' }, report: 'done' })],
  ['버섯은 다 익었어요', act({ type: 'report_task', task: { label: '버섯' }, report: 'done' })],
  ['파스타가 다됐어', act({ type: 'report_task', task: { label: '파스타' }, report: 'done' })],
  ['물끓이기 완료했어', act({ type: 'report_task', task: { label: '물 끓이기' }, report: 'done' })],
  // not yet
  ['아직', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['아직이요', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['아직이에요', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['아직 안 됐어요', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['아직이야', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['덜 됐어', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['아직 안 됐어', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['버섯은 아직이에요', act({ type: 'report_task', task: { label: '버섯' }, report: 'not_yet' })],
  // extend
  ['2분 더', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['이 분만 더', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['아직이요 2분만 더', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['아직이에요, 2분 더 주세요', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['아직 안 됐어요 3분만 더', act({ type: 'extend_task', task: imp, byMs: 180_000 }), none],
  ['아직요 1분 더', act({ type: 'extend_task', task: imp, byMs: 60_000 }), none],
  ['아직, 2분 더', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['30초 연장해줘', act({ type: 'extend_task', task: imp, byMs: 30_000 }), none],
  ['삼십 초만 더 해줘', act({ type: 'extend_task', task: imp, byMs: 30_000 }), none],
  ['파스타 1분 반 더', act({ type: 'extend_task', task: { label: '파스타' }, byMs: 90_000 })],
  ['열다섯 분 더', act({ type: 'extend_task', task: imp, byMs: 900_000 }), none],
  ['두 시간 더', act({ type: 'extend_task', task: imp, byMs: 7_200_000 }), none],
  ['타이머 3분 더', act({ type: 'extend_task', task: imp, byMs: 180_000 }), none],
  ['네 다 됐어요', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['타이머 얼마나 남았어', { kind: 'query', query: 'remaining', target: imp }, none],
  ['반 시간 더', act({ type: 'extend_task', task: imp, byMs: 1_800_000 }), none],
  // check-in
  ['2분 뒤에 버섯 확인해줘', act({ type: 'schedule_check_in', task: { label: '버섯' }, inMs: 120_000 })],
  ['버섯 3분 후에 물어봐줘', act({ type: 'schedule_check_in', task: { label: '버섯' }, inMs: 180_000 })],
  ['오분 뒤에 확인해줘', act({ type: 'schedule_check_in', task: imp, inMs: 300_000 }), none],
  ['1분 30초 후에 알려줘', act({ type: 'schedule_check_in', task: imp, inMs: 90_000 }), none],
  // timers
  ['파스타 3분 타이머', act({ type: 'start_timer', label: '파스타', durationMs: 180_000, task: { label: '파스타' } })],
  ['타이머 5분', act({ type: 'start_timer', label: '타이머', durationMs: 300_000 }), none],
  ['10분 타이머 맞춰줘', act({ type: 'start_timer', label: '타이머', durationMs: 600_000 }), none],
  ['휴식 2분 타이머 맞춰줘', act({ type: 'start_timer', label: '휴식', durationMs: 120_000 }), none],
  ['삼십초 타이머 해줘', act({ type: 'start_timer', label: '타이머', durationMs: 30_000 }), none],
  ['타이머를 1시간으로 맞춰주세요', act({ type: 'start_timer', label: '타이머', durationMs: 3_600_000 }), none],
  ['타이머 멈춰', act({ type: 'pause_timer', timer: imp }), none],
  ['타이머 일시정지', act({ type: 'pause_timer', timer: imp }), none],
  ['타이머 다시 시작', act({ type: 'resume_timer', timer: imp }), none],
  ['타이머 계속', act({ type: 'resume_timer', timer: imp }), none],
  ['타이머 취소해줘', act({ type: 'cancel_timer', timer: imp }), none],
  ['타이머 꺼줘', act({ type: 'cancel_timer', timer: imp }), none],
  ['휴식 타이머 멈춰', act({ type: 'pause_timer', timer: { label: '휴식' } })],
  // session
  ['잠깐 멈춰', act({ type: 'pause_session' }), none],
  ['세션 일시정지', act({ type: 'pause_session' }), none],
  ['다시 시작하자', act({ type: 'resume_session' }), none],
  ['계속하자', act({ type: 'resume_session' }), none],
  ['끝내자', act({ type: 'end_session' }), none],
  ['세션 종료', act({ type: 'end_session' }), none],
  ['그만하자', act({ type: 'end_session' }), none],
  ['오늘은 여기까지 하자', act({ type: 'end_session' }), none],
  // quiet
  ['조용히 해줘', act({ type: 'set_quiet', quiet: true }), none],
  ['말 줄여줘', act({ type: 'set_quiet', quiet: true }), none],
  ['음소거', act({ type: 'set_quiet', quiet: true }), none],
  ['다시 말해줘', act({ type: 'set_quiet', quiet: false }), none],
  ['소리 켜줘', act({ type: 'set_quiet', quiet: false }), none],
  ['음소거 해제', act({ type: 'set_quiet', quiet: false }), none],
  // skip
  ['건너뛰어', act({ type: 'skip_task', task: imp }), none],
  ['스킵', act({ type: 'skip_task', task: imp }), none],
  ['이거 넘어가자', act({ type: 'skip_task', task: imp }), none],
  ['버섯 건너뛰어줘', act({ type: 'skip_task', task: { label: '버섯' } })],
  // queries
  ['얼마나 남았어', { kind: 'query', query: 'remaining', target: imp }, none],
  ['몇 분 남았어?', { kind: 'query', query: 'remaining', target: imp }, none],
  ['파스타 얼마나 남았어', { kind: 'query', query: 'remaining', target: { label: '파스타' } }],
  ['지금 상황 알려줘', { kind: 'query', query: 'status' }, none],
  // navigation
  ['얼마나 더 가야 돼', { kind: 'navigation', query: 'distance_remaining' }, none],
  ['목적지까지 얼마나 남았어', { kind: 'navigation', query: 'distance_remaining' }, none],
  ['다음엔 어디로 가', { kind: 'navigation', query: 'next_instruction' }, none],
  // journal
  ['메모: 오늘 컨디션 좋음', { kind: 'journal', text: '오늘 컨디션 좋음' }, none],
  ['메모해줘 우유 사기', { kind: 'journal', text: '우유 사기' }, none],
  ['기록해줘 오늘 발성이 편했다', { kind: 'journal', text: '오늘 발성이 편했다' }, none],
  ['일기: 산책이 즐거웠다.', { kind: 'journal', text: '산책이 즐거웠다.' }, none],
  ['음 일기: 비가 왔다', { kind: 'journal', text: '비가 왔다' }, none],
  ['소금이 부족했다고 메모해줘', { kind: 'journal', text: '소금이 부족했다고' }, none],
  // recording
  ['녹음 시작', { kind: 'recording', command: 'start' }, none],
  ['녹음해줘', { kind: 'recording', command: 'start' }, none],
  ['녹음 멈춰', { kind: 'recording', command: 'stop' }, none],
  ['녹음 끝', { kind: 'recording', command: 'stop' }, none],
  ['다시 들려줘', { kind: 'recording', command: 'play' }, none],
  ['방금 거 틀어줘', { kind: 'recording', command: 'play' }, none],
  // negatives: must not guess
  ['오늘 날씨 어때', null],
  ['몇 분 더', null],
  ['조금 더', null],
  ['2분 3분 더', null],
  ['파스타 버섯 다 됐어', null],
  ['메모해줘', null],
  ['안녕하세요', null],
  ['파스타 맛있게 만드는 법 알려줘', null],
  ['', null],
];

describe('Korean Tier 0 parser', () => {
  it.each(cases)('%s', (utterance, expected, context = ctx) => {
    const result = parseUtterance(utterance, 'ko', context);
    if (expected === null) {
      expect(result).toEqual({ intents: [], confidence: 'low' });
    } else {
      expect(result).toEqual({ intents: [expected], confidence: 'high' });
    }
  });

  it('is whitespace- and punctuation-insensitive for labels', () => {
    for (const u of ['물 끓이기 다 됐어', '물끓이기다됐어', '물 끓이기, 다 됐어!']) {
      expect(parseUtterance(u, 'ko', ctx).intents).toEqual([
        act({ type: 'report_task', task: { label: '물 끓이기' }, report: 'done' }),
      ]);
    }
  });

  it('keeps "done" distinct from ending the session', () => {
    const r = parseUtterance('다 됐어', 'ko', none).intents[0] as Intent;
    expect(r).not.toEqual(act({ type: 'end_session' }));
    expect(parseUtterance('끝났어', 'ko', none).intents).toEqual([
      act({ type: 'report_task', task: imp, report: 'done' }),
    ]);
  });
});
