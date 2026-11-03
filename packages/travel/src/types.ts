export type Lang = "ko" | "en";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Normalized place returned by the Worker (`POST /places/search`). */
export interface Place {
  id: string;
  name: string;
  /** Human readable category (provider text). */
  category: string;
  /** Provider category group code, for example CE7. */
  categoryCode?: string;
  distanceM: number;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  url?: string;
  /** Data provider, used for the spoken attribution. */
  source: "kakao" | "mock";
}

export type TurnType =
  | "start"
  | "straight"
  | "left"
  | "right"
  | "slight_left"
  | "slight_right"
  | "sharp_left"
  | "sharp_right"
  | "u_turn"
  | "crosswalk"
  | "overpass"
  | "underpass"
  | "stairs"
  | "elevator"
  | "arrive"
  | "other";

export interface RouteStep {
  /** Maneuver location. */
  point: LatLng;
  /** Index of the polyline vertex at the maneuver. Non-decreasing across steps. */
  pathIndex: number;
  /** Provider instruction text (Korean for TMAP). May be empty. */
  instruction: string;
  /** English instruction when the Worker could template one. */
  instructionEn?: string;
  turn: TurnType;
  /** Distance from this maneuver to the next one (or the end), meters. */
  distanceToNextM: number;
}

/** Normalized walking route (`POST /route/walk`). */
export interface WalkRoute {
  provider: "tmap" | "kakao" | "mock";
  polyline: LatLng[];
  distanceM: number;
  durationS: number;
  steps: RouteStep[];
}

export interface WhereAmI {
  /** Road address when available. */
  roadAddress?: string;
  /** Lot-number address when available. */
  address?: string;
  /** Short area name, for example "서울특별시 강남구 역삼동". */
  area: string;
  source: "kakao" | "mock";
}

export interface GpsFix {
  lat: number;
  lng: number;
  /** Horizontal accuracy in meters (68% radius). */
  accuracyM: number;
  /** Epoch ms when the fix was taken. */
  timestampMs: number;
}
