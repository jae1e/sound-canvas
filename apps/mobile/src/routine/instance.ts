import { create } from 'zustand';

import VlcSessionService from '../../modules/vlc-session-service';
import { getDb } from '../db/client';
import { appendEvent } from '../db/repos/events';
import { createJournalEntry } from '../db/repos/journal';
import {
  addCorrectionShown, deleteCorrection, finishRoutineRun, getRoutine, lastRoutineRun, listCorrections, listRoutines, saveCorrection, saveRoutine,
  setCorrectionFixed, startRoutineRun, touchRoutineUsed,
} from '../db/repos/routines';
import { useSettings } from '../settings/store';
import { RoutineController, type RoutineControllerState, type RoutineStorePort } from './controller';
import { createRoutineNativePort } from './native';

const store: RoutineStorePort = {
  listCorrections: (id) => listCorrections(getDb(), id),
  saveCorrection: (c) => saveCorrection(getDb(), c, Date.now()),
  deleteCorrection: (id) => deleteCorrection(getDb(), id),
  setFixed: (id, fixed) => setCorrectionFixed(getDb(), id, fixed, Date.now()),
  addShown: (m) => addCorrectionShown(getDb(), m, Date.now()),
  saveRoutine: (t) => saveRoutine(getDb(), t, Date.now()),
  listRoutines: () => listRoutines(getDb()),
  getRoutine: (id) => getRoutine(getDb(), id),
  touchUsed: (id) => touchRoutineUsed(getDb(), id, Date.now()),
  startRun: (r) => startRoutineRun(getDb(), r),
  finishRun: (id, r) => finishRoutineRun(getDb(), id, r),
  lastRun: () => {
    const r = lastRoutineRun(getDb());
    return r ? { templateId: r.templateId, templateName: r.templateName, lang: r.lang === 'en' ? 'en' : 'ko' } : null;
  },
  appendEvent: (kind, payload) => {
    try {
      appendEvent(getDb(), { at: Date.now(), kind, payload });
    } catch {
      // The event log must never break a routine.
    }
  },
  createJournal: (entry) => {
    try {
      createJournalEntry(getDb(), entry);
    } catch {
      // A failed journal write must not stop the routine.
    }
  },
};

let n = 0;
const newId = () => `${Date.now().toString(36)}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The app-wide routine controller. */
export const routineController = new RoutineController(createRoutineNativePort(() => useSettings.getState().settings), store, {
  now: () => Date.now(),
  newId,
  level: () => useSettings.getState().settings.pacingLevel,
});

export const useRoutine = create<RoutineControllerState>(() => routineController.state());

let wired = false;

/** Connects the routine controller to React state and native events. Idempotent. */
export function wireRoutineController(): void {
  if (wired) return;
  wired = true;
  routineController.subscribe((s) => useRoutine.setState(s, true));
  VlcSessionService.addListener('partialTranscript', (e) => routineController.onPartial(e.text));
  VlcSessionService.addListener('finalTranscript', (e) => routineController.onFinal(e.text, e.lang === 'en' ? 'en' : e.lang === 'ko' ? 'ko' : useSettings.getState().language));
  VlcSessionService.addListener('paceBeat', (e) => routineController.onPaceBeat(e));
  VlcSessionService.addListener('paceSegmentDone', (e) => routineController.onSegmentDone(e));
  VlcSessionService.addListener('sessionState', (e) => {
    if (e.state === 'stopped' || e.state === 'error') routineController.onNativeStopped();
  });
}
