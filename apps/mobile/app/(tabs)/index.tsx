import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, Card } from '../../src/components/ui';
import { getDb } from '../../src/db/client';
import { listStoredTakes, type StoredTake } from '../../src/db/repos/coach';
import { useTranslation } from '../../src/i18n';
import { ModeCard } from '../../src/home/ModeCard';
import { useSettings } from '../../src/settings/store';
import { colors, shared } from '../../src/theme';
import { UpdateBanner } from '../../src/update/UpdateSection';

function takeMode(take: StoredTake): 'speech' | 'practice' {
  if (take.blockId?.includes('speech')) return 'speech';
  if (take.metrics && typeof take.metrics === 'object' && 'mode' in take.metrics && take.metrics.mode === 'speech') return 'speech';
  return 'practice';
}

function takeDate(timestamp: number, locale: string, t: (key: string) => string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const takeDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayOffset = Math.round((dayStart - takeDay) / 86_400_000);
  if (dayOffset === 0) return `${t('home.date.today')} ${time}`;
  if (dayOffset === 1) return `${t('home.date.yesterday')} ${time}`;
  const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  return `${day} · ${time}`;
}

export default function HomeTab() {
  const { t, i18n } = useTranslation();
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

  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const mode = lastTake ? takeMode(lastTake) : 'practice';
  const takePath = mode === 'speech' ? '/speak' : '/sing';

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <UpdateBanner onPress={() => router.push('/settings')} />
      {lastTake ? (
        <Card>
          <View style={shared.row}>
            <Ionicons name={mode === 'speech' ? 'mic' : 'musical-notes'} size={24} color={colors.primary} />
            <Text style={shared.h2}>{t('home.continue')}</Text>
          </View>
          <Text style={shared.body}>{mode === 'speech' ? t('home.mode.speech') : t('home.mode.song')}</Text>
          <Text style={shared.muted}>{takeDate(lastTake.createdAt, locale, t)}</Text>
          {lastTake.durationMs !== null ? (
            <Text style={shared.muted}>{t('home.duration', { duration: formatDuration(lastTake.durationMs, t) })}</Text>
          ) : null}
          <Button label={t('home.continue')} kind="primary" onPress={() => router.push(takePath)} />
        </Card>
      ) : null}
      <ModeCard
        icon="musical-notes"
        title={t('home.mode.song')}
        description={t('home.mode.song.desc')}
        onPress={() => router.push('/sing')}
      />
      <ModeCard
        icon="mic"
        title={t('home.mode.speech')}
        description={t('home.mode.speech.desc')}
        onPress={() => router.push('/speak')}
      />
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

function formatDuration(durationMs: number, t: (key: string, options?: { minutes: number; seconds: number }) => string): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  return t('home.duration.value', { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 });
}
