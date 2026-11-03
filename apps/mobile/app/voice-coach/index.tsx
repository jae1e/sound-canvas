import { ScrollView, Text } from 'react-native';

import { Card } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { shared } from '../../src/theme';

// Placeholder for milestone M2. The Voice Coach agent replaces this file and adds src/voice-coach/**.
export default function VoiceCoachPlaceholder() {
  const { t } = useTranslation();
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Card>
        <Text style={shared.h1}>{t('placeholder.coach.title')}</Text>
        <Text style={shared.body}>{t('placeholder.coach.body')}</Text>
        <Text style={shared.muted}>{t('placeholder.badge')} (M2)</Text>
      </Card>
    </ScrollView>
  );
}
