import VlcSessionService from '../../modules/vlc-session-service';
import { getDb } from '../db/client';
import { closeUnfinishedSessions, loadResumableSession } from '../db/repos/sessions';
import { useSettings } from '../settings/store';
import { feedSessionLocation, travelHandler } from '../travel/service';
import { coachHandler, installCoachMicGate } from '../voice-coach/service';
import { applySpeechSettings, runningSessionMode } from '../work/native';
import { noteUsedLanguage } from './language';
import { ENGINE_MODE, type ManagedMode } from './modeSession';
import { modeSessions } from './instance';

let wired = false;

/**
 * Connects Travel Guide and Voice Coach to the native session. Idempotent; call once after the database is ready.
 *
 * - Final transcripts go to the active mode first (`ModeSessionManager.onFinal`: mode handler, then the shared engine).
 * - Location events feed `TravelController.setFix` straight from the service, so navigation keeps running with the screen
 *   off and no Travel screen mounted.
 * - Microphone holds from the Voice Coach recorder pause session STT.
 */
export function wireModeSessions(): void {
  if (wired) return;
  wired = true;
  modeSessions.register('travel', travelHandler);
  modeSessions.register('coach', coachHandler);
  installCoachMicGate();

  VlcSessionService.addListener('finalTranscript', (e) => {
    noteUsedLanguage(e.lang);
    if (modeSessions.getState().mode) void modeSessions.onFinal(e.text, e.alternatives, e.lang);
  });
  VlcSessionService.addListener('location', (e) => {
    if (modeSessions.getState().mode === 'travel') feedSessionLocation(e);
  });
  VlcSessionService.addListener('sessionState', (e) => {
    if (e.state === 'stopped' || e.state === 'error') modeSessions.onNativeStopped();
  });

  let last = useSettings.getState().settings;
  useSettings.subscribe((s) => {
    const st = modeSessions.getState();
    if (st.status === 'running' && s.settings !== last) applySpeechSettings(s.settings, st.lang ?? s.language);
    last = s.settings;
  });

  hydrate();
}

/** After a JS reload the native service may still run: re-attach to it. Stored sessions without a service are closed. */
function hydrate(): void {
  const db = getDb();
  const now = Date.now();
  const native = runningSessionMode();
  let keep: { mode: ManagedMode; id: string } | null = null;
  if (native === 'travel' || native === 'coach') {
    const stored = loadResumableSession(db, ENGINE_MODE[native]);
    if (stored) {
      modeSessions.adopt(native, stored.session, stored.session.startedAt ?? now);
      keep = { mode: native, id: stored.session.id };
    }
  }
  for (const mode of ['travel', 'coach'] as const) {
    closeUnfinishedSessions(db, ENGINE_MODE[mode], now, keep?.mode === mode ? keep.id : undefined);
  }
}
