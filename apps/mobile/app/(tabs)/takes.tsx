import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { desc, eq } from 'drizzle-orm';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { deleteTakeRow } from '../../src/db/repos/coach';
import { useTranslation } from '../../src/i18n';
import { groupByDay, rangeLabel } from '../../src/recorder/derive';
import { formatDuration } from '../../src/recorder/SingControls';
type Row = typeof takes.$inferSelect;
function TakeRow({ row, onPress, onDelete }: { row: Row; onPress: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  let result: string[] = [];
  try {
    const analysis = JSON.parse(row.analysisJson ?? '{}');
    const range = rangeLabel(analysis.rangeLowMidi ?? null, analysis.rangeHighMidi ?? null);
    if (range) result.push(range);
  } catch {
    /* Legacy row. */
  }
  try {
    const beat = JSON.parse(row.beatJson ?? '{}');
    if (typeof beat.bpm === 'number') result.push(`${beat.bpm} BPM`);
  } catch {
    /* Legacy row. */
  }
  return (
    <Swipeable
      onSwipeableOpen={onDelete}
      renderRightActions={() => (
        <View
          style={{
            width: 76,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#E5484D',
            borderRadius: 16,
            marginBottom: 8,
          }}
        >
          <Ionicons name="trash-outline" size={22} color="#FFF" />
        </View>
      )}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          marginBottom: 8,
          backgroundColor: '#FFF',
          borderRadius: 16,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            backgroundColor: row.kind === 'speech' ? '#EEF0FF' : '#171C25',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={row.kind === 'speech' ? 'mic-outline' : 'musical-notes'}
            size={20}
            color={row.kind === 'speech' ? '#4F46E5' : '#5EEAD4'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontWeight: '700', color: '#1B1D22', flexShrink: 1 }}>
              {row.title || t(row.kind === 'speech' ? 'common.coach.speech' : 'common.coach.song')}
            </Text>
            {!!row.recovered && (
              <Text
                style={{
                  color: '#B45309',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 9,
                  paddingHorizontal: 6,
                  fontSize: 10,
                }}
              >
                {t('common.coach.recovered')}
              </Text>
            )}
          </View>
          <Text numberOfLines={1} style={{ color: '#9A9DA6', fontSize: 12 }}>
            {new Date(row.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {result.length ? ` · ${result.join(' · ')}` : ''}
          </Text>
        </View>
        <Text style={{ color: '#9A9DA6' }}>{formatDuration(row.durationMs ?? 0)}</Text>
      </Pressable>
    </Swipeable>
  );
}
export default function TakesTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { deleteId } = useLocalSearchParams<{ deleteId?: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<'all' | 'song' | 'speech'>('all');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(() => {
    try {
      setRows(getDb().select().from(takes).orderBy(desc(takes.createdAt)).all());
    } catch {
      setError(t('common.coach.error'));
    }
  }, [t]);
  const remove = useCallback(
    (row: Row) => {
      if (timer.current) return;
      setPending(row.id);
      timer.current = setTimeout(() => {
        void VcAudio.deleteTake(row.fileUri).then(
          () => {
            deleteTakeRow(getDb(), row.id);
            timer.current = null;
            setPending(null);
            refresh();
          },
          () => {
            timer.current = null;
            setPending(null);
            setError(t('common.coach.error'));
          },
        );
      }, 5000);
    },
    [refresh, t],
  );
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (deleteId) {
        const row = getDb().select().from(takes).where(eq(takes.id, deleteId)).get();
        router.setParams({ deleteId: undefined });
        if (row) remove(row);
      }
    }, [refresh, deleteId, remove, router]),
  );
  const groups = groupByDay(
    rows.filter((r) => r.id !== pending && (filter === 'all' || r.kind === filter)),
    (r) => r.createdAt,
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F1' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['all', 'song', 'speech'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: filter === f ? '#1B1D22' : '#FFF',
              }}
            >
              <Text style={{ color: filter === f ? '#FFF' : '#55585F' }}>
                {t(
                  f === 'all' ? 'common.coach.all' : f === 'song' ? 'common.tabs.sing' : 'common.tabs.speak',
                )}
              </Text>
            </Pressable>
          ))}
        </View>
        {[...groups].map(([day, items]) => (
          <View key={day}>
            <Text style={{ color: '#9A9DA6', marginVertical: 10 }}>{day}</Text>
            {items.map((row) => (
              <TakeRow
                key={row.id}
                row={row}
                onPress={() => router.push({ pathname: '/take/[id]', params: { id: row.id } })}
                onDelete={() => remove(row)}
              />
            ))}
          </View>
        ))}
        {!rows.length && <Text style={{ color: '#6C6F78' }}>{t('common.coach.none')}</Text>}
        {!!error && <Text style={{ color: '#E5484D' }}>{error}</Text>}
      </ScrollView>
      {pending && (
        <Pressable
          onPress={() => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
            setPending(null);
          }}
          style={{
            position: 'absolute',
            bottom: 16,
            alignSelf: 'center',
            padding: 14,
            backgroundColor: '#333842',
            borderRadius: 14,
          }}
        >
          <Text style={{ color: '#FFF' }}>
            {t('common.coach.deleted')} · {t('common.coach.undo')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
