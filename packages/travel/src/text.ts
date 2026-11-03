import type { Lang, TurnType } from "./types";

export function formatDistance(m: number, lang: Lang): string {
  const d = Math.max(0, m);
  if (d < 1000) {
    const r = Math.max(10, Math.round(d / 10) * 10);
    return lang === "ko" ? `${r}미터` : `${r} meters`;
  }
  const km = Math.round(d / 100) / 10;
  return lang === "ko" ? `${km}킬로미터` : `${km} kilometers`;
}

export function formatDuration(s: number, lang: Lang): string {
  const mins = Math.max(1, Math.round(s / 60));
  const h = Math.floor(mins / 60);
  const mm = mins % 60;
  if (lang === "ko") {
    if (h === 0) return `${mm}분`;
    return mm === 0 ? `${h}시간` : `${h}시간 ${mm}분`;
  }
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (h === 0) return unit(mm, "minute");
  return mm === 0 ? unit(h, "hour") : `${unit(h, "hour")} ${unit(mm, "minute")}`;
}

/** Imperative phrase per turn type, used inside distance cues. */
const KO: Record<TurnType, string> = {
  start: "출발하세요",
  straight: "직진하세요",
  left: "좌회전하세요",
  right: "우회전하세요",
  slight_left: "왼쪽 방향으로 가세요",
  slight_right: "오른쪽 방향으로 가세요",
  sharp_left: "크게 좌회전하세요",
  sharp_right: "크게 우회전하세요",
  u_turn: "유턴하세요",
  crosswalk: "횡단보도를 건너세요",
  overpass: "육교를 이용하세요",
  underpass: "지하보도를 이용하세요",
  stairs: "계단을 이용하세요",
  elevator: "엘리베이터를 이용하세요",
  arrive: "목적지에 도착해요",
  other: "경로를 따라가세요",
};

const EN: Record<TurnType, string> = {
  start: "start walking",
  straight: "go straight",
  left: "turn left",
  right: "turn right",
  slight_left: "bear left",
  slight_right: "bear right",
  sharp_left: "turn sharp left",
  sharp_right: "turn sharp right",
  u_turn: "make a U-turn",
  crosswalk: "cross the street",
  overpass: "take the overpass",
  underpass: "take the underpass",
  stairs: "take the stairs",
  elevator: "take the elevator",
  arrive: "arrive at your destination",
  other: "follow the route",
};

export function turnPhrase(turn: TurnType, lang: Lang): string {
  return lang === "ko" ? KO[turn] : EN[turn];
}

export const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
