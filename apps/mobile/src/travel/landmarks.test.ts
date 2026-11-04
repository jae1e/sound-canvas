import { describe, expect, it, vi } from 'vitest';

import { TravelController } from './controller';
import { MockTravelClient } from './mock';
import { GWANGHWAMUN } from './landmarkFixtures';

const fix = { lat: GWANGHWAMUN.lat, lng: GWANGHWAMUN.lng, accuracyM: 5, timestampMs: 1 };

function setup(lang: 'ko' | 'en' = 'ko') {
  const spoken: string[] = [];
  const stops = vi.fn();
  // Each chunk waits for a manual release so tests can say "stop" between chunks.
  let release: (() => void) | null = null;
  const gate = () => new Promise<void>((r) => (release = r));
  const ctl = new TravelController(new MockTravelClient(), (t) => void spoken.push(t), lang, Date.now, { onStopSpeech: stops, sleep: gate });
  ctl.setFix(fix);
  const next = async () => {
    // Let the narration loop reach its next wait, then release it.
    await new Promise((r) => setTimeout(r, 0));
    const r = release;
    release = null;
    r?.();
    await new Promise((r2) => setTimeout(r2, 0));
  };
  return { ctl, spoken, stops, next };
}

describe('landmark voice flow (fixtures)', () => {
  it('lists the top 3 landmarks with distance and one line (ko)', async () => {
    const { ctl, spoken } = setup();
    expect(await ctl.handleUtterance('근처에 역사적인 곳 추천해줘')).toBe(true);
    const s = ctl.getState();
    expect(s.landmarks).toHaveLength(3);
    expect(s.landmarks[0]!.distanceM).toBeLessThanOrEqual(s.landmarks[1]!.distanceM);
    expect(s.landmarks.every((l) => l.attribution && l.source === 'fixture')).toBe(true);
    expect(spoken[0]).toBe('근처 역사 명소 3곳이에요.');
    expect(s.narrating).toBe(true);
    ctl['narrationToken']++; // end the paced loop; the chunks are checked below
    expect(s.lastSpoken).toContain('첫 번째');
    expect(s.lastSpoken).toContain('미터 거리예요');
    expect(s.lastSpoken).toContain('샘플 데이터');
  });

  it('speaks list chunks one by one and finishes', async () => {
    const { ctl, spoken, next } = setup('en');
    await ctl.handleUtterance('any historic landmarks around here?');
    expect(spoken).toHaveLength(1);
    for (let i = 0; i < 6; i++) await next();
    await ctl.idle();
    expect(spoken).toHaveLength(5); // heading, three landmarks, source line
    expect(spoken[1]).toMatch(/^First, .+ meters away\./);
    expect(ctl.getState().narrating).toBe(false);
  });

  it('describes the second one, answers follow-ups from the same text, and "more"', async () => {
    const { ctl, spoken, next } = setup();
    await ctl.handleUtterance('주변 유적지');
    const second = ctl.getState().landmarks[1]!;
    await ctl.handleUtterance('두 번째 거 알려줘');
    expect(ctl.getState().selectedLandmark?.id).toBe(second.id);
    expect(ctl.getState().narration?.detail.overview).toBeTruthy();
    for (let i = 0; i < 12; i++) await next();
    await ctl.idle();
    const narration = spoken.join(' ');
    expect(narration).toContain(`${second.name}에 대해 알려 드릴게요.`);
    expect(narration).toContain('앱에 들어 있는 샘플 설명이에요.');
    const before = spoken.length;
    await ctl.handleUtterance('언제 지어졌어?');
    for (let i = 0; i < 6; i++) await next();
    await ctl.idle();
    expect(spoken.slice(before).join(' ')).toMatch(/\d{4}년|세기|조선|시대|지었|지어/);
    const afterPeriod = spoken.length;
    await ctl.handleUtterance('더 알려줘');
    for (let i = 0; i < 6; i++) await next();
    await ctl.idle();
    expect(spoken.length).toBeGreaterThan(afterPeriod);
  });

  it('english: tell me about the second one', async () => {
    const { ctl, spoken, next } = setup('en');
    await ctl.handleUtterance('any historic landmarks around here?');
    await ctl.handleUtterance('tell me about the second one');
    const name = ctl.getState().landmarks[1]!.name;
    for (let i = 0; i < 12; i++) await next();
    await ctl.idle();
    expect(spoken.join(' ')).toContain(`Here is what I have on ${name}.`);
    expect(spoken.at(-1)).toBe('This is sample text bundled with the app.');
  });

  it('stop between chunks cancels the rest and flushes speech', async () => {
    const { ctl, spoken, stops, next } = setup();
    await ctl.handleUtterance('근처 유적지 알려줘');
    await next();
    await next();
    const soFar = spoken.length;
    expect(soFar).toBeGreaterThan(0);
    expect(await ctl.handleUtterance('멈춰')).toBe(true);
    expect(stops).toHaveBeenCalledTimes(1);
    await next();
    await ctl.idle();
    expect(spoken.length).toBe(soFar);
    expect(ctl.getState().narrating).toBe(false);
    // With nothing playing, "stop" is not ours.
    expect(await ctl.handleUtterance('stop')).toBe(false);
  });

  it('"거기로 가자" after a description starts the existing walking flow for that landmark', async () => {
    const { ctl } = setup();
    await ctl.handleUtterance('근처 유적지');
    const first = ctl.getState().landmarks[0]!;
    await ctl.handleUtterance('첫 번째 알려줘');
    await ctl.handleUtterance('거기로 가자');
    const s = ctl.getState();
    expect(s.destination?.id).toBe(first.id);
    expect(s.route).not.toBeNull();
    expect(s.narrating).toBe(false);
  });

  it('does not take unrelated utterances', async () => {
    const { ctl } = setup();
    expect(await ctl.handleUtterance('날씨 알려줘')).toBe(false);
    expect(await ctl.handleUtterance('더 알려줘')).toBe(false); // no landmark conversation yet
    expect(await ctl.handleUtterance('경복궁 알려줘')).toBe(false); // nothing listed yet
  });

  it('matches a landmark by name or noun after a list', async () => {
    const { ctl } = setup();
    await ctl.handleUtterance('근처 유적지');
    const names = ctl.getState().landmarks.map((l) => l.name);
    const palace = names.find((n) => n.includes('궁'))!;
    expect(await ctl.handleUtterance(`${palace} 알려줘`)).toBe(true);
    expect(ctl.getState().selectedLandmark?.name).toBe(palace);
  });

  it('says so without GPS', async () => {
    const spoken: string[] = [];
    const ctl = new TravelController(new MockTravelClient(), (t) => void spoken.push(t), 'ko');
    await ctl.handleUtterance('근처 유적지');
    expect(spoken[0]).toContain('GPS');
  });

  it('shifts fixtures around a far-away caller', async () => {
    const list = await new MockTravelClient().nearbyLandmarks({ lat: 35.1, lng: 129.0, lang: 'ko', radiusM: 1500 });
    expect(list.length).toBe(3);
    expect(list[0]!.distanceM).toBeLessThan(1500);
  });
});
