import { describe, expect, it } from 'vitest';
import type { Change } from '../src/actions';
import { hasFinalConsonant, particle, withParticle } from '../src/korean';
import { describeChanges, describeDue, describeRejection, formatDuration } from '../src/messages';
import type { DueEvent } from '../src/types';

describe('Korean particles', () => {
  it.each([
    ['파스타', 'object', '를'],
    ['버섯', 'object', '을'],
    ['물', 'instrumental', '로'], // final ㄹ takes 로
    ['밥', 'instrumental', '으로'],
    ['파스타', 'instrumental', '로'],
    ['버섯', 'topic', '은'],
    ['파스타', 'topic', '는'],
    ['버섯', 'subject', '이'],
    ['파스타', 'subject', '가'],
    ['파스타', 'with', '랑'],
    ['버섯', 'with', '이랑'],
    ['3분', 'instrumental', '으로'],
    ['30초', 'instrumental', '로'],
    ['3', 'object', '을'], // 삼
    ['2', 'object', '를'], // 이
    ['8', 'instrumental', '로'], // 팔 ends in ㄹ
    ['pasta', 'object', '를'], // Latin fallback: treated as vowel-final
  ] as const)('%s + %s -> %s', (word, kind, expected) => {
    expect(particle(word, kind)).toBe(expected);
  });

  it('detects batchim', () => {
    expect(hasFinalConsonant('밥')).toBe(true);
    expect(hasFinalConsonant('파스타')).toBe(false);
    expect(hasFinalConsonant('')).toBe(false);
    expect(withParticle('물', 'instrumental')).toBe('물로');
    expect(withParticle('밥', 'instrumental')).toBe('밥으로');
  });
});

describe('formatDuration', () => {
  it.each([
    [150_000, 'ko', '2분 30초'],
    [3_600_000, 'ko', '1시간'],
    [45_000, 'ko', '45초'],
    [5_400_000, 'ko', '1시간 30분'],
    [0, 'ko', '0초'],
    [400, 'ko', '1초'],
    [150_000, 'en', '2 minutes 30 seconds'],
    [3_600_000, 'en', '1 hour'],
    [60_000, 'en', '1 minute'],
    [1_000, 'en', '1 second'],
    [5_400_000, 'en', '1 hour 30 minutes'],
    [0, 'en', '0 seconds'],
  ] as const)('%d ms (%s) -> %s', (ms, lang, expected) => {
    expect(formatDuration(ms, lang)).toBe(expected);
  });
});

describe('describeChanges', () => {
  const cases: Array<[string, Change[], string, string]> = [
    [
      'check-in scheduled',
      [{ kind: 'check_in_scheduled', checkInId: 'c1', taskId: 't1', label: '버섯', inMs: 120_000 }],
      '버섯 확인을 2분 뒤로 잡았어요.',
      "I'll check the 버섯 in 2 minutes.",
    ],
    [
      'completion merged with cancelled check-ins',
      [
        { kind: 'task_status', taskId: 't1', label: '버섯', status: 'completed' },
        { kind: 'check_ins_cancelled', taskId: 't1', label: '버섯', count: 1 },
      ],
      '버섯을 완료로 표시하고 확인 알림을 취소했어요.',
      'Marked the 버섯 done and cancelled the check-in.',
    ],
    [
      'completion without check-ins',
      [{ kind: 'task_status', taskId: 't1', label: '파스타', status: 'completed' }],
      '파스타를 완료로 표시했어요.',
      'Marked the 파스타 done.',
    ],
    [
      'skipped',
      [{ kind: 'task_status', taskId: 't1', label: '파스타', status: 'skipped' }],
      '파스타를 건너뛰었어요.',
      'Skipped the 파스타.',
    ],
    [
      'zero cancelled check-ins is silent',
      [{ kind: 'check_ins_cancelled', taskId: 't1', label: '파스타', count: 0 }],
      '',
      '',
    ],
    [
      'timer started with duration particle',
      [{ kind: 'timer_started', timerId: 'm1', label: '파스타', durationMs: 180_000 }],
      '파스타 타이머를 3분으로 시작했어요.',
      'Started a 파스타 timer for 3 minutes.',
    ],
    [
      'default timer label',
      [{ kind: 'timer_started', timerId: 'm1', label: '타이머', durationMs: 30_000 }],
      '타이머를 30초로 시작했어요.',
      'Started a timer for 30 seconds.',
    ],
    [
      'timer extended',
      [{ kind: 'timer_extended', timerId: 'm1', label: '파스타', remainingMs: 300_000 }],
      '파스타 타이머를 연장했어요. 5분 남았어요.',
      'Extended the 파스타 timer. 5 minutes left.',
    ],
    [
      'timer paused / resumed / cancelled',
      [
        { kind: 'timer_paused', timerId: 'm1', label: '휴식', remainingMs: 60_000 },
        { kind: 'timer_resumed', timerId: 'm1', label: '휴식', remainingMs: 60_000 },
        { kind: 'timer_cancelled', timerId: 'm1', label: '휴식' },
      ],
      '휴식 타이머를 멈췄어요. 1분 남았어요. 휴식 타이머를 다시 시작했어요. 1분 남았어요. 휴식 타이머를 취소했어요.',
      'Paused the 휴식 timer with 1 minute left. Resumed the 휴식 timer, 1 minute left. Cancelled the 휴식 timer.',
    ],
    [
      'quiet',
      [{ kind: 'quiet', quiet: true }],
      '조용히 할게요.',
      'Okay, quiet mode on.',
    ],
    [
      'session paused',
      [{ kind: 'session_status', status: 'paused' }],
      '세션을 일시정지했어요.',
      'Paused the session.',
    ],
    [
      'bookkeeping is silent',
      [{ kind: 'due_handled', key: 'k', outcome: 'delivered' }],
      '',
      '',
    ],
    ['no changes', [], '', ''],
  ];

  it.each(cases)('%s (ko)', (_name, changes, ko) => expect(describeChanges(changes, 'ko')).toBe(ko));
  it.each(cases)('%s (en)', (_name, changes, _ko, en) => expect(describeChanges(changes, 'en')).toBe(en));

  it('uses correct particles for labels ending in a consonant', () => {
    const changes: Change[] = [{ kind: 'task_added', taskId: 't', label: '버섯' }];
    expect(describeChanges(changes, 'ko')).toBe('버섯을 추가했어요.');
  });

  it('merges multiple cancelled check-ins with their task', () => {
    const out = describeChanges(
      [
        { kind: 'check_ins_cancelled', taskId: 't1', label: 'mushrooms', count: 2 },
        { kind: 'task_status', taskId: 't1', label: 'mushrooms', status: 'completed' },
      ],
      'en',
    );
    expect(out).toBe('Marked the mushrooms done and cancelled 2 check-ins.');
  });

  it('never mentions check-ins when none were reported', () => {
    expect(describeChanges([{ kind: 'task_status', taskId: 't', label: 'pasta', status: 'completed' }], 'en')).not.toMatch(/check-in/);
  });
});

describe('describeChanges: redundant in_progress', () => {
  const status: Change = { kind: 'task_status', taskId: 't1', label: '버섯', status: 'in_progress' };
  it('is silent next to a rescheduled check-in', () => {
    const changes: Change[] = [status, { kind: 'check_in_scheduled', checkInId: 'c1', taskId: 't1', label: '버섯', inMs: 120_000 }];
    expect(describeChanges(changes, 'ko')).toBe('버섯 확인을 2분 뒤로 잡았어요.');
    expect(describeChanges(changes, 'en')).toBe("I'll check the 버섯 in 2 minutes.");
  });
  it('is silent next to an extended timer', () => {
    const changes: Change[] = [status, { kind: 'timer_extended', timerId: 'x', label: '버섯', remainingMs: 120_000 }];
    expect(describeChanges(changes, 'en')).toBe('Extended the 버섯 timer. 2 minutes left.');
  });
  it('is still narrated on its own', () => {
    expect(describeChanges([status], 'en')).toBe('Marked the 버섯 in progress.');
  });
});

describe('describeDue', () => {
  const base: DueEvent = { key: 'k', kind: 'timer_milestone', dueAt: 0, stale: false, label: '파스타' };
  const cases: Array<[string, DueEvent, string, string]> = [
    [
      'elapsed milestone',
      { ...base, label: '타이머', milestone: { kind: 'elapsed', offsetMs: 180_000 } },
      '3분 지났어요.',
      '3 minutes have passed.',
    ],
    [
      'elapsed milestone with label',
      { ...base, milestone: { kind: 'elapsed', offsetMs: 180_000 } },
      '파스타 3분 지났어요.',
      '3 minutes have passed on the 파스타.',
    ],
    [
      'remaining milestone, default label',
      { ...base, label: 'timer', milestone: { kind: 'remaining', offsetMs: 60_000 } },
      '1분 남았어요.',
      '1 minute left.',
    ],
    [
      'singular elapsed milestone',
      { ...base, milestone: { kind: 'elapsed', offsetMs: 60_000 } },
      '파스타 1분 지났어요.',
      '1 minute has passed on the 파스타.',
    ],
    [
      'remaining milestone with label',
      { ...base, milestone: { kind: 'remaining', offsetMs: 60_000 } },
      '파스타 1분 남았어요.',
      '1 minute left on the 파스타.',
    ],
    [
      'stale milestone is silent',
      { ...base, stale: true, milestone: { kind: 'remaining', offsetMs: 60_000 } },
      '',
      '',
    ],
    [
      'timer expired',
      { ...base, kind: 'timer_expired' },
      '파스타 시간 다 됐어요. 확인하고 알려주세요.',
      'The 파스타 timer is up. Check it and let me know.',
    ],
    [
      'timer expired, default label',
      { ...base, kind: 'timer_expired', label: 'timer' },
      '시간 다 됐어요. 확인하고 알려주세요.',
      "Time's up. Check it and let me know.",
    ],
    [
      'stale expiry is phrased as past',
      { ...base, kind: 'timer_expired', stale: true },
      '파스타 시간이 지났어요. 확인하고 알려주세요.',
      'The 파스타 timer ran out. Check it and let me know.',
    ],
    [
      'first check-in',
      { ...base, kind: 'check_in', label: '버섯', attempt: 1 },
      '버섯 다 됐는지 확인해 주시겠어요?',
      'Could you check whether the 버섯 is done?',
    ],
    [
      'second check-in is a gentle repeat',
      { ...base, kind: 'check_in', label: '버섯', attempt: 2 },
      '버섯, 다 됐는지 한 번만 더 확인해 주시겠어요?',
      'Just a gentle reminder: is the 버섯 done yet?',
    ],
    [
      'check-in exhausted is silent',
      { ...base, kind: 'check_in_exhausted' },
      '',
      '',
    ],
  ];
  it.each(cases)('%s (ko)', (_n, ev, ko) => expect(describeDue(ev, 'ko')).toBe(ko));
  it.each(cases)('%s (en)', (_n, ev, _ko, en) => expect(describeDue(ev, 'en')).toBe(en));

  it('uses plural grammar for plural English labels', () => {
    const ev: DueEvent = { ...base, kind: 'check_in', label: 'mushrooms', attempt: 1 };
    expect(describeDue(ev, 'en')).toBe('Could you check whether the mushrooms are done?');
  });
});

describe('describeRejection', () => {
  const two = [
    { id: '1', label: '파스타' },
    { id: '2', label: '버섯' },
  ];
  it('asks which one for two candidates', () => {
    expect(describeRejection('ambiguous_target', two, 'ko')).toBe('파스타랑 버섯 중 어느 쪽이요?');
    expect(describeRejection('ambiguous_target', [two[1]!, two[0]!], 'ko')).toBe('버섯이랑 파스타 중 어느 쪽이요?');
    expect(
      describeRejection('ambiguous_target', [{ id: '1', label: 'pasta' }, { id: '2', label: 'mushrooms' }], 'en'),
    ).toBe('Which one: pasta or mushrooms?');
  });
  it('lists three candidates', () => {
    const three = [...two, { id: '3', label: '두부' }];
    expect(describeRejection('ambiguous_target', three, 'ko')).toBe('파스타, 버섯, 두부 중 어느 쪽이요?');
    expect(describeRejection('ambiguous_target', [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }, { id: 'c', label: 'c' }], 'en')).toBe(
      'Which one: a, b, or c?',
    );
  });
  it('handles missing candidates', () => {
    expect(describeRejection('ambiguous_target', undefined, 'en')).toBe('Which one do you mean?');
  });
  it.each(['stale_revision', 'not_found', 'invalid_state', 'invalid_value'] as const)('%s has text in both languages', (r) => {
    expect(describeRejection(r, undefined, 'ko')).not.toBe('');
    expect(describeRejection(r, undefined, 'en')).not.toBe('');
  });
});
