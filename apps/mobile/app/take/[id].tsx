import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { PlaybackEvent, TakeAnalysis } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { deleteTakeRow } from '../../src/db/repos/coach';
import { useTranslation } from '../../src/i18n';
export default function TakeReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [row, setRow] = useState(() => getDb().select().from(takes).where(eq(takes.id, id)).get());
  const [analysis, setAnalysis] = useState<TakeAnalysis | null>(null);
  const [playback, setPlayback] = useState<PlaybackEvent | null>(null);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const fileUri = row?.fileUri;
  const beatJson = row?.beatJson;
  useEffect(() => {
    if (!fileUri) return;
    let live = true;
    const sub = VcAudio.addListener('onPlayback', setPlayback);
    let beatTimesMs: number[] = [];
    try {
      beatTimesMs = JSON.parse(beatJson ?? '{}').timesMs ?? [];
    } catch {
      /* Legacy take. */
    }
    void VcAudio.analyzeTake(fileUri, { beatTimesMs }).then(
      (a) => {
        if (live) setAnalysis(a);
      },
      () => setError(t('common.coach.error')),
    );
    return () => {
      live = false;
      sub.remove();
      void VcAudio.stop();
    };
  }, [fileUri, beatJson, t]);
  if (!row) return <Text>{t('common.coach.none')}</Text>;
  const duration = analysis?.durationMs ?? row.durationMs ?? 1;
  const pos =
    playback?.state === 'playing' || playback?.state === 'paused' ? playback.positionMs : selectedPosition;
  let beats: number[] = [];
  try {
    beats = JSON.parse(row.beatJson ?? '{}').timesMs ?? [];
  } catch {
    /* Legacy take. */
  }
  const low = Math.min(...(analysis?.midi.filter((v): v is number => v !== null) ?? [48]), 48);
  const high = Math.max(...(analysis?.midi.filter((v): v is number => v !== null) ?? [72]), 72);
  let path = '';
  let voiced = false;
  analysis?.midi.forEach((m, i) => {
    if (m === null) {
      voiced = false;
      return;
    }
    const x = (analysis.tMs[i] / duration) * 360;
    const y = 180 - ((m - low) / (high - low)) * 170;
    path += `${voiced ? 'L' : 'M'}${x} ${y} `;
    voiced = true;
  });
  const seek = (ms: number) => {
    const next = Math.max(0, Math.min(duration, ms));
    setSelectedPosition(next);
    if (playback?.state === 'playing' || playback?.state === 'paused') action(VcAudio.seek(next));
  };
  const action = (p: Promise<unknown>) => {
    void p.catch(() => setError(t('common.coach.error')));
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#0E1117', padding: 16, gap: 16 }}>
      <TextInput
        value={row.title ?? ''}
        placeholder={t('common.coach.song')}
        placeholderTextColor="#8A93A5"
        onChangeText={(title) => setRow({ ...row, title })}
        onEndEditing={() => getDb().update(takes).set({ title: row.title }).where(eq(takes.id, row.id)).run()}
        style={{ color: '#E8EBF1', fontSize: 22, fontWeight: '700' }}
      />
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(e) => seek((e.nativeEvent.locationX / width) * duration)}
        onResponderRelease={(e) => seek((e.nativeEvent.locationX / width) * duration)}
      >
        <Svg width="100%" height={250} viewBox="0 0 360 250">
          {beats.map((beat, i) => (
            <Line
              key={i}
              x1={(beat / duration) * 360}
              x2={(beat / duration) * 360}
              y1={0}
              y2={250}
              stroke="#3A4457"
              strokeDasharray="3 4"
            />
          ))}
          <Path d={path} fill="none" stroke="#5EEAD4" strokeWidth={2} />
          {analysis?.peaks.map((peak, i) => (
            <Rect
              key={i}
              x={(i / analysis.peaks.length) * 360}
              y={215 - peak * 30}
              width={Math.max(1, 360 / analysis.peaks.length - 1)}
              height={Math.max(1, peak * 60)}
              fill="#8A93A5"
            />
          ))}
          <Line x1={(pos / duration) * 360} x2={(pos / duration) * 360} y1={0} y2={250} stroke="#FFF" />
        </Svg>
      </View>
      <Text style={{ color: '#8A93A5', textAlign: 'center' }}>
        {Math.floor(pos / 1000)} / {Math.floor(duration / 1000)} s
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          ['−5s', async () => seek(pos - 5000)],
          [
            playback?.state === 'playing' ? 'Ⅱ' : '▶',
            () =>
              playback?.state === 'playing'
                ? VcAudio.pause()
                : playback?.state === 'paused'
                  ? VcAudio.resume()
                  : VcAudio.play(row.fileUri, pos),
          ],
          ['+5s', async () => seek(pos + 5000)],
        ].map(([label, fn]) => (
          <Pressable
            key={label as string}
            onPress={() => action((fn as () => Promise<void>)())}
            style={{ padding: 16 }}
          >
            <Text style={{ color: '#E8EBF1', fontSize: 20 }}>{label as string}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() =>
          action(
            Sharing.shareAsync(row.fileUri.startsWith('file://') ? row.fileUri : `file://${row.fileUri}`),
          )
        }
      >
        <Text style={{ color: '#5EEAD4', padding: 12 }}>{t('common.coach.share')}</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert(t('common.confirmDelete'), '', [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: () => {
                void VcAudio.deleteTake(row.fileUri).then(
                  () => {
                    deleteTakeRow(getDb(), row.id);
                    router.back();
                  },
                  () => setError(t('common.coach.error')),
                );
              },
            },
          ])
        }
      >
        <Text style={{ color: '#F87171', padding: 12 }}>{t('common.delete')}</Text>
      </Pressable>
      {!!error && <Text style={{ color: '#F87171' }}>{error}</Text>}
    </View>
  );
}
