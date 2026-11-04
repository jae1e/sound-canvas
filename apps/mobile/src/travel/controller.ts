import {
  composeGpsWeak,
  composeLandmarkFollowup,
  composeLandmarkList,
  composeLandmarkNarration,
  composeNearbyAnswer,
  estimateSpeechSeconds,
  resolveLandmarkRef,
  composeProgressAnswer,
  composeRoutePreview,
  composeWhereAnswer,
  createRouteTracker,
  initialCueState,
  parseTravelIntent,
  planCues,
  routeCueFragments,
  resolvePlaceRef,
  turnPhrase,
  formatDistance,
  type CueState,
  type GpsFix,
  type Landmark,
  type LandmarkDetail,
  type Lang,
  type Place,
  type Progress,
  type RouteTracker,
  type TravelIntent,
  type WalkRoute,
  type WhereAmI,
} from '@vlc/travel';
import { earconForNavCue, looksLikeQuestion, navStaleAfterMs, type EarconName } from '@vlc/session-engine';
import { askLlm, isLlmAvailable } from '../llm/askLlm';

import type { TravelClient } from './client';

/**
 * Speaks one piece of text. It may return a promise that settles when playback ends; without one, the controller paces
 * narration chunks by estimated speaking time.
 */
export type SpeakFn = (text: string, lang: Lang, extras?: SpeakExtras) => void | Promise<unknown>;

/** How a cue behaves when the session voice cannot start it at once (see `planCue` in @vlc/session-engine). */
export type SpeakExtras = {
  /** Cached fragments that make up the text (distance + direction). */
  parts?: string[];
  /** Tone to play first. */
  earcon?: EarconName | null;
  /** Epoch ms after which the cue is no longer true. */
  staleAtMs?: number;
};

export type PrewarmItem = { text: string; lang: Lang; order?: number; priority?: 'urgent' | 'soon' | 'normal' | 'background' };

export type ControllerOptions = {
  /** Flushes queued and current speech (the native `stopSpeaking`). Called when narration is stopped or interrupted. */
  onStopSpeech?: () => void;
  /** Called the moment spoken text becomes known (route fetched, landmark list received), to synthesize it in advance. */
  onPrewarm?: (items: PrewarmItem[]) => void;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
};

/** A landmark as a navigable place, so the existing "take me there" flow works unchanged. */
export function landmarkToPlace(l: Landmark): Place {
  return {
    id: l.id,
    name: l.name,
    category: l.category,
    distanceM: l.distanceM,
    lat: l.lat,
    lng: l.lng,
    address: '',
    source: l.source === 'kakao' ? 'kakao' : l.source === 'tourapi' ? 'tourapi' : 'mock',
  };
}

export type NarrationState = { landmarkId: string; detail: LandmarkDetail };

export type TravelState = {
  position: GpsFix | null;
  places: Place[];
  lastQuery: { category?: string; query?: string } | null;
  destination: Place | null;
  route: WalkRoute | null;
  navigating: boolean;
  progress: Progress | null;
  where: WhereAmI | null;
  busy: boolean;
  /** Error key; the UI maps it to a localized string. */
  error: 'network' | 'no_position' | 'no_route' | null;
  /** Last landmark list (the ones spoken, in order), the selected one, and the text being narrated. */
  landmarks: Landmark[];
  landmarkSearched: boolean;
  selectedLandmark: Landmark | null;
  narration: NarrationState | null;
  /** True while narration chunks are being sent; "stop" cancels the remaining ones. */
  narrating: boolean;
  /** Set when an off-route cue asked for confirmation to reroute. */
  awaitingReroute: boolean;
  lastSpoken: string | null;
};

const YES = /^(응|네|예|그래|좋아|어|yes|yeah|yep|ok|okay|sure)\b/i;
const NO = /^(아니|아니요|싫어|괜찮아|no|nope|nah)\b/i;

/**
 * Framework-free controller for the Travel Guide. It never plays audio: everything spoken goes
 * through `onSpeak(text, lang)`. A session engine can call `handleUtterance` with final transcripts.
 */
export class TravelController {
  private state: TravelState = {
    position: null,
    places: [],
    lastQuery: null,
    destination: null,
    route: null,
    navigating: false,
    progress: null,
    where: null,
    busy: false,
    error: null,
    landmarks: [],
    landmarkSearched: false,
    selectedLandmark: null,
    narration: null,
    narrating: false,
    awaitingReroute: false,
    lastSpoken: null,
  };
  private narrationToken = 0;
  private narrationRun: Promise<void> = Promise.resolve();
  private lastLandmark: Landmark | undefined;
  private usedSentences: string[] = [];
  private readonly sleep: (ms: number) => Promise<void>;
  private listeners = new Set<() => void>();
  private tracker: RouteTracker | null = null;
  private cueState: CueState = initialCueState();
  private lastMentioned: Place | undefined;
  lang: Lang;

  constructor(
    private readonly client: TravelClient,
    private readonly onSpeak: SpeakFn,
    lang: Lang = 'ko',
    private readonly now: () => number = Date.now,
    private readonly opts: ControllerOptions = {},
  ) {
    this.lang = lang;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** The on-screen stop button. Same effect as saying "stop". */
  stopNarration = (): void => {
    this.cancelNarration();
  };

  /** Resolves when the current narration (if any) has finished or been cancelled. For tests and callers that must wait. */
  idle = (): Promise<void> => this.narrationRun;

  getState = (): TravelState => this.state;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private set(patch: Partial<TravelState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  /** Speak a single reply. Anything being narrated is cancelled first so the two never overlap. */
  private speak(text: string, lang: Lang = this.lang, extras?: SpeakExtras) {
    this.cancelNarration();
    this.set({ lastSpoken: text });
    void this.onSpeak(text, lang, extras);
  }

  /** Cancels remaining narration chunks and flushes queued speech. Safe to call when nothing is playing. */
  private cancelNarration(): boolean {
    this.narrationToken++;
    if (!this.state.narrating) return false;
    this.set({ narrating: false });
    this.opts.onStopSpeech?.();
    return true;
  }

  /**
   * Sends chunks one at a time without blocking the caller, so a "stop" utterance can arrive between chunks.
   * Waits for each chunk to finish (the SpeakFn's promise, else the estimated speaking time) before sending the next.
   */
  private playChunks(chunks: string[], lang: Lang = this.lang): void {
    this.cancelNarration();
    const token = this.narrationToken;
    this.set({ narrating: true, lastSpoken: chunks.join(' ') });
    // Later sentences synthesize while the first plays; the first sentence goes first.
    this.opts.onPrewarm?.(chunks.map((text, order) => ({ text, lang, order, priority: 'soon' as const })));
    this.narrationRun = (async () => {
      for (const chunk of chunks) {
        if (token !== this.narrationToken) return;
        let pending: unknown;
        try {
          pending = this.onSpeak(chunk, lang);
        } catch {
          pending = undefined;
        }
        if (pending && typeof (pending as Promise<unknown>).then === 'function') {
          await (pending as Promise<unknown>).catch(() => undefined);
        } else {
          await this.sleep(Math.round(estimateSpeechSeconds(chunk, lang) * 1000) + 250);
        }
      }
      if (token === this.narrationToken) this.set({ narrating: false });
    })();
  }

  /** Feed GPS fixes (about 1 Hz). Drives navigation when active. */
  setFix(fix: GpsFix) {
    this.set({ position: fix });
    if (!this.state.navigating || !this.tracker) return;
    const progress = this.tracker.update(fix, this.now());
    const planned = planCues(progress, this.tracker, this.cueState, this.now());
    this.cueState = planned.state;
    const patch: Partial<TravelState> = { progress };
    for (const cue of planned.cues) {
      const staleKind = cue.kind === 'approach' ? 'approach' : cue.kind === 'now' ? 'now' : 'other';
      this.speak(cue.text[this.lang], this.lang, {
        parts: cue.parts?.[this.lang],
        earcon: earconForNavCue(cue.kind, cue.turn),
        staleAtMs: navStaleAfterMs(this.now(), cue.distanceM ?? null, progress.paceMps, staleKind),
      });
      if (cue.kind === 'off_route') patch.awaitingReroute = true;
      if (cue.kind === 'arrived') {
        patch.navigating = false;
        patch.awaitingReroute = false;
      }
    }
    if (progress.status === 'on_route') patch.awaitingReroute = false;
    this.set(patch);
  }

  private requirePosition(): GpsFix | null {
    const p = this.state.position;
    if (!p) {
      this.set({ error: 'no_position' });
      return null;
    }
    return p;
  }

  async search(opts: { category?: string; query?: string; radiusM?: number }, speak = false): Promise<Place[]> {
    const pos = this.requirePosition();
    if (!pos) return [];
    this.set({ busy: true, error: null });
    try {
      const radiusM = opts.radiusM ?? 600;
      const places = await this.client.searchPlaces({ lat: pos.lat, lng: pos.lng, radiusM, limit: 8, ...opts });
      const answer = composeNearbyAnswer(places, { lang: this.lang, category: opts.category, radiusM });
      this.lastMentioned = answer.places[0];
      this.spokenList = answer.places;
      this.set({ places, lastQuery: { category: opts.category, query: opts.query }, busy: false });
      if (speak) this.speak(answer.text);
      return places;
    } catch {
      this.set({ busy: false, error: 'network' });
      return [];
    }
  }
  /** Places in the order they were last spoken, for "the second one". */
  private spokenList: Place[] = [];

  async whereAmI(speak = false): Promise<WhereAmI | null> {
    const pos = this.requirePosition();
    if (!pos) return null;
    this.set({ busy: true, error: null });
    try {
      const where = await this.client.where(pos);
      this.set({ where, busy: false });
      if (speak) this.speak(composeWhereAnswer(where, this.lang, pos.accuracyM));
      return where;
    } catch {
      this.set({ busy: false, error: 'network' });
      if (speak) this.speak(composeGpsWeak(this.lang, pos.accuracyM));
      return null;
    }
  }

  /** Fetch a route and show the preview. Does not start guidance. */
  async preview(place: Place, speak = false): Promise<WalkRoute | null> {
    const pos = this.requirePosition();
    if (!pos) return null;
    this.set({ busy: true, error: null, destination: place });
    try {
      const route = await this.client.walkRoute({ from: pos, to: place });
      this.set({ route, busy: false, navigating: false, progress: null });
      // Route known: every turn instruction and approach cue can be synthesized now, as cached fragments.
      this.opts.onPrewarm?.([
        ...routeCueFragments(route, this.lang).map((text) => ({ text, lang: this.lang, priority: 'soon' as const })),
        { text: composeRoutePreview(route, place.name, this.lang), lang: this.lang, priority: 'normal' as const },
      ]);
      if (speak) this.speak(composeRoutePreview(route, place.name, this.lang));
      return route;
    } catch {
      this.set({ busy: false, error: 'no_route' });
      return null;
    }
  }

  start() {
    const route = this.state.route;
    if (!route) return;
    this.tracker = createRouteTracker(route);
    this.cueState = initialCueState();
    this.set({ navigating: true, progress: this.tracker.current(), awaitingReroute: false });
    this.speak(this.lang === 'ko' ? `${this.state.destination?.name ?? '목적지'}까지 안내를 시작해요.` : `Starting guidance to ${this.state.destination?.name ?? 'your destination'}.`);
    const first = route.steps.find((s) => s.turn !== 'start');
    if (first && first.distanceToNextM !== undefined) {
      const lead = route.steps[0];
      if (lead) {
        const d = formatDistance(lead.distanceToNextM, this.lang);
        const next = turnPhrase(first.turn, this.lang);
        this.speak(this.lang === 'ko' ? `${d} 직진 후 ${next}` : `Go straight for ${d}, then ${next}`);
      }
    }
  }

  stop(speak = true) {
    this.tracker = null;
    this.set({ navigating: false, progress: null, awaitingReroute: false });
    if (speak) this.speak(this.lang === 'ko' ? '안내를 종료했어요.' : 'Guidance stopped.');
  }

  async reroute() {
    const dest = this.state.destination;
    if (!dest) return;
    const route = await this.preview(dest);
    if (route) {
      this.start();
    }
  }

  /**
   * Handle a final transcript. Returns true when it was a travel utterance (and was acted on).
   * Navigation steps that need confirmation use `preview` first and then ask; "yes" starts them.
   */
  async handleUtterance(text: string): Promise<boolean> {
    const t = text.trim();
    if (this.state.awaitingReroute && YES.test(t)) {
      await this.reroute();
      return true;
    }
    if (this.state.awaitingReroute && NO.test(t)) {
      this.set({ awaitingReroute: false });
      return true;
    }
    if (this.pendingStart && YES.test(t)) {
      this.pendingStart = false;
      this.start();
      return true;
    }
    const intent = parseTravelIntent(t);
    if (!intent) return this.askAboutLandmark(t);
    // A bare "stop" or "more" is only ours while a landmark conversation exists; otherwise let other handlers have it.
    if (intent.type === 'stop_narration' && !this.state.narrating) return false;
    if (intent.type === 'landmark_followup' && !intent.ref && !this.lastLandmark) return false;
    const handled = await this.run(intent);
    if (handled) this.lang = intent.lang;
    return handled;
  }
  private pendingStart = false;

  /** "근처에 역사적인 곳 추천해줘": nearest 2-3 landmarks, spoken with distance and a line each. */
  async findLandmarks(opts: { radiusM?: number } = {}, speak = false): Promise<Landmark[]> {
    const pos = this.requirePosition();
    if (!pos) {
      if (speak) this.speak(composeGpsWeak(this.lang, null));
      return [];
    }
    this.set({ busy: true, error: null });
    try {
      const radiusM = opts.radiusM ?? 1500;
      const found = await this.client.nearbyLandmarks({ lat: pos.lat, lng: pos.lng, radiusM, lang: this.lang, limit: 3, theme: 'historic' });
      const answer = composeLandmarkList(found, this.lang, { radiusM });
      this.spokenList = answer.landmarks.map(landmarkToPlace);
      this.lastMentioned = this.spokenList[0];
      this.lastLandmark = answer.landmarks[0];
      this.usedSentences = [];
      this.set({ landmarks: answer.landmarks, landmarkSearched: true, selectedLandmark: null, narration: null, busy: false });
      this.opts.onPrewarm?.(answer.chunks.map((text, order) => ({ text, lang: this.lang, order, priority: 'soon' as const })));
      if (speak) this.playChunks(answer.chunks);
      return answer.landmarks;
    } catch {
      this.set({ busy: false, error: 'network' });
      if (speak) this.speak(this.lang === 'ko' ? '지금은 역사 명소 정보를 가져오지 못했어요.' : 'I could not load landmark information right now.');
      return [];
    }
  }

  private async loadDetail(l: Landmark): Promise<LandmarkDetail | null> {
    const cur = this.state.narration;
    if (cur && cur.landmarkId === l.id && cur.detail.lang === this.lang) return cur.detail;
    this.set({ busy: true, error: null });
    try {
      const detail = await this.client.landmarkDetail({ id: l.id, lang: this.lang, name: l.name });
      this.usedSentences = [];
      this.set({ busy: false, narration: { landmarkId: l.id, detail } });
      return detail;
    } catch {
      this.set({ busy: false, error: 'network' });
      this.speak(this.lang === 'ko' ? '지금은 설명을 가져오지 못했어요.' : 'I could not load the description right now.');
      return null;
    }
  }

  private select(l: Landmark) {
    this.lastLandmark = l;
    this.lastMentioned = landmarkToPlace(l);
    this.set({ selectedLandmark: l });
  }

  /** "두 번째 거 알려줘": a 30-60 s explanation built only from the provider text, ending with the source. */
  async describe(l: Landmark, speak = false): Promise<void> {
    this.cancelNarration();
    this.select(l);
    const detail = await this.loadDetail(l);
    if (!detail) return;
    const script = composeLandmarkNarration(l.name, detail, this.lang);
    this.usedSentences = script.used;
    if (speak) this.playChunks(script.chunks);
  }

  /**
   * A question about the landmark being discussed that the grammar does not cover ("그때 왕은 누구였어요?"). The `travel_qa`
   * task answers from the loaded source text only; on any failure the utterance stays unhandled and falls through.
   */
  private async askAboutLandmark(text: string): Promise<boolean> {
    const l = this.lastLandmark;
    const lang: Lang = /[가-힣]/.test(text) ? 'ko' : 'en';
    if (!l || !isLlmAvailable() || !looksLikeQuestion(text, lang)) return false;
    const detail = await this.loadDetail(l);
    if (!detail) return true;
    const sourceText = [detail.overview, ...detail.facts.map((f) => f.value)].join(' ').slice(0, 6000);
    const res = await askLlm({ hypotheses: [text], lang, kind: 'travel_qa', travel: { landmarkName: l.name, sourceText }, recentTurns: [] });
    if (!res.ok || res.task !== 'travel_qa') return false;
    this.speak(res.reply, lang);
    return true;
  }

  private async followup(topic: Parameters<typeof composeLandmarkFollowup>[2], ref: Parameters<typeof resolveLandmarkRef>[0] | undefined): Promise<boolean> {
    const l = ref ? resolveLandmarkRef(ref, this.state.landmarks, this.lastLandmark) : this.lastLandmark;
    if (!l) {
      this.speak(this.lang === 'ko' ? '어느 곳을 말하는지 모르겠어요. 먼저 근처 역사 명소를 물어봐 주세요.' : 'I am not sure which place you mean. Ask for historic landmarks nearby first.');
      return true;
    }
    if (this.lastLandmark?.id !== l.id) this.usedSentences = [];
    this.select(l);
    const detail = await this.loadDetail(l);
    if (!detail) return true;
    const ans = composeLandmarkFollowup(l.name, detail, topic, this.lang, this.usedSentences);
    this.usedSentences = [...this.usedSentences, ...ans.used];
    this.playChunks(ans.chunks);
    return true;
  }

  private async run(intent: TravelIntent): Promise<boolean> {
    switch (intent.type) {
      case 'stop_narration':
        this.cancelNarration();
        return true;
      case 'landmarks_nearby':
        await this.findLandmarks({ radiusM: intent.radiusM }, true);
        return true;
      case 'landmark_info': {
        const l = resolveLandmarkRef(intent.ref, this.state.landmarks, this.lastLandmark);
        if (!l) {
          // A name or noun that matches nothing we listed is not ours (it may be a general question).
          if (intent.ref.kind === 'keyword') return false;
          this.lang = intent.lang;
          this.speak(intent.lang === 'ko' ? '어느 곳을 말하는지 모르겠어요. 먼저 근처 역사 명소를 물어봐 주세요.' : 'I am not sure which place you mean. Ask for historic landmarks nearby first.', intent.lang);
          return true;
        }
        this.lang = intent.lang;
        await this.describe(l, true);
        return true;
      }
      case 'landmark_followup':
        this.lang = intent.lang;
        return this.followup(intent.topic, intent.ref);
      default:
        this.lang = intent.lang;
        await this.runClassic(intent);
        return true;
    }
  }

  private async runClassic(intent: TravelIntent) {
    switch (intent.type) {
      case 'nearby':
        await this.search({ category: intent.category, query: intent.query, radiusM: intent.radiusM }, true);
        break;
      case 'where_am_i':
        await this.whereAmI(true);
        break;
      case 'how_far': {
        const p = this.state.progress;
        if (!this.state.navigating || !p) {
          this.speak(this.lang === 'ko' ? '지금은 안내 중이 아니에요.' : 'Guidance is not active.');
        } else this.speak(composeProgressAnswer(p, this.lang));
        break;
      }
      case 'next_turn': {
        const p = this.state.progress;
        const route = this.state.route;
        const step = p && route && p.nextStepIndex !== null ? route.steps[p.nextStepIndex] : undefined;
        if (!this.state.navigating || !step || !p) {
          this.speak(this.lang === 'ko' ? '지금은 안내 중이 아니에요.' : 'Guidance is not active.');
        } else {
          const d = formatDistance(p.distanceToNextManeuverM, this.lang);
          this.speak(this.lang === 'ko' ? `${d} 앞에서 ${turnPhrase(step.turn, 'ko')}` : `In ${d}, ${turnPhrase(step.turn, 'en')}`);
        }
        break;
      }
      case 'stop_navigation':
        if (this.state.navigating) this.stop();
        else this.speak(this.lang === 'ko' ? '진행 중인 안내가 없어요.' : 'There is no active guidance.');
        break;
      case 'navigate_to': {
        let place = resolvePlaceRef(intent.ref, this.spokenList, this.lastMentioned);
        if (!place && intent.ref.kind === 'nearest') {
          const found = await this.search({ category: intent.ref.category }, false);
          place = found[0];
        }
        if (!place) {
          this.speak(this.lang === 'ko' ? '어느 장소로 갈지 알려주세요. 먼저 근처를 검색해 볼까요?' : 'Which place do you mean? Try asking what is nearby first.');
          break;
        }
        const route = await this.preview(place, true);
        if (route) this.pendingStart = true;
        break;
      }
    }
  }
}
