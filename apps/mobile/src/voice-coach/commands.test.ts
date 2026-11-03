import { describe, expect, it } from 'vitest';

import { parseCoachCommand } from './commands';

const kind = (s: string) => parseCoachCommand(s)?.kind ?? null;

describe('parseCoachCommand', () => {
  it('parses English commands', () => {
    expect(kind('start take')).toBe('start_take');
    expect(kind('Start a new take.')).toBe('start_take');
    expect(kind('record')).toBe('start_take');
    expect(kind('stop')).toBe('stop_take');
    expect(kind('stop the recording')).toBe('stop_take');
    expect(kind('play it back')).toBe('play_back');
    expect(kind('Play that back!')).toBe('play_back');
    expect(kind('same block again')).toBe('same_block_again');
    expect(kind('one more time')).toBe('same_block_again');
  });

  it('parses Korean commands', () => {
    expect(kind('녹음 시작')).toBe('start_take');
    expect(kind('녹음 시작해줘')).toBe('start_take');
    expect(kind('녹음 중지')).toBe('stop_take');
    expect(kind('그만')).toBe('stop_take');
    expect(kind('다시 들려줘')).toBe('play_back');
    expect(kind('방금 거 들려줘')).toBe('play_back');
    expect(kind('같은 블록 다시')).toBe('same_block_again');
    expect(kind('한 번 더 해줘')).toBe('same_block_again');
  });

  it('extracts take notes with the note text intact', () => {
    expect(parseCoachCommand('이 테이크 메모: 두 번째 구절 박자 놓침')).toEqual({ kind: 'take_note', text: '두 번째 구절 박자 놓침' });
    expect(parseCoachCommand('메모: 호흡이 짧음')).toEqual({ kind: 'take_note', text: '호흡이 짧음' });
    expect(parseCoachCommand('note: Second phrase was flat')).toEqual({ kind: 'take_note', text: 'Second phrase was flat' });
    expect(parseCoachCommand('take note: rushed the ending')).toEqual({ kind: 'take_note', text: 'rushed the ending' });
  });

  it('returns null for everything else so the shared parser can try', () => {
    expect(parseCoachCommand('set a timer for five minutes')).toBeNull();
    expect(parseCoachCommand('타이머 5분')).toBeNull();
    expect(parseCoachCommand('')).toBeNull();
    expect(parseCoachCommand('how was my pitch')).toBeNull();
  });
});
