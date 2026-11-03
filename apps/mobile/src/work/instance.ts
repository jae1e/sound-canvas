import { create } from 'zustand';

import { getDb } from '../db/client';
import { appendEvent } from '../db/repos/events';
import { createJournalEntry, deleteJournalEntry } from '../db/repos/journal';
import { loadResumableSession, saveSession } from '../db/repos/sessions';
import { useSettings } from '../settings/store';
import VlcSessionService from '../../modules/vlc-session-service';
import { WorkController, type ControllerState, type StorePort } from './controller';
import { applySpeechSettings, createNativePort } from './native';
import { useWorkSummary } from './summary';

const store: StorePort = {
  saveSession: (session, title) => saveSession(getDb(), session, { now: Date.now(), title }),
  appendEvent: (kind, payload) => {
    try {
      appendEvent(getDb(), { at: Date.now(), kind, payload });
    } catch {
      // The event log must never break the session.
    }
  },
  createJournal: (entry) => {
    createJournalEntry(getDb(), entry);
  },
  deleteJournal: (id) => {
    deleteJournalEntry(getDb(), id);
  },
};

let n = 0;
const newId = () => `${Date.now().toString(36)}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The app-wide Work Partner controller. */
export const workController = new WorkController(createNativePort(() => useSettings.getState().settings), store, {
  now: () => Date.now(),
  newId,
  settings: () => {
    const s = useSettings.getState().settings;
    return { nudgeLevel: s.nudgeLevel, focusBreakEnabled: s.focusBreakEnabled, focusBreakMinutes: s.focusBreakMinutes };
  },
});

/** React state mirror of the controller. */
export const useWork = create<ControllerState>(() => workController.state());

let wired = false;

/** Connects the controller to React state, native events and settings changes. Idempotent. */
export function wireWorkController(): void {
  if (wired) return;
  wired = true;
  workController.subscribe((s) => useWork.setState(s, true));
  workController.onSummary((s) => useWorkSummary.setState(s, true));

  VlcSessionService.addListener('partialTranscript', (e) => workController.onPartial(e.text));
  VlcSessionService.addListener('finalTranscript', (e) => {
    if (workController.state().listen !== 'on') return;
    workController.onFinal(e.text, e.alternatives, e.lang);
  });
  VlcSessionService.addListener('cueDue', (e) => workController.onCueDue(e.id));
  VlcSessionService.addListener('sessionState', (e) => {
    if (e.state === 'stopped' || e.state === 'error') workController.onNativeStopped();
  });
  VlcSessionService.addListener('sessionError', (e) => store.appendEvent('error', { where: 'native', code: e.code, message: e.message }));

  // A changed nudge level re-plans the cues; changed speech settings reach the native session without a restart.
  let last = useSettings.getState().settings;
  useSettings.subscribe((s) => {
    const next = s.settings;
    if (next.nudgeLevel !== last.nudgeLevel) workController.syncCues();
    if (workController.state().listen === 'on') {
      applySpeechSettings(next, workController.state().session?.lang ?? s.language);
    }
    last = next;
  });
}

/** Restores an unfinished session after the app was killed. */
export function restoreWork(): void {
  wireWorkController();
  const stored = loadResumableSession(getDb(), 'activity');
  if (stored) workController.restore(stored.session, stored.title);
}
