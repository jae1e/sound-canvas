import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../src/components/ui';
import { AudioStatusCard } from '../src/home/AudioStatusCard';
import { ModeCard } from '../src/home/ModeCard';
import { ModeResumeCard } from '../src/home/ModeResumeCard';
import { ResumeCard } from '../src/home/ResumeCard';
import { useTranslation } from '../src/i18n';
import { useActiveMode } from '../src/session/instance';
import { shared } from '../src/theme';
import { useSettings } from '../src/settings/store';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const active = useActiveMode();
  const hidden = useSettings((s) => s.settings.showHiddenModes);
  const badge = (mode: 'travel' | 'work' | 'coach') => (active === mode ? t('home.active') : null);
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Text style={shared.h1}>{t('home.title')}</Text>
      {hidden ? <ResumeCard onPress={() => router.push('/work')} /> : null}
      {hidden ? <ModeResumeCard onPress={(mode) => router.push(mode === 'travel' ? '/travel' : '/voice-coach')} /> : null}
      {hidden ? <ModeCard testID="mode-travel" activeLabel={badge('travel')} title={t('common.mode.travel')} description={t('home.mode.travel.desc')} onPress={() => router.push('/travel')} /> : null}
      {hidden ? <ModeCard testID="mode-work" activeLabel={badge('work')} title={t('common.mode.work')} description={t('home.mode.work.desc')} onPress={() => router.push('/work')} /> : null}
      <ModeCard testID="mode-coach" activeLabel={badge('coach')} title={t('common.mode.coach')} description={t('home.mode.coach.desc')} onPress={() => router.push('/voice-coach')} />
      {hidden ? <ModeCard testID="mode-travel" activeLabel={badge('travel')} title={t('common.mode.travel')} description={t('home.mode.travel.desc')} onPress={() => router.push('/travel')} /> : null}
      {hidden ? <ModeCard testID="mode-work" activeLabel={badge('work')} title={t('common.mode.work')} description={t('home.mode.work.desc')} onPress={() => router.push('/work')} /> : null}
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
