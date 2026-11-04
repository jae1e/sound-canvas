import { describe, expect, it } from 'vitest';

import { COMPOSE_GAP_MS, lateSpeechVerdict, navStaleAfterMs, planCue } from './cuePlan';
import { earconForNavCue, EARCON_NAMES, voiceSwitchAnnouncement } from './earcon';
import { fixedPhrases } from './phrases';
import { priorityForDeadline, SynthQueue, synthKey } from './synthQueue';
import { chooseSessionVoice, nextVoiceStep } from './voice';

describe('chooseSessionVoice', () => {
  it('uses Supertonic when ready', () => {
    expect(chooseSessionVoice({ requested: 'auto', modelDownloaded: true, loaded: true }).voice).toBe('supertonic');
    expect(chooseSessionVoice({ requested: 'auto', modelDownloaded: true, loaded: null })).toMatchObject({ voice: 'supertonic', degraded: false });
  });
  it('uses the platform voice for the whole session, with a notice, when Supertonic is unavailable', () => {
    expect(chooseSessionVoice({ requested: 'auto', modelDownloaded: false, loaded: null })).toEqual({ voice: 'platform', degraded: true, reason: 'model_missing' });
    expect(chooseSessionVoice({ requested: 'supertonic', modelDownloaded: true, loaded: false })).toMatchObject({ voice: 'platform', degraded: true, reason: 'load_failed' });
  });
  it('shows no notice when the user asked for the platform voice', () => {
    expect(chooseSessionVoice({ requested: 'platform', modelDownloaded: true, loaded: true })).toMatchObject({ voice: 'platform', degraded: false });
  });
});

describe('nextVoiceStep', () => {
  it('reloads once, then switches', () => {
    expect(nextVoiceStep({ reloadsUsed: 0, spokeInSessionVoice: true })).toEqual({ kind: 'reload' });
    expect(nextVoiceStep({ reloadsUsed: 1, spokeInSessionVoice: true })).toEqual({ kind: 'switch', announce: true });
  });
  it('switches silently when the user never heard the session voice', () => {
    expect(nextVoiceStep({ reloadsUsed: 1, spokeInSessionVoice: false })).toEqual({ kind: 'switch', announce: false });
  });
});

describe('planCue', () => {
  const base = { nowMs: 10_000, voice: 'supertonic' as const, fullCached: false };
  it('drops a stale cue', () => {
    expect(planCue({ ...base, staleAfterMs: 9_000 })).toEqual({ action: 'drop_stale', lateMs: 1_000 });
  });
  it('plays a cached clip before anything else', () => {
    expect(planCue({ ...base, fullCached: true, earcon: 'turn_left', parts: ['a', 'b'], partsCached: true })).toEqual({ action: 'play_clip' });
  });
  it('composes cached fragments', () => {
    expect(planCue({ ...base, parts: ['50미터 앞에서', '우회전하세요'], partsCached: true, earcon: 'turn_right' })).toEqual({
      action: 'compose',
      parts: ['50미터 앞에서', '우회전하세요'],
    });
  });
  it('plays the earcon then speaks when nothing is cached and the voice is Supertonic', () => {
    expect(planCue({ ...base, parts: ['a', 'b'], partsCached: false, earcon: 'warning' })).toEqual({ action: 'earcon_then_speech', earcon: 'warning' });
  });
  it('speaks directly with the platform voice (fast) or when no earcon is given', () => {
    expect(planCue({ ...base, voice: 'platform', earcon: 'warning' })).toEqual({ action: 'speak_now' });
    expect(planCue({ ...base, earcon: null })).toEqual({ action: 'speak_now' });
  });
  it('never returns an action that switches voice', () => {
    for (const voice of ['supertonic', 'platform'] as const) {
      const d = planCue({ ...base, voice, earcon: 'attention' });
      expect(JSON.stringify(d)).not.toMatch(/fallback|platform/);
    }
  });
});

describe('lateSpeechVerdict / navStaleAfterMs', () => {
  it('reports how late and drops stale speech', () => {
    expect(lateSpeechVerdict(12_000, 10_000, 15_000)).toEqual({ speak: true, lateMs: 2_000 });
    expect(lateSpeechVerdict(16_000, 10_000, 15_000)).toEqual({ speak: false, lateMs: 6_000 });
    expect(lateSpeechVerdict(16_000, 10_000)).toEqual({ speak: true, lateMs: 6_000 });
  });
  it('expires an approach cue when the turn has been reached', () => {
    expect(navStaleAfterMs(0, 50, 1.25, 'approach')).toBe(40_000);
    expect(navStaleAfterMs(0, 3, 1.25, 'approach')).toBe(4_000);
    expect(navStaleAfterMs(0, null, 1.25, 'now')).toBe(4_000);
  });
  it('keeps the compose gap short', () => {
    expect(COMPOSE_GAP_MS).toBeLessThan(150);
  });
});

describe('SynthQueue', () => {
  const now = 1_000_000;
  it('orders by priority, then deadline, then order, then arrival', () => {
    const q = new SynthQueue();
    q.enqueue({ text: 'bg', lang: 'ko', priority: 'background' }, now);
    q.enqueue({ text: 'late timer', lang: 'ko', needByMs: now + 300_000 }, now);
    q.enqueue({ text: 'soon timer', lang: 'ko', needByMs: now + 60_000 }, now);
    q.enqueue({ text: 'urgent turn', lang: 'ko', needByMs: now + 5_000 }, now);
    q.enqueue({ text: 'second', lang: 'ko', priority: 'normal', order: 2 }, now);
    q.enqueue({ text: 'first', lang: 'ko', priority: 'normal', order: 1 }, now);
    const out: string[] = [];
    for (let it = q.next(now); it; it = q.next(now)) out.push(it.text);
    expect(out[0]).toBe('urgent turn');
    expect(out[1]).toBe('soon timer');
    expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'));
    expect(out[out.length - 1]).toBe('bg');
  });
  it('dedupes by language and text, and upgrades priority', () => {
    const q = new SynthQueue();
    expect(q.enqueue({ text: 'x', lang: 'ko', priority: 'background' }, now)).toBe('added');
    expect(q.enqueue({ text: ' x ', lang: 'ko', priority: 'background' }, now)).toBe('duplicate');
    expect(q.enqueue({ text: 'x', lang: 'ko', priority: 'urgent' }, now)).toBe('upgraded');
    expect(q.enqueue({ text: 'x', lang: 'en', priority: 'urgent' }, now)).toBe('added');
    expect(q.size).toBe(2);
    expect(synthKey('en-US', 'x')).toBe('en|x');
  });
  it('drops overdue items', () => {
    const q = new SynthQueue();
    q.enqueue({ text: 'passed turn', lang: 'ko', needByMs: now - 1 }, now);
    q.enqueue({ text: 'ok', lang: 'ko' }, now);
    expect(q.next(now)?.text).toBe('ok');
    expect(q.next(now)).toBeNull();
  });
  it('retries a failed item with the same engine, then gives up', () => {
    const q = new SynthQueue(2);
    q.enqueue({ text: 'x', lang: 'ko' }, now);
    const a = q.next(now)!;
    expect(q.complete(a, false)).toBe(true);
    const b = q.next(now)!;
    expect(q.complete(b, false)).toBe(false);
    expect(q.failed()).toEqual(['ko|x']);
    expect(q.next(now)).toBeNull();
  });
  it('skips cached phrases and requeues everything after a voice change', () => {
    const q = new SynthQueue();
    q.enqueue({ text: 'x', lang: 'ko' }, now);
    q.complete(q.next(now)!, true);
    expect(q.enqueue({ text: 'x', lang: 'ko' }, now)).toBe('cached');
    expect(q.resetForNewVoice(now)).toBe(1);
    expect(q.isCached('ko', 'x')).toBe(false);
  });
  it('maps deadlines to priorities', () => {
    expect(priorityForDeadline(now + 5_000, now)).toBe('urgent');
    expect(priorityForDeadline(now + 60_000, now)).toBe('soon');
    expect(priorityForDeadline(now + 600_000, now)).toBe('normal');
    expect(priorityForDeadline(undefined, now)).toBe('normal');
  });
});

describe('earcons and phrases', () => {
  it('uses distinct earcons for left and right', () => {
    expect(earconForNavCue('approach', 'left')).toBe('turn_left');
    expect(earconForNavCue('now', 'sharp_right')).toBe('turn_right');
    expect(earconForNavCue('off_route', null)).toBe('warning');
    expect(earconForNavCue('arrived', 'arrive')).toBe('arrived');
    expect(new Set(EARCON_NAMES).size).toBe(EARCON_NAMES.length);
  });
  it('has ko and en fixed phrases and announcements', () => {
    expect(fixedPhrases('ko').length).toBe(fixedPhrases('en').length);
    expect(voiceSwitchAnnouncement('ko')).toMatch(/목소리/);
    expect(voiceSwitchAnnouncement('en')).toMatch(/voice/);
  });
});
