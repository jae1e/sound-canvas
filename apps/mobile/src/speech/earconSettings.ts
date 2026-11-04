import VlcSessionService from '../../modules/vlc-session-service';
import type { AppSettings } from '../settings/schema';

/**
 * Pushes the earcon loudness and vibration preference to the native side. Vibration is on by default only for navigation
 * (Travel Guide), where eyes and ears are busy; `all` turns it on for every mode, `off` never. Plays nothing.
 */
export function applyEarconSettings(settings: Pick<AppSettings, 'earconVolume' | 'earconVibration'>): void {
  try {
    const mode = VlcSessionService.getSessionState() === 'running' ? VlcSessionService.getSessionMode() : null;
    const vibrate = settings.earconVibration === 'all' || (settings.earconVibration === 'navigation' && mode === 'travel');
    VlcSessionService.setEarconSettings(settings.earconVolume / 100, vibrate);
  } catch {
    // No native module (tests, non-Android): the settings simply do not apply.
  }
}
