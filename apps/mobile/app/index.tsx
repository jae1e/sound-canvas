import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../src/components/ui';
import { AudioStatusCard } from '../src/home/AudioStatusCard';
import { ModeCard } from '../src/home/ModeCard';
import { ResumeCard } from '../src/home/ResumeCard';
import { useTranslation } from '../src/i18n';
import { shared } from '../src/theme';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Text style={shared.h1}>{t('home.title')}</Text>
      <ResumeCard onPress={() => router.push('/work')} />
      <ModeCard testID="mode-travel" title={t('common.mode.travel')} description={t('home.mode.travel.desc')} onPress={() => router.push('/travel')} />
      <ModeCard testID="mode-work" title={t('common.mode.work')} description={t('home.mode.work.desc')} onPress={() => router.push('/work')} />
      <ModeCard testID="mode-coach" title={t('common.mode.coach')} description={t('home.mode.coach.desc')} onPress={() => router.push('/voice-coach')} />
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button label={t('common.journal')} onPress={() => router.push('/journal')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('common.settings')} onPress={() => router.push('/settings')} />
        </View>
      </View>
      <AudioStatusCard />
    </ScrollView>
  );
}
