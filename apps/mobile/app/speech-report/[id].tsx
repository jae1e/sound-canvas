import {
  NEXT_ACTION_TEMPLATES,
  longPauses,
  countTranscriptFillers,
  paceBand,
  type SpeechReport,
  type SpeechTakeAnalysis,
} from '@vlc/voice-analysis';
import { eq } from 'drizzle-orm';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { PlaybackEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { useTranslation } from '../../src/i18n';
import { formatDuration } from '../../src/recorder/SingControls';
import { useSettings } from '../../src/settings/store';
import { processSpeechQueue } from '../../src/speech-coach/processing';
import type { TranscriptResult } from '../../src/speech-coach/transcriptQueue';

type Row = typeof takes.$inferSelect;
function read<T>(s: string | null | undefined, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
const box = {
  backgroundColor: '#FFF',
  borderColor: '#ECE9E2',
  borderWidth: 1,
  borderRadius: 20,
  padding: 16,
} as const;
export default function SpeechReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const [row, setRow] = useState<Row | undefined>(() =>
    getDb().select().from(takes).where(eq(takes.id, id)).get(),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState<PlaybackEvent['state']>('stopped');
  const playing = playback === 'playing';
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const refresh = () => {
        void processSpeechQueue(id)
          .catch(() => undefined)
          .finally(() => {
            if (live) setRow(getDb().select().from(takes).where(eq(takes.id, id)).get());
          });
      };
      refresh();
      const timer = setInterval(refresh, 2000);
      const playback = VcAudio.addListener('onPlayback', (event) => setPlayback(event.state));
      return () => {
        live = false;
        clearInterval(timer);
        playback.remove();
        void VcAudio.stop();
      };
    }, [id]),
  );
  const action = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      setError(t('speak.error'));
    } finally {
      setBusy(false);
    }
  };
  if (!row)
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text>{t('common.coach.none')}</Text>
      </View>
    );
  const report = read<SpeechReport | null>(row.reportJson, null);
  const transcript = read<TranscriptResult | null>(row.transcriptJson, null);
  const analysis = read<SpeechTakeAnalysis | null>(row.analysisJson, null);
  const noSpeech =
    row.transcriptState === 'no_speech' ||
    !!(
      analysis &&
      !analysis.syllableTimesMs.length &&
      !analysis.midi?.some((v) => v !== null) &&
      !transcript?.text?.trim()
    );
  const fillerCounts = countTranscriptFillers(transcript?.words ?? [], transcript?.language ?? lang).byFiller;
  const boundaries = read<number[]>(row.boundariesJson, []);
  const fillerIndices = new Set(
    report?.transcriptMarks.filter((m) => m.type === 'filler').map((m) => m.wordIndex),
  );
  const pauses = longPauses(transcript?.words ?? [], analysis?.pauses ?? []);
  const nextTemplate = report
    ? NEXT_ACTION_TEMPLATES[lang][report.nextAction.code as keyof typeof NEXT_ACTION_TEMPLATES.en]
    : '';
  const next = Object.entries(report?.nextAction.params ?? {}).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    noSpeech ? NEXT_ACTION_TEMPLATES[lang]['no-speech'] : (nextTemplate ?? ''),
  );
  const showError = !!error && (
    <Text accessibilityRole="alert" style={{ color: '#C62828', margin: 12 }}>
      {error}
    </Text>
  );
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: primary ? '#4F46E5' : '#FFF',
        opacity: busy || pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: primary ? '#FFF' : '#1B1D22', fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F1', paddingTop: 30 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1B1D22' }}>‹ {t('speak.report')}</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() =>
            void action(async () => {
              if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
              await Sharing.shareAsync(row.fileUri.startsWith('/') ? `file://${row.fileUri}` : row.fileUri, {
                mimeType: 'audio/wav',
              });
            })
          }
          style={({ pressed }) => ({ padding: 8, opacity: pressed || busy ? 0.6 : 1 })}
        >
          <Text style={{ color: '#6C6F78' }}>{t('speak.share')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {report ? (
          <>
            <View>
              <Text style={{ fontSize: 38, fontWeight: '800', color: '#1B1D22' }}>
                {formatDuration(report.durationMs)}{' '}
                <Text style={{ fontSize: 17, color: '#9A9DA6' }}>
                  {report.targetMs ? `/ ${formatDuration(report.targetMs)}` : ''}
                </Text>
              </Text>
              <Text
                style={{
                  color: !report.targetMs ? '#9A9DA6' : report.timeVerdict === 'ok' ? '#059669' : '#D97706',
                  fontWeight: '700',
                }}
              >
                {report.targetMs ? (report.timeVerdict === 'ok' ? '✓ ' : '! ') : ''}
                {t(
                  !report.targetMs
                    ? 'speak.noTarget'
                    : report.timeVerdict === 'ok'
                      ? 'speak.timeOk'
                      : report.timeVerdict === 'under'
                        ? 'speak.timeUnder'
                        : 'speak.timeOver',
                )}
              </Text>
            </View>
            {noSpeech && (
              <Text style={{ color: '#6C6F78', backgroundColor: '#EAEAEA', padding: 12, borderRadius: 12 }}>
                {t('speak.noSpeechBanner')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['pace', 'fillers', 'pauses', 'intonation'] as const).map((key) => {
                const tile = report.tiles[key];
                const value = noSpeech ? null : tile.value;
                const detail =
                  value === null
                    ? ''
                    : key === 'pace' && tile.deltaVsPrevious !== null
                      ? `${t('speak.previousPace', { value: (value - tile.deltaVsPrevious).toFixed(1) })} → ${t(tile.deltaVsPrevious < 0 ? 'speak.paceCalmer' : tile.deltaVsPrevious > 0 ? 'speak.paceFaster' : 'speak.paceSame')}`
                      : key === 'fillers'
                        ? Object.entries(fillerCounts)
                            .map(([name, count]) => `'${name}' ${count}`)
                            .join(' · ')
                        : key === 'pauses' && pauses.length
                          ? t('speak.longestPause', {
                              value: (Math.max(...pauses.map((p) => p.durationMs)) / 1000).toFixed(1),
                            })
                          : key === 'intonation'
                            ? t('speak.pitchRange', { value: value.toFixed(1) })
                            : '';
                return (
                  <View key={key} style={[box, { width: '48%', minHeight: 105 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6C6F78', fontWeight: '700' }}>{t(`speak.${key}`)}</Text>
                      <Text
                        style={{
                          color: value === null ? '#6C6F78' : tile.status === 'good' ? '#059669' : '#D97706',
                          backgroundColor:
                            value === null ? '#EEEEEE' : tile.status === 'good' ? '#DCFCE7' : '#FEF3C7',
                          borderRadius: 8,
                          paddingHorizontal: 5,
                        }}
                      >
                        {t(
                          value === null
                            ? 'speak.neutral'
                            : tile.status === 'good'
                              ? 'speak.good'
                              : 'speak.caution',
                        )}
                      </Text>
                    </View>
                    <Text style={{ color: '#1B1D22', fontSize: 24, fontWeight: '800', marginTop: 8 }}>
                      {value === null ? '—' : Number(value.toFixed(1))}{' '}
                      <Text style={{ fontSize: 12 }}>
                        {value === null
                          ? ''
                          : t(
                              tile.unit === 'syl/s'
                                ? 'speak.syllablesPerSecond'
                                : tile.unit === 'wpm'
                                  ? 'speak.wordsPerMinute'
                                  : tile.unit === 'semitones'
                                    ? 'speak.semitones'
                                    : tile.unit === 'pauses'
                                      ? 'speak.pausesUnit'
                                      : 'speak.countUnit',
                            )}
                      </Text>
                    </Text>
                    {!!detail && (
                      <Text style={{ color: '#9A9DA6', fontSize: 12, marginTop: 4 }}>{detail}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={{ backgroundColor: '#EEF0FF', borderRadius: 20, padding: 16 }}>
              <Text style={{ color: '#4F46E5', fontWeight: '800' }}>{t('speak.next')}</Text>
              <Text style={{ color: '#333276', lineHeight: 22, marginTop: 6 }}>{next}</Text>
            </View>
            {!!analysis?.syllableTimesMs.length && (
              <PaceGraph
                analysis={analysis}
                language={transcript?.language ?? lang}
                boundaries={boundaries}
                title={t('speak.paceGraph')}
              />
            )}
            {!!report.sections.length && (
              <View style={box}>
                <Text style={{ color: '#1B1D22', fontWeight: '800', marginBottom: 12 }}>
                  {t('speak.sectionResults')}
                </Text>
                {report.sections.map((section) => {
                  const max = Math.max(section.budgetMs ?? 0, section.actualMs, 1);
                  return (
                    <View key={section.id} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#1B1D22', fontWeight: '700' }}>{section.name}</Text>
                        <Text style={{ color: '#6C6F78' }}>
                          {formatDuration(section.actualMs)}
                          {section.budgetMs !== null ? ` / ${formatDuration(section.budgetMs)}` : ''}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 10,
                          borderColor: '#A8A4F3',
                          borderWidth: 1,
                          borderStyle: 'dashed',
                          borderRadius: 5,
                          width: `${((section.budgetMs ?? 0) / max) * 100}%`,
                          marginTop: 6,
                        }}
                      />
                      <View
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            section.budgetMs && section.actualMs > section.budgetMs * 1.2
                              ? '#D97706'
                              : '#4F46E5',
                          width: `${(section.actualMs / max) * 100}%`,
                          marginTop: -9,
                        }}
                      />
                      {section.pace !== null && (
                        <Text style={{ color: '#6C6F78', fontSize: 12 }}>
                          {t('speak.pace')}: {section.pace.toFixed(1)}
                        </Text>
                      )}
                      {!!section.missed.length && (
                        <Text style={{ color: '#D97706', fontSize: 12 }}>
                          {t('speak.missed')}: {section.missed.join(' · ')}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: '#6C6F78' }}>{t('speak.reportUnavailable')}</Text>
        )}
        <View style={box}>
          <Text style={{ color: '#1B1D22', fontWeight: '800', marginBottom: 10 }}>
            {t('speak.transcript')}
          </Text>
          {transcript?.state === 'done' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              {!transcript.words.length && <Text style={{ color: '#1B1D22' }}>{transcript.text}</Text>}
              {transcript.words.map((word, i) => (
                <View key={`${word.start_ms}-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {pauses
                    .filter(
                      (p) =>
                        p.endMs <= word.start_ms && (i === 0 || p.endMs > transcript.words[i - 1].start_ms),
                    )
                    .map((p) => (
                      <Text
                        key={`${p.startMs}-${p.endMs}`}
                        style={{ color: '#B45309', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 3 }}
                      >
                        ⏸{(p.durationMs / 1000).toFixed(1)}s{' '}
                      </Text>
                    ))}
                  <Pressable
                    disabled={busy}
                    onPress={() => void action(() => VcAudio.play(row.fileUri, word.start_ms))}
                    style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}
                  >
                    <Text
                      style={{
                        color: fillerIndices.has(i) ? '#D97706' : '#1B1D22',
                        backgroundColor: fillerIndices.has(i) ? '#FEF3C7' : 'transparent',
                        fontSize: 16,
                        lineHeight: 28,
                      }}
                    >
                      {word.w}{' '}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#6C6F78' }}>
              {row.transcriptState === 'no_speech'
                ? t('speak.noSpeech')
                : row.transcriptState === 'failed' || (!row.transcriptState && !row.asrPath)
                  ? t('speak.failed')
                  : row.transcriptState === 'pending'
                    ? t('speak.offline')
                    : t('speak.transcribing')}
            </Text>
          )}
        </View>
        {showError}
      </ScrollView>
      {busy && <ActivityIndicator accessibilityLabel={t('speak.listen')} color="#4F46E5" />}
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#F6F5F1' }}>
        {button(
          playing ? `Ⅱ ${t('speak.listen')}` : `▶ ${t('speak.listen')}`,
          () =>
            void action(() =>
              playing
                ? VcAudio.pause()
                : playback === 'paused'
                  ? VcAudio.resume()
                  : VcAudio.play(row.fileUri),
            ),
        )}
        {button(
          t('speak.again'),
          () => {
            router.dismissTo({
              pathname: '/(tabs)/speak',
              params: {
                planId: row.planId ?? '',
                targetMs: String(report?.targetMs ?? 0),
                repeat: String(Date.now()),
              },
            });
          },
          true,
        )}
      </View>
    </View>
  );
}

function PaceGraph({
  analysis,
  language,
  boundaries,
  title,
}: {
  analysis: SpeechTakeAnalysis;
  language: 'ko' | 'en';
  boundaries: number[];
  title: string;
}) {
  const band = paceBand(language);
  const duration = Math.max(analysis.durationMs, 1);
  const max = band.fastAbove * 1.7;
  const y = (v: number) => 90 - Math.min(1, v / max) * 75;
  const points: string[] = [];
  for (let ms = 0; ms <= duration; ms += 1000) {
    const start = Math.max(0, ms - 10000);
    const count = analysis.syllableTimesMs.filter((time) => time >= start && time <= ms).length;
    const rate = (count / (Math.max(1000, ms - start) / 1000)) * (language === 'en' ? 40 : 1);
    points.push(`${points.length ? 'L' : 'M'}${(ms / duration) * 320} ${y(rate)}`);
  }
  return (
    <View style={box}>
      <Text style={{ fontWeight: '800', marginBottom: 8 }}>{title}</Text>
      <Svg width="100%" height={100} viewBox="0 0 320 100" preserveAspectRatio="none">
        <Rect
          x={0}
          y={y(band.fastAbove)}
          width={320}
          height={y(band.slowBelow) - y(band.fastAbove)}
          fill="#DCFCE7"
        />
        {boundaries.map((time) => (
          <Line
            key={time}
            x1={(time / duration) * 320}
            x2={(time / duration) * 320}
            y1={5}
            y2={90}
            stroke="#AAA"
            strokeDasharray="4 4"
          />
        ))}
        <Path d={points.join(' ')} fill="none" stroke="#4F46E5" strokeWidth={2} />
      </Svg>
    </View>
  );
}
