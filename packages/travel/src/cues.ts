import type { Progress, RouteTracker } from "./tracker";
import type { Lang, TurnType } from "./types";
import { capitalize, formatDistance, turnPhrase } from "./text";

export type CueKind = "approach" | "now" | "off_route" | "arrived" | "gps_uncertain";

export interface Cue {
  /** Stable dedup key. */
  id: string;
  kind: CueKind;
  stepIndex: number | null;
  turn: TurnType | null;
  text: Record<Lang, string>;
}

export interface CueOptions {
  /** Minimum gap between ordinary turn cues. */
  minGapMs: number;
  /** Repeat interval for the off-route cue, and its maximum count per route. */
  offRouteRepeatMs: number;
  offRouteMaxCues: number;
  /** Seconds of ignored fixes before a "GPS is weak" cue, and its repeat interval. */
  uncertainAfterMs: number;
  uncertainRepeatMs: number;
}

export const DEFAULT_CUE_OPTIONS: CueOptions = {
  minGapMs: 3000,
  offRouteRepeatMs: 30000,
  offRouteMaxCues: 3,
  uncertainAfterMs: 10000,
  uncertainRepeatMs: 60000,
};

export interface CueState {
  fired: readonly string[];
  lastCueMs: number | null;
  offRouteCues: number;
  lastOffRouteCueMs: number | null;
  uncertainSinceMs: number | null;
  lastUncertainCueMs: number | null;
}

export const initialCueState = (): CueState => ({
  fired: [],
  lastCueMs: null,
  offRouteCues: 0,
  lastOffRouteCueMs: null,
  uncertainSinceMs: null,
  lastUncertainCueMs: null,
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Approach distance scales with pace: about 38 s of walking, between 40 and 80 m. */
export const approachDistanceM = (paceMps: number) => clamp(Math.round((paceMps * 38) / 10) * 10, 40, 80);
/** "Now" distance: about 6 s of walking, between 8 and 15 m. */
export const nowDistanceM = (paceMps: number) => clamp(Math.round(paceMps * 6), 8, 15);

function turnCueText(kind: "approach" | "now", turn: TurnType, providerKo: string, distM: number): Record<Lang, string> {
  const ko = turn === "other" && providerKo ? providerKo : turnPhrase(turn, "ko");
  const en = turnPhrase(turn, "en");
  if (kind === "now") {
    return { ko: turn === "arrive" ? ko : `지금 ${ko}`, en: turn === "arrive" ? "You have arrived" : `${capitalize(en)} now` };
  }
  return {
    ko: `${formatDistance(distM, "ko")} 앞에서 ${ko}`,
    en: turn === "arrive" ? `You will arrive in ${formatDistance(distM, "en")}` : `In ${formatDistance(distM, "en")}, ${en}`,
  };
}

/**
 * Decide which spoken cues are due for the latest progress. Pure: returns new state.
 * At most one ordinary turn cue is returned per call; cues are never repeated for the same step.
 */
export function planCues(
  progress: Progress,
  tracker: Pick<RouteTracker, "route" | "stepAlongM">,
  state: CueState,
  nowMs: number,
  overrides: Partial<CueOptions> = {},
): { cues: Cue[]; state: CueState } {
  const opt = { ...DEFAULT_CUE_OPTIONS, ...overrides };
  const fired = new Set(state.fired);
  let next: CueState = { ...state };
  const cues: Cue[] = [];
  const emit = (cue: Cue) => {
    cues.push(cue);
    fired.add(cue.id);
    next = { ...next, fired: [...fired], lastCueMs: nowMs };
  };

  // GPS uncertainty: only after a sustained stretch of unusable fixes.
  if (progress.ignored) {
    const since = next.uncertainSinceMs ?? nowMs;
    next = { ...next, uncertainSinceMs: since };
    const due = nowMs - since >= opt.uncertainAfterMs;
    const repeatOk = next.lastUncertainCueMs === null || nowMs - next.lastUncertainCueMs >= opt.uncertainRepeatMs;
    if (due && repeatOk) {
      cues.push({
        id: `gps:${nowMs}`,
        kind: "gps_uncertain",
        stepIndex: null,
        turn: null,
        text: { ko: "GPS 신호가 약해요. 안내가 정확하지 않을 수 있어요.", en: "GPS signal is weak. Guidance may be inaccurate." },
      });
      next = { ...next, lastUncertainCueMs: nowMs };
    }
    return { cues, state: next };
  }
  next = { ...next, uncertainSinceMs: null };
  if (progress.noFixYet) return { cues, state: next };

  if (progress.status === "arrived") {
    if (!fired.has("arrived")) {
      emit({
        id: "arrived",
        kind: "arrived",
        stepIndex: null,
        turn: "arrive",
        text: { ko: "목적지에 도착했어요.", en: "You have arrived." },
      });
    }
    return { cues, state: next };
  }

  if (progress.status === "off_route") {
    const gapOk = next.lastOffRouteCueMs === null || nowMs - next.lastOffRouteCueMs >= opt.offRouteRepeatMs;
    if (gapOk && next.offRouteCues < opt.offRouteMaxCues) {
      cues.push({
        id: `off:${next.offRouteCues}`,
        kind: "off_route",
        stepIndex: null,
        turn: null,
        text: { ko: "경로에서 벗어났어요. 다시 안내할까요?", en: "You are off the route. Want me to reroute?" },
      });
      next = { ...next, offRouteCues: next.offRouteCues + 1, lastOffRouteCueMs: nowMs, lastCueMs: nowMs };
    }
    return { cues, state: next };
  }

  // Back on route: allow a later excursion to be announced again.
  if (next.offRouteCues > 0) next = { ...next, offRouteCues: 0, lastOffRouteCueMs: null };

  const i = progress.nextStepIndex;
  if (i === null) return { cues, state: next };
  const step = tracker.route.steps[i]!;
  if (step.turn === "straight" || step.turn === "start") return { cues, state: next };
  if (step.turn === "other" && !step.instruction) return { cues, state: next };
  if (next.lastCueMs !== null && nowMs - next.lastCueMs < opt.minGapMs) return { cues, state: next };

  const d = progress.distanceToNextManeuverM;
  const nowM = nowDistanceM(progress.paceMps);
  const approachM = approachDistanceM(progress.paceMps);
  const nowId = `${i}:now`;
  const approachId = `${i}:approach`;
  const prevAlong = i > 0 ? tracker.stepAlongM[i - 1]! : 0;
  const legM = tracker.stepAlongM[i]! - prevAlong;

  if (d <= nowM) {
    if (!fired.has(nowId)) {
      fired.add(approachId); // an approach cue after the "now" cue would be wrong
      emit({ id: nowId, kind: "now", stepIndex: i, turn: step.turn, text: turnCueText("now", step.turn, step.instruction, d) });
    }
  } else if (d <= approachM && !fired.has(approachId) && !fired.has(nowId)) {
    if (legM >= approachM + 20) {
      emit({ id: approachId, kind: "approach", stepIndex: i, turn: step.turn, text: turnCueText("approach", step.turn, step.instruction, d) });
    } else {
      // Leg too short for two cues: keep only the "now" cue.
      fired.add(approachId);
      next = { ...next, fired: [...fired] };
    }
  }
  return { cues, state: next };
}
