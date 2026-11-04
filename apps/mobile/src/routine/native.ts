import type { Lang } from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';
import { startNativeSession } from '../work/native';
import { applySpeechSettings } from '../work/native';
import type { AppSettings } from '../settings/schema';
import type { RoutineNativePort } from './controller';

/**
 * The native session behind the routine controller. Pacing clips go through `pacingPrepare` (cache) and `paceSchedule`
 * (native Handler timer, system media route, ducking, never the forced speaker); confirmations use the live TTS.
 */
export function createRoutineNativePort(getSettings: () => AppSettings): RoutineNativePort {
  return {
    isRunning: () => {
      try {
        return VlcSessionService.getSessionState() === 'running';
      } catch {
        return false;
      }
    },
    async start(lang: Lang) {
      await startNativeSession(lang, 'work');
      applySpeechSettings(getSettings(), lang);
    },
    async stop() {
      await VlcSessionService.stopSession();
    },
    speak: (text) => void VlcSessionService.speak(text, 'high', null),
    stopSpeaking: () => VlcSessionService.stopSpeaking(),
    async prepare(clips, onProgress) {
      const sub = VlcSessionService.addListener('pacePrepareProgress', (e) => onProgress(e.done, e.total));
      try {
        const r = await VlcSessionService.pacingPrepare(clips);
        return { clips: r.clips.map((c) => ({ text: c.text, durationMs: c.durationMs, ok: c.ok })), failed: r.failed, engine: r.engine };
      } finally {
        sub.remove();
      }
    },
    schedule: (id, startEpochMs, beats) => VlcSessionService.paceSchedule(id, startEpochMs, beats),
    cancel: (id) => {
      try {
        VlcSessionService.paceCancel(id);
      } catch {
        // No session: nothing to cancel.
      }
    },
  };
}
