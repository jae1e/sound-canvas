import { Text, View } from 'react-native';
import { useTranslation } from '../../src/i18n';
export default function SpeakTab() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5F1' }}>
      <Text style={{ color: '#6C6F78', fontSize: 16 }}>{t('common.coach.coming')}</Text>
    </View>
  );
}
