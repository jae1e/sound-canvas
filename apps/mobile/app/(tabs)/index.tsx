import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Button } from '../../src/components/ui';
import { getDb } from '../../src/db/client';
import { listStoredTakes, type StoredTake } from '../../src/db/repos/coach';
import { useTranslation } from '../../src/i18n';
import { ModeCard } from '../../src/home/ModeCard';
import { useSettings } from '../../src/settings/store';
import { shared } from '../../src/theme';
import { UpdateBanner } from '../../src/update/UpdateSection';

export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const showHiddenModes = useSettings((state) => state.settings.showHiddenModes);
  const [lastTake, setLastTake] = useState<StoredTake | null>(null);

  useEffect(() => {
    try {
      setLastTake(listStoredTakes(getDb(), 1)[0] ?? null);
    } catch {
      setLastTake(null);
    }
  }, []);

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Text style={shared.h1}>{t('home.title')}</Text>
      {lastTake ? (
        <Text style={shared.body}>
          {t('home.continue')}: {lastTake.note || new Date(lastTake.createdAt).toLocaleString()}
        </Text>
      ) : null}
      <Button label={t('home.continue')} onPress={() => router.push('/sing')} />
      <UpdateBanner onPress={() => router.push('/settings')} />
      <Button label={t('tabs.sing')} onPress={() => router.push('/sing')} />
      <Button label={t('tabs.speak')} onPress={() => router.push('/speak')} />
      {showHiddenModes ? (
        <ModeCard
          title={t('common.mode.travel')}
          description={t('home.mode.travel.desc')}
          onPress={() => router.push('/travel')}
        />
      ) : null}
      {showHiddenModes ? (
        <ModeCard
          title={t('common.mode.work')}
          description={t('home.mode.work.desc')}
          onPress={() => router.push('/work')}
        />
      ) : null}
    </ScrollView>
  );
}
