import { create } from 'zustand';
import type { Lang } from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';
import { getDb } from '../db/client';
import { appendEvent } from '../db/repos/events';
import { saveSession } from '../db/repos/sessions';
import { useSettings } from '../settings/store';
import { applySpeechSettings, runningSessionMode, startNativeSession } from '../work/native';
import { workController } from '../work/instance';
import { useWorkSummary } from '../work/summary';
import { ModeSessionManager, type ManagedMode, type ModeKey, type ModeNativePort, type ModeSessionState, type StartResult } from './modeSession';
import { getEffectiveLang } from './language';
import { noteSessionSpeechLanguage } from './speech';

let n = 0;
export const newId = () => `${Date.now().toString(36)}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const nativePort: ModeNativePort = {
  async start(lang, mode) {
    await startNativeSession(lang, mode);
    applySpeechSettings(useSettings.getState().settings, lang);
    noteSessionSpeechLanguage(lang);
  },
  async stop() {
    await VlcSessionService.stopSession();
    noteSessionSpeechLanguage(null);
  },
  isRunning: () => runningSessionMode() !== null,
  speak: (text, priority) => void VlcSessionService.speak(text, priority, null),
  holdStt: (hold) => VlcSessionService.holdStt(hold),
};

/** Work Partner counts as the active mode from `begin` until it ends, even while its native session is stopped. */
function workSessionActive(): boolean {
  const s = workController.state().session;
  return s?.status === 'active' || s?.status === 'paused';
}

/** The app-wide owner of the Travel Guide and Voice Coach sessions. */
export const modeSessions = new ModeSessionManager(
  nativePort,
  {
    saveSession: (session, title) => saveSession(getDb(), session, { now: Date.now(), title }),
    appendEvent: (kind, payload, sessionId) => {
      try {
        appendEvent(getDb(), { sessionId, at: Date.now(), kind, payload });
      } catch {
        // The event log must never break a session.
      }
    },
  },
  { now: () => Date.now(), newId },
  workSessionActive,
);

/** React mirror of the manager state. */
export const useModeSession = create<ModeSessionState>(() => modeSessions.getState());
modeSessions.subscribe(() => useModeSession.setState(modeSessions.getState(), true));

/** Starts the session for a mode with the effective language. Never throws. */
export function startModeSession(mode: ManagedMode, lang: Lang = getEffectiveLang()): Promise<StartResult> {
  return modeSessions.start(mode, lang);
}

export function endModeSession(): Promise<void> {
  return modeSessions.end();
}

/** Which mode owns the voice session right now (Work Partner included), for the Home cards. */
export function useActiveMode(): ModeKey | null {
  const managed = useModeSession((s) => s.mode);
  const workStatus = useWorkSummary((s) => s.status);
  return managed ?? (workStatus === 'active' || workStatus === 'paused' ? 'work' : null);
}
