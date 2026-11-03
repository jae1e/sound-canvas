import { ScrollView, Text } from 'react-native';

import { Card } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { shared } from '../../src/theme';

// Placeholder for milestone M3. The Travel Guide agent replaces this file and adds src/travel/**.
export default function TravelPlaceholder() {
  const { t } = useTranslation();
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Card>
        <Text style={shared.h1}>{t('placeholder.travel.title')}</Text>
        <Text style={shared.body}>{t('placeholder.travel.body')}</Text>
        <Text style={shared.muted}>{t('placeholder.badge')} (M3)</Text>
      </Card>
    </ScrollView>
  );
}
