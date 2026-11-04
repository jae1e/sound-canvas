import { useEffect, useState } from 'react';

import VlcSessionService, { type SessionVoiceInfo } from '../../modules/vlc-session-service';
import { Banner } from '../components/ui';
import { useTranslation } from '../i18n';

/** The session voice state, kept current from the native `sessionVoice` event. Null without a session. */
export function useSessionVoice(): SessionVoiceInfo | null {
  const [info, setInfo] = useState<SessionVoiceInfo | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const v = VlcSessionService.getSessionVoice();
        setInfo(v.voice ? v : null);
      } catch {
        setInfo(null);
      }
    };
    read();
    let sub: { remove(): void } | null = null;
    try {
      sub = VlcSessionService.addListener('sessionVoice', (v) => setInfo(v.voice ? v : null));
    } catch {
      sub = null;
    }
    // A session started after this screen mounted emits its first event before any listener could exist in rare orders.
    const timer = setInterval(read, 5000);
    return () => {
      sub?.remove();
      clearInterval(timer);
    };
  }, []);
  return info;
}

/** Visible notice on the session screen when the session does not use the Supertonic voice, or lost it mid-session. */
export function VoiceNotice() {
  const { t } = useTranslation();
  const v = useSessionVoice();
  if (!v) return null;
  if (v.reloading) return <Banner kind="warn" text={t('session.voice.notice.reloading')} />;
  if (v.switched) return <Banner kind="warn" text={t('session.voice.notice.switched')} />;
  if (v.degraded) return <Banner kind="warn" text={t('session.voice.notice.fallback')} />;
  return null;
}
