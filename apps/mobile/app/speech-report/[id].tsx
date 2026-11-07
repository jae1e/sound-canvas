import { NEXT_ACTION_TEMPLATES, longPauses, type SpeechReport, type SpeechTakeAnalysis } from '@vlc/voice-analysis';
import { eq } from 'drizzle-orm';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { useTranslation } from '../../src/i18n';
import { formatDuration } from '../../src/recorder/SingControls';
import { useSettings } from '../../src/settings/store';
import { processSpeechQueue } from '../../src/speech-coach/processing';
import type { TranscriptResult } from '../../src/speech-coach/transcriptQueue';

type Row = typeof takes.$inferSelect;
function read<T>(s: string | null | undefined, fallback: T): T { try { return s ? JSON.parse(s) as T : fallback; } catch { return fallback; } }
const box = { backgroundColor: '#FFF', borderColor: '#ECE9E2', borderWidth: 1, borderRadius: 20, padding: 16 } as const;
export default function SpeechReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const [row, setRow] = useState<Row | undefined>(() => getDb().select().from(takes).where(eq(takes.id, id)).get());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    const refresh = () => { void processSpeechQueue().catch(() => undefined).finally(() => { if (live) setRow(getDb().select().from(takes).where(eq(takes.id, id)).get()); }); };
    refresh(); const timer = setInterval(refresh, 2000);
    const playback = VcAudio.addListener('onPlayback', (event) => setPlaying(event.state === 'playing'));
    return () => { live = false; clearInterval(timer); playback.remove(); void VcAudio.stop(); };
  }, [id]));
  const action = async (fn: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await fn(); } catch { setError(t('speak.error')); } finally { setBusy(false); } };
  if (!row) return <View style={{ flex: 1, padding: 20 }}><Text>{t('common.coach.none')}</Text></View>;
  const report = read<SpeechReport | null>(row.reportJson, null);
  const transcript = read<TranscriptResult | null>(row.transcriptJson, null);
  const analysis = read<SpeechTakeAnalysis | null>(row.analysisJson, null);
  const fillerIndices = new Set(report?.transcriptMarks.filter((m) => m.type === 'filler').map((m) => m.wordIndex));
  const pauses = longPauses(transcript?.words ?? [], analysis?.pauses ?? []);
  const nextTemplate = report ? NEXT_ACTION_TEMPLATES[lang][report.nextAction.code as keyof typeof NEXT_ACTION_TEMPLATES.en] : '';
  const next = Object.entries(report?.nextAction.params ?? {}).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), nextTemplate ?? '');
  const showError = !!error && <Text accessibilityRole="alert" style={{ color: '#C62828', margin: 12 }}>{error}</Text>;
  const button = (label: string, onPress: () => void, primary = false) => <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => ({ flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: primary ? '#4F46E5' : '#FFF', opacity: busy || pressed ? 0.6 : 1 })}><Text style={{ color: primary ? '#FFF' : '#1B1D22', fontWeight: '800' }}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, backgroundColor: '#F6F5F1', paddingTop: 30 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 }}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}><Text style={{ fontSize: 20, fontWeight: '800', color: '#1B1D22' }}>‹ {t('speak.report')}</Text></Pressable>
      <Pressable disabled={busy} onPress={() => void action(async () => { if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable'); await Sharing.shareAsync(row.fileUri.startsWith('/') ? `file://${row.fileUri}` : row.fileUri, { mimeType: 'audio/wav' }); })} style={({ pressed }) => ({ padding: 8, opacity: pressed || busy ? 0.6 : 1 })}><Text style={{ color: '#6C6F78' }}>{t('speak.share')}</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {report ? <><View><Text style={{ fontSize: 38, fontWeight: '800', color: '#1B1D22' }}>{formatDuration(report.durationMs)} <Text style={{ fontSize: 17, color: '#9A9DA6' }}>{report.targetMs ? `/ ${formatDuration(report.targetMs)}` : ''}</Text></Text><Text style={{ color: report.timeVerdict === 'ok' ? '#059669' : '#D97706', fontWeight: '700' }}>✓ {t(report.timeVerdict === 'ok' ? 'speak.timeOk' : report.timeVerdict === 'under' ? 'speak.timeUnder' : 'speak.timeOver')}</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['pace', 'fillers', 'pauses', 'intonation'] as const).map((key) => { const tile = report.tiles[key]; return <View key={key} style={[box, { width: '48%', minHeight: 105 }]}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#6C6F78', fontWeight: '700' }}>{t(`speak.${key}`)}</Text><Text style={{ color: tile.status === 'good' ? '#059669' : '#D97706' }}>{t(tile.status === 'good' ? 'speak.good' : 'speak.caution')}</Text></View><Text style={{ color: '#1B1D22', fontSize: 24, fontWeight: '800', marginTop: 8 }}>{tile.value === null ? '—' : Number(tile.value.toFixed(1))} <Text style={{ fontSize: 12 }}>{tile.value === null ? '' : tile.unit}</Text></Text>{tile.deltaVsPrevious !== null && <Text style={{ color: '#9A9DA6', fontSize: 12 }}>{tile.deltaVsPrevious >= 0 ? '+' : ''}{tile.deltaVsPrevious.toFixed(1)}</Text>}</View>; })}</View>
      <View style={{ backgroundColor: '#EEF0FF', borderRadius: 20, padding: 16 }}><Text style={{ color: '#4F46E5', fontWeight: '800' }}>{t('speak.next')}</Text><Text style={{ color: '#333276', lineHeight: 22, marginTop: 6 }}>{next}</Text></View>
      {!!report.sections.length && <View style={box}><Text style={{ color: '#1B1D22', fontWeight: '800', marginBottom: 12 }}>{t('speak.sectionResults')}</Text>{report.sections.map((section) => { const max = Math.max(section.budgetMs ?? 0, section.actualMs, 1); return <View key={section.id} style={{ marginBottom: 14 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#1B1D22', fontWeight: '700' }}>{section.name}</Text><Text style={{ color: '#6C6F78' }}>{formatDuration(section.actualMs)}{section.budgetMs !== null ? ` / ${formatDuration(section.budgetMs)}` : ''}</Text></View><View style={{ height: 10, borderColor: '#A8A4F3', borderWidth: 1, borderStyle: 'dashed', borderRadius: 5, width: `${(section.budgetMs ?? 0) / max * 100}%`, marginTop: 6 }} /><View style={{ height: 8, borderRadius: 4, backgroundColor: '#4F46E5', width: `${section.actualMs / max * 100}%`, marginTop: 3 }} />{section.pace !== null && <Text style={{ color: '#6C6F78', fontSize: 12 }}>{t('speak.pace')}: {section.pace.toFixed(1)}</Text>}{!!section.missed.length && <Text style={{ color: '#D97706', fontSize: 12 }}>{t('speak.missed')}: {section.missed.join(' · ')}</Text>}</View>; })}</View>}
      </> : <Text style={{ color: '#6C6F78' }}>{t('speak.reportUnavailable')}</Text>}
      <View style={box}><Text style={{ color: '#1B1D22', fontWeight: '800', marginBottom: 10 }}>{t('speak.transcript')}</Text>
        {transcript?.state === 'done' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>{!transcript.words.length && <Text style={{ color: '#1B1D22' }}>{transcript.text}</Text>}{transcript.words.map((word, i) => <View key={`${word.start_ms}-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>{pauses.filter((p) => p.endMs <= word.start_ms && (i === 0 || p.endMs > transcript.words[i - 1].start_ms)).map((p) => <Text key={`${p.startMs}-${p.endMs}`} style={{ color: '#B45309', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 3 }}>⏸{(p.durationMs / 1000).toFixed(1)}s </Text>)}<Text onPress={() => void action(() => VcAudio.play(row.fileUri, word.start_ms))} style={{ color: fillerIndices.has(i) ? '#D97706' : '#1B1D22', backgroundColor: fillerIndices.has(i) ? '#FEF3C7' : 'transparent', fontSize: 16, lineHeight: 28 }}>{word.w} </Text></View>)}</View> : <Text style={{ color: '#6C6F78' }}>{row.transcriptState === 'no_speech' ? t('speak.noSpeech') : row.transcriptState === 'failed' ? t('speak.failed') : row.transcriptState === 'pending' ? t('speak.offline') : t('speak.transcribing')}</Text>}
      </View>{showError}
    </ScrollView>
    <View style={{ flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#F6F5F1' }}>
      {button(playing ? `Ⅱ ${t('speak.listen')}` : `▶ ${t('speak.listen')}`, () => void action(() => playing ? VcAudio.pause() : VcAudio.play(row.fileUri)))}
      {button(t('speak.again'), () => { router.dismissTo({ pathname: '/(tabs)/speak', params: { planId: row.planId ?? '', targetMs: String(report?.targetMs ?? 0), repeat: String(Date.now()) } }); }, true)}
    </View>
  </View>;
}
