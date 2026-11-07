import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { AudioDevice, PlaybackEvent, TakeAnalysis } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { useTranslation } from '../../src/i18n';
import { deviceLabel } from '../../src/recorder/deviceLabels';
import { ReviewGraphs } from '../../src/recorder/ReviewGraphs';
import { ResultDetails } from '../../src/recorder/ResultCard';
import { formatDuration } from '../../src/recorder/SingControls';

function IconButton({
  icon,
  label,
  onPress,
  color,
  size = 44,
  background = 'transparent',
  suffix,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  size?: number;
  background?: string;
  suffix?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: '#88888855', borderless: false }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.97 : 1 }],
        overflow: 'hidden',
      })}
    >
      <Ionicons name={icon} size={size === 72 ? 30 : 22} color={color} />
      {suffix && (
        <Text style={{ color, fontSize: 9, fontWeight: '800', position: 'absolute', bottom: 5 }}>
          {suffix}
        </Text>
      )}
    </Pressable>
  );
}
function parseObject(value: string | null): Record<string, any> {
  try {
    return JSON.parse(value ?? '{}') ?? {};
  } catch {
    return {};
  }
}
export default function TakeReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [row, setRow] = useState(() => getDb().select().from(takes).where(eq(takes.id, id)).get());
  const [analysis, setAnalysis] = useState<TakeAnalysis | null>(null);
  const [playback, setPlayback] = useState<PlaybackEvent | null>(null);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const fileUri = row?.fileUri;
  const beatJson = row?.beatJson;
  useEffect(() => {
    if (!fileUri) return;
    let live = true;
    const sub = VcAudio.addListener('onPlayback', (event) => {
      setPlayback(event);
      setPosition(event.state === 'ended' ? 0 : event.positionMs);
    });
    const beat = parseObject(beatJson ?? null);
    void VcAudio.analyzeTake(fileUri, { beatTimesMs: beat.timesMs ?? [], waveformBuckets: 400 }).then(
      (result) => {
        if (live) setAnalysis(result);
      },
      () => {
        if (live) setError(t('common.coach.error'));
      },
    );
    return () => {
      live = false;
      sub.remove();
      void VcAudio.stop();
    };
  }, [fileUri, beatJson, t]);
  if (!row)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Text>{t('common.coach.none')}</Text>
      </>
    );
  const dark = row.kind !== 'speech';
  const foreground = dark ? '#E8EBF1' : '#1B1D22';
  const accent = dark ? '#5EEAD4' : '#4F46E5';
  const muted = dark ? '#8A93A5' : '#6C6F78';
  const duration = Math.max(1, analysis?.durationMs || row.durationMs || 1);
  const beat = parseObject(row.beatJson);
  const beats = Array.isArray(beat.timesMs)
    ? beat.timesMs.filter((v: unknown): v is number => typeof v === 'number')
    : [];
  const input = parseObject(row.inputJson) as AudioDevice;
  const metadata = [
    new Date(row.createdAt).toLocaleString(i18n.language, {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    formatDuration(duration),
    input.type ? deviceLabel(input, 'input', t) : t('common.coach.phoneMic'),
  ];
  if (beats.length && typeof beat.bpm === 'number')
    metadata.push(`${beat.bpm} BPM${beat.pattern ? ` ${t(`common.coach.pattern.${beat.pattern}`)}` : ''}`);
  const action = (promise: Promise<unknown>) => {
    void promise.catch(() => setError(t('common.coach.error')));
  };
  const seek = (value: number) => {
    const next = Math.max(0, Math.min(duration, value));
    setPosition(next);
    if (playback?.state === 'playing' || playback?.state === 'paused') action(VcAudio.seek(next));
  };
  const displayTitle = row.title || t(row.kind === 'speech' ? 'common.coach.speech' : 'common.coach.song');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0E1117' : '#F6F5F1' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            color={foreground}
            onPress={() => router.back()}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setTitle(row.title ?? '');
              setRenaming(true);
            }}
            android_ripple={{ color: '#88888855' }}
            style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Text numberOfLines={1} style={{ color: foreground, fontSize: 21, fontWeight: '800' }}>
              {displayTitle}
            </Text>
          </Pressable>
          <IconButton
            icon="share-outline"
            label={t('common.coach.share')}
            color={foreground}
            onPress={() =>
              action(
                Sharing.shareAsync(row.fileUri.startsWith('file://') ? row.fileUri : `file://${row.fileUri}`),
              )
            }
          />
          <IconButton
            icon="trash-outline"
            label={t('common.delete')}
            color={foreground}
            onPress={() =>
              Alert.alert(t('common.confirmDelete'), '', [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => router.replace({ pathname: '/(tabs)/takes', params: { deleteId: row.id } }),
                },
              ])
            }
          />
        </View>
        <Text style={{ color: muted, fontSize: 13, marginHorizontal: 16, marginTop: 8, marginBottom: 18 }}>
          {metadata.join(' · ')}
        </Text>
        {analysis && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <ResultDetails analysis={analysis} theme={dark ? 'dark' : 'light'} />
          </View>
        )}
        <ReviewGraphs
          analysis={analysis}
          duration={duration}
          position={position}
          beats={beats}
          theme={dark ? 'dark' : 'light'}
          onSeek={seek}
          silentLabel={t('common.coach.silentTake')}
        />
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12 }}
        >
          <Text style={{ color: muted }}>{formatDuration(position)}</Text>
          <View style={{ flex: 1, height: 2, backgroundColor: dark ? '#293243' : '#D9D6CE' }}>
            <View
              style={{
                width: `${Math.min(100, (position / duration) * 100)}%`,
                height: 2,
                backgroundColor: accent,
              }}
            />
          </View>
          <Text style={{ color: muted }}>{formatDuration(duration)}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
            marginTop: 24,
          }}
        >
          <IconButton
            icon="play-back"
            label={t('common.coach.backFive')}
            suffix="5"
            color={foreground}
            size={48}
            background={dark ? '#222936' : '#E8E6E0'}
            onPress={() => seek(position - 5000)}
          />
          <IconButton
            icon={playback?.state === 'playing' ? 'pause' : 'play'}
            label={t(playback?.state === 'playing' ? 'common.coach.pause' : 'common.coach.play')}
            color={dark ? '#0E1117' : '#FFF'}
            size={72}
            background={accent}
            onPress={() =>
              action(
                playback?.state === 'playing'
                  ? VcAudio.pause()
                  : playback?.state === 'paused'
                    ? VcAudio.resume()
                    : VcAudio.play(row.fileUri, position),
              )
            }
          />
          <IconButton
            icon="play-forward"
            label={t('common.coach.forwardFive')}
            suffix="5"
            color={foreground}
            size={48}
            background={dark ? '#222936' : '#E8E6E0'}
            onPress={() => seek(position + 5000)}
          />
        </View>
        {!!error && <Text style={{ color: '#F87171', margin: 16 }}>{error}</Text>}
      </ScrollView>
      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <View style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'center', padding: 24 }}>
          <View
            style={{ backgroundColor: dark ? '#171C25' : '#FFF', padding: 20, borderRadius: 18, gap: 16 }}
          >
            <Text style={{ color: foreground, fontSize: 18, fontWeight: '700' }}>
              {t('common.coach.rename')}
            </Text>
            <TextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              style={{ color: foreground, borderBottomWidth: 1, borderColor: muted, padding: 8 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }}>
              {[
                [t('common.cancel'), () => setRenaming(false)],
                [
                  t('common.save'),
                  () => {
                    const next = title.trim();
                    getDb().update(takes).set({ title: next }).where(eq(takes.id, row.id)).run();
                    setRow({ ...row, title: next });
                    setRenaming(false);
                  },
                ],
              ].map(([label, onPress]) => (
                <Pressable
                  key={label as string}
                  onPress={onPress as () => void}
                  android_ripple={{ color: '#88888855' }}
                  style={({ pressed }) => ({ padding: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Text style={{ color: accent }}>{label as string}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
