import { Text, View } from 'react-native';

import { useAudioRoute } from '../audio/useAudioRoute';
import { useTranslation } from '../i18n';
import { Banner, Card } from '../components/ui';
import { shared } from '../theme';

/** Current microphone and speech output routes; warning style when the output route is not what the user expects. */
export function AudioStatusCard() {
  const { t } = useTranslation();
  const { input, output } = useAudioRoute();
  return (
    <Card>
      <Text style={shared.h2}>{t('home.audio.title')}</Text>
      <View style={shared.row}>
        <Text style={shared.muted}>{t('home.audio.input')}</Text>
        <Text style={shared.body}>{input.bluetooth ? input.label : t('home.audio.phoneMic')}</Text>
      </View>
      <View style={shared.row}>
        <Text style={shared.muted}>{t('home.audio.output')}</Text>
        <Text style={[shared.body, { flexShrink: 1 }]}>{output.label || t('home.audio.unknown')}</Text>
      </View>
      {!output.ok && output.warning ? <Banner kind="warn" text={output.warning} /> : null}
    </Card>
  );
}
