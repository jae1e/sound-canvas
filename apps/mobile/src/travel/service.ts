import { haversineM, type GpsFix, type Place } from '@vlc/travel';
import { describeNoteSaved, type Lang, type Session } from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';
import { getDb } from '../db/client';
import { createJournalEntry, listJournalEntries } from '../db/repos/journal';
import { listPlaces, savePlace, saveRoute } from '../db/repos/travel';
import type { EndedSession, ModeHandler } from '../session/modeSession';
import { newId } from '../session/instance';
import { speakThroughSession } from '../session/speech';
import { prewarm } from '../speech/sessionSpeech';
import { createTravelClient } from './client';
import { TravelController } from './controller';
import { WalkLog, walkSummaryText } from './walkLog';

/** The app-wide Travel Guide controller. It speaks only through the running native session. */
export const travelController = new TravelController(createTravelClient(), (text, lang, extras) => void speakThroughSession(text, lang, { parts: extras?.parts, earcon: extras?.earcon, staleAtMs: extras?.staleAtMs }), 'ko', Date.now, {
  onPrewarm: (items) => prewarm(items),
  // "멈춰" / "stop" during landmark narration: drop queued chunks and the one being spoken.
  onStopSpeech: () => {
    try {
      VlcSessionService.stopSpeaking();
    } catch {
      // No native session: nothing is playing.
    }
  },
});

const NEAR_PLACE_M = 75;

let walk: WalkLog | null = null;
let lastFix: GpsFix | null = null;
let navigatedTo: Place | null = null;
let unsubscribe: (() => void) | null = null;

/** Saves a search result as a place (once per provider id) and returns the stored place id. */
export function savePlaceFromResult(place: Place): string {
  return savePlace(getDb(), {
    id: `pl-${newId()}`,
    externalId: `${place.source}:${place.id}`,
    name: place.name,
    address: place.address || null,
    latitude: place.lat,
    longitude: place.lng,
    category: place.category || null,
    source: place.source,
    now: Date.now(),
  }).id;
}

/** The saved place closest to a fix, within NEAR_PLACE_M. The place being navigated to counts (and is saved on demand). */
function placeNear(fix: GpsFix): string | null {
  let best: { id: string; d: number } | null = null;
  for (const p of listPlaces(getDb())) {
    const d = haversineM(fix, { lat: p.latitude, lng: p.longitude });
    if (d <= NEAR_PLACE_M && (!best || d < best.d)) best = { id: p.id, d };
  }
  const dest = navigatedTo;
  if (dest) {
    const d = haversineM(fix, dest);
    if (d <= NEAR_PLACE_M && (!best || d < best.d)) return savePlaceFromResult(dest);
  }
  return best?.id ?? null;
}

/** "메모: ..." / "note: ..." during a walk: a Journal entry with the current location and a nearby saved place, if any. */
function saveNote(text: string, session: Session, lang: Lang): string {
  const fix = travelController.getState().position ?? lastFix;
  const placeId = fix ? placeNear(fix) : null;
  createJournalEntry(getDb(), {
    id: `jn-${newId()}`,
    sessionId: session.id,
    mode: 'travel',
    source: 'user_note',
    text,
    placeId,
    location: fix ? { latitude: fix.lat, longitude: fix.lng, accuracyM: fix.accuracyM } : null,
    createdAt: Date.now(),
  });
  const base = describeNoteSaved(lang);
  if (fix) return base;
  return lang === 'ko' ? `${base} 위치는 아직 잡히지 않았어요.` : `${base} There was no GPS fix yet, so no location was saved.`;
}

function onEnded(info: EndedSession): void {
  unsubscribe?.();
  unsubscribe = null;
  const w = walk;
  walk = null;
  if (travelController.getState().navigating) travelController.stop(false);
  if (!w) return;
  const db = getDb();
  const s = w.summary(info.endedAt);
  const dest = navigatedTo;
  navigatedTo = null;
  const toPlaceId = dest ? savePlaceFromResult(dest) : null;
  if (s.polyline.length > 0) {
    saveRoute(db, {
      id: `rt-${newId()}`,
      sessionId: info.session.id,
      kind: 'walked',
      toPlaceId,
      distanceM: s.distanceM,
      durationMs: s.durationMs,
      polyline: s.polyline,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      now: Date.now(),
    });
  }
  if (s.durationMs < 30_000 && s.polyline.length === 0) return; // an accidental start: nothing worth a Journal entry
  const notes = listJournalEntries(db, { sessionId: info.session.id, source: 'user_note' }).length;
  createJournalEntry(db, {
    id: `js-${newId()}`,
    sessionId: info.session.id,
    mode: 'travel',
    source: 'generated_summary',
    text: walkSummaryText({ lang: info.lang, distanceM: s.distanceM, durationMs: s.durationMs, destination: dest?.name ?? null, notes, points: s.polyline.length }),
    placeId: toPlaceId,
    location: s.polyline.length ? { latitude: s.polyline[s.polyline.length - 1]!.lat, longitude: s.polyline[s.polyline.length - 1]!.lng } : null,
    createdAt: Date.now(),
  });
}

export const travelHandler: ModeHandler = {
  async handle(hypotheses, lang) {
    travelController.lang = lang;
    // The top hypotheses are tried in order; the controller returns true only for utterances it recognised as travel intents.
    for (const h of hypotheses.slice(0, 3)) {
      if (await travelController.handleUtterance(h)) return true;
    }
    return false;
  },
  saveNote,
  onStarted({ lang }) {
    travelController.lang = lang;
    walk = new WalkLog(Date.now());
    navigatedTo = null;
    unsubscribe?.();
    // Every position the controller gets (native session, screen fallback or the mock simulator) goes into the walk log.
    unsubscribe = travelController.subscribe(() => {
      const st = travelController.getState();
      if (st.position && st.position !== lastFix) {
        lastFix = st.position;
        walk?.add(st.position);
      }
      if (st.navigating && st.destination) navigatedTo = st.destination;
    });
  },
  onEnded,
};

/** Feeds a native session location event into the controller. Runs from the service events, so it works with the screen off. */
export function feedSessionLocation(e: { latitude: number; longitude: number; accuracy: number; fixEpochMs: number }): void {
  travelController.setFix({ lat: e.latitude, lng: e.longitude, accuracyM: e.accuracy, timestampMs: e.fixEpochMs });
}
