import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import VlcSessionService from '../../../modules/vlc-session-service';
import { Button } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { shared } from '../../theme';

/**
 * A button the user taps to hear the selected Supertonic voice. Follows the system route (no outputDeviceId), so Bluetooth
 * earbuds are used when connected. Nothing plays unless the user taps.
 */
export function VoicePreview({ voice, steps, language, text }: { voice: number; steps: number; language: 'ko' | 'en'; text: string }) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () => () => {
      try {
        VlcSessionService.ttsLabStop();
      } catch {
        // Ignore.
      }
    },
    [],
  );

  const play = async () => {
    setError(false);
    const locale = language === 'ko' ? 'ko-KR' : 'en-US';
    try {
      const voices = await VlcSessionService.ttsLabVoices('supertonic', locale);
      const name = voices[voice]?.name ?? null;
      VlcSessionService.ttsLabSpeak('supertonic', text, locale, name, { steps });
      setPlaying(true);
    } catch {
      setError(true);
    }
  };

  const stop = () => {
    try {
      VlcSessionService.ttsLabStop();
    } catch {
      // Ignore.
    }
    setPlaying(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button label={t('settings.voice.preview')} onPress={() => void play()} />
        </View>
        {playing ? (
          <View style={{ flex: 1 }}>
            <Button label={t('settings.voice.preview.stop')} onPress={stop} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={{ color: '#b3261e' }}>{t('settings.voice.preview.error')}</Text> : null}
    </View>
  );
}
