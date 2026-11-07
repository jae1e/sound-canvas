import { useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { UpdateBanner } from '../../src/update/UpdateSection';
import { useTranslation } from '../../src/i18n';
import { shared } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { getDb } from '../../src/db/client';
import { listStoredTakes, type StoredTake } from '../../src/db/repos/coach';
import { useSettings } from '../../src/settings/store';

export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const showHiddenModes = useSettings((s) => s.settings.showHiddenModes);
  const [lastTake, setLastTake] = useState<StoredTake | null>(null);
  useEffect(() => { try { setLastTake(listStoredTakes(getDb(), 1)[0] ?? null); } catch { setLastTake(null); } }, []);
  return <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
    <Text style={shared.h1}>{t('home.title')}</Text>
    {lastTake ? <Text style={shared.body}>{t('home.continue')}: {lastTake.note || new Date(lastTake.createdAt).toLocaleString()}</Text> : null}
    <Button label={t('home.continue')} onPress={() => router.push('/(tabs)/sing')} />
    <UpdateBanner onPress={() => router.push('/(tabs)/settings')} />
    <Button label={t('tabs.sing')} onPress={() => router.push('/(tabs)/sing')} />
    <Button label={t('tabs.speak')} onPress={() => router.push('/(tabs)/speak')} />
    {showHiddenModes ? <Button label={t('common.mode.travel')} onPress={() => router.push('/travel')} /> : null}
    {showHiddenModes ? <Button label={t('common.mode.work')} onPress={() => router.push('/work')} /> : null}
  </ScrollView>;
}
