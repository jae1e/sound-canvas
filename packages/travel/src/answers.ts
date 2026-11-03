import { categoryCodeFor, categoryName } from "./categories";
import type { Progress } from "./tracker";
import { formatDistance, formatDuration } from "./text";
import type { Lang, Place, WalkRoute, WhereAmI } from "./types";

export interface NearbyAnswerOptions {
  lang: Lang;
  /** Category key (`cafe`) or code (`CE7`). Places with a different known code are dropped. */
  category?: string;
  /** Search radius, used only in the "nothing found" answer. */
  radiusM?: number;
  max?: number;
}

export interface NearbyAnswer {
  text: string;
  /** The places mentioned, in spoken order, so "the second one" can be resolved. */
  places: Place[];
}

const attribution = (places: Place[], lang: Lang): string => {
  if (!places.some((p) => p.source === "kakao")) return "";
  return lang === "ko" ? " 카카오 장소 정보 기준이에요." : " Based on Kakao place data.";
};

/**
 * Deterministic spoken answer for "what's around". Uses only the supplied facts:
 * names and distances. It never mentions opening hours or ratings.
 */
export function composeNearbyAnswer(places: Place[], opts: NearbyAnswerOptions): NearbyAnswer {
  const { lang } = opts;
  const code = categoryCodeFor(opts.category);
  const max = Math.max(1, Math.min(opts.max ?? 3, 3));
  const usable = places
    .filter((p) => !code || !p.categoryCode || p.categoryCode === code)
    .slice()
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, max);
  const cat = categoryName(opts.category, lang, true);

  if (usable.length === 0) {
    const within = opts.radiusM ? formatDistance(opts.radiusM, lang) : "";
    if (lang === "ko") {
      return { text: `근처${within ? ` ${within} 안에` : "에"} ${cat ?? "장소"} 결과가 없어요.`, places: [] };
    }
    return {
      text: `I could not find any ${cat ?? "places"} ${within ? `within ${within}` : "nearby"}.`,
      places: [],
    };
  }

  if (lang === "ko") {
    const list = usable.map((p) => `${formatDistance(p.distanceM, "ko")} 거리의 ${p.name}`).join(", ");
    return {
      text: `근처 ${cat ?? "장소"} ${usable.length}곳이에요. ${list}.${attribution(usable, lang)}`,
      places: usable,
    };
  }
  const list = usable.map((p) => `${p.name}, ${formatDistance(p.distanceM, "en")}`).join("; ");
  const head = usable.length === 1 ? "Closest" : `Closest ${usable.length}`;
  return {
    text: `${head} ${cat ?? "places"}: ${list}.${attribution(usable, lang)}`,
    places: usable,
  };
}

export function composeWhereAnswer(where: WhereAmI, lang: Lang, accuracyM?: number | null): string {
  if (accuracyM != null && accuracyM > 50) return composeGpsWeak(lang, accuracyM);
  const place = where.roadAddress || where.address || where.area;
  if (!place) return lang === "ko" ? "현재 위치의 주소를 찾지 못했어요." : "I could not find an address for your position.";
  const approx = accuracyM != null && accuracyM > 30;
  if (lang === "ko") return `지금 ${place} 근처예요.${approx ? " 위치 오차가 조금 있을 수 있어요." : ""}`;
  return `You are near ${place}.${approx ? " The location may be slightly off." : ""}`;
}

export function composeGpsWeak(lang: Lang, accuracyM?: number | null): string {
  if (accuracyM == null) {
    return lang === "ko" ? "아직 GPS 위치를 잡지 못했어요." : "I do not have a GPS fix yet.";
  }
  const a = Math.round(accuracyM);
  return lang === "ko"
    ? `GPS 신호가 약해서 정확한 위치를 말하기 어려워요. 오차가 약 ${a}미터예요.`
    : `GPS is weak, so I cannot say exactly where you are. Accuracy is about ${a} meters.`;
}

export function composeRoutePreview(route: WalkRoute, destinationName: string, lang: Lang): string {
  const d = formatDistance(route.distanceM, lang);
  const t = formatDuration(route.durationS, lang);
  return lang === "ko"
    ? `${destinationName}까지 걸어서 약 ${t}, ${d}예요. 안내를 시작할까요?`
    : `${destinationName} is about ${t} on foot, ${d} away. Start guidance?`;
}

/** Answer to "how much farther?" from tracker progress. */
export function composeProgressAnswer(p: Progress, lang: Lang): string {
  if (p.status === "arrived") return lang === "ko" ? "이미 도착했어요." : "You have already arrived.";
  if (p.noFixYet) return composeGpsWeak(lang, null);
  if (p.status === "off_route") {
    return lang === "ko" ? "지금 경로에서 벗어나 있어요. 다시 안내할까요?" : "You are off the route right now. Want me to reroute?";
  }
  const base =
    lang === "ko"
      ? `남은 거리는 ${formatDistance(p.remainingM, "ko")}, 약 ${formatDuration(p.etaS, "ko")} 걸려요.`
      : `${formatDistance(p.remainingM, "en")} to go, about ${formatDuration(p.etaS, "en")}.`;
  if (p.ignored) {
    const warn = lang === "ko" ? " 최근 GPS 신호가 약해서 오차가 있을 수 있어요." : " GPS has been weak, so this may be off.";
    return base + warn;
  }
  return base;
}
