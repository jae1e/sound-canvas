import {
  composeGpsWeak,
  composeNearbyAnswer,
  composeProgressAnswer,
  composeRoutePreview,
  composeWhereAnswer,
  createRouteTracker,
  initialCueState,
  parseTravelIntent,
  planCues,
  resolvePlaceRef,
  turnPhrase,
  formatDistance,
  type CueState,
  type GpsFix,
  type Lang,
  type Place,
  type Progress,
  type RouteTracker,
  type TravelIntent,
  type WalkRoute,
  type WhereAmI,
} from '@vlc/travel';
import type { TravelClient } from './client';

export type SpeakFn = (text: string, lang: Lang) => void;

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
    awaitingReroute: false,
    lastSpoken: null,
  };
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
  ) {
    this.lang = lang;
  }

  getState = (): TravelState => this.state;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private set(patch: Partial<TravelState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  private speak(text: string, lang: Lang = this.lang) {
    this.set({ lastSpoken: text });
    this.onSpeak(text, lang);
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
      this.speak(cue.text[this.lang]);
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
    if (!intent) return false;
    this.lang = intent.lang;
    await this.run(intent);
    return true;
  }
  private pendingStart = false;

  private async run(intent: TravelIntent) {
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
