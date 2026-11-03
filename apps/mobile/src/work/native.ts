import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import type { Lang } from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';
import type { AppSettings } from '../settings/schema';
import type { NativePort } from './controller';

const REQUIRED: Permission = 'android.permission.RECORD_AUDIO';
// Notifications keep the foreground service visible; Bluetooth lets the app see earbuds. Neither blocks the session.
const OPTIONAL: Permission[] = ['android.permission.POST_NOTIFICATIONS', 'android.permission.BLUETOOTH_CONNECT'];

/** Applies the speech settings to the native session. Nothing here makes a sound. */
export function applySpeechSettings(settings: AppSettings, lang: Lang): void {
  try {
    VlcSessionService.setSessionTts({ engine: settings.ttsEngine, voice: settings.ttsVoice, steps: settings.ttsSteps });
    VlcSessionService.setSpeechLanguage(lang);
    // Only an explicit user choice ever selects the phone speaker; the default is the system route.
    void VlcSessionService.setSpeechOutput(settings.outputRoute);
  } catch {
    // The module may be absent in a non-native environment; speech settings then simply do not apply.
  }
}

/** The native foreground session (microphone + platform STT + TTS + cue scheduler) behind the controller's port. */
export function createNativePort(getSettings: () => AppSettings): NativePort {
  return {
    isRunning: () => {
      try {
        return VlcSessionService.getSessionState() === 'running';
      } catch {
        return false;
      }
    },

    async start(lang) {
      if (Platform.OS !== 'android') throw new Error('Voice sessions are Android-only for now.');
      const granted = await PermissionsAndroid.request(REQUIRED);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Microphone permission was not granted.');
      await PermissionsAndroid.requestMultiple(OPTIONAL);
      await VlcSessionService.startSession({
        language: lang,
        bargeIn: false,
        allowMissingModels: true,
        locationEnabled: false,
        sttEngine: 'platform',
      });
      applySpeechSettings(getSettings(), lang);
    },

    async stop() {
      await VlcSessionService.stopSession();
    },

    speak(text, priority) {
      VlcSessionService.speak(text, priority, null);
    },

    stopSpeaking() {
      VlcSessionService.stopSpeaking();
    },

    scheduleCue(id, atEpochMs, fallbackText) {
      VlcSessionService.scheduleCue(id, atEpochMs, fallbackText);
    },

    cancelCue(id) {
      VlcSessionService.cancelCue(id);
    },

    ackCue(id) {
      return VlcSessionService.ackCue(id);
    },
  };
}
