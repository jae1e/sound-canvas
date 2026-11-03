import { describe, expect, it } from 'vitest';
import { chooseHypothesis } from '../src/hypothesis';

const none = { taskLabels: [], timerLabels: [] };

describe('chooseHypothesis', () => {
  it('prefers the cooking word hypothesis', () => {
    const r = chooseHypothesis(['리조트 5분 타이머', '리조또 5분 타이머'], 'ko', none);
    expect(r).toEqual({ text: '리조또 5분 타이머', index: 1, reason: 'known_label' });
  });
  it('prefers an existing task or timer label', () => {
    const ctx = { taskLabels: ['수프'], timerLabels: [] };
    expect(chooseHypothesis(['소프 3분', '수프 3분'], 'ko', ctx)?.index).toBe(1);
    expect(chooseHypothesis(['whisk 2 minutes', 'risk 2 minutes'], 'en', { taskLabels: ['risk'], timerLabels: [] })?.index).toBe(1);
  });
  it('keeps the top hypothesis when it already matches', () => {
    expect(chooseHypothesis(['pasta 3 minutes', 'pastor 3 minutes'], 'en', none)?.index).toBe(0);
  });
  it('matches English words on word boundaries', () => {
    expect(chooseHypothesis(['tea 3 minutes'], 'en', { taskLabels: ['tea'], timerLabels: [] })?.reason).toBe('known_label');
    expect(chooseHypothesis(['steak is done'], 'en', { taskLabels: ['tea'], timerLabels: [] })?.reason).toBe('known_label'); // steak is a cooking word
    expect(chooseHypothesis(['the team is here'], 'en', { taskLabels: ['tea'], timerLabels: [] })?.reason).toBe('top');
  });
  it('falls back to the first high-confidence parse', () => {
    const r = chooseHypothesis(['hello there', 'two minutes more'], 'en', none);
    expect(r).toEqual({ text: 'two minutes more', index: 1, reason: 'parsed' });
  });
  it('keeps the top hypothesis otherwise, and handles empty input', () => {
    expect(chooseHypothesis(['blah', 'bleh'], 'en', none)).toEqual({ text: 'blah', index: 0, reason: 'top' });
    expect(chooseHypothesis([], 'en', none)).toBeNull();
  });
});
