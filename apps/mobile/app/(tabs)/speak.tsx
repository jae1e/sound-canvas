import { desc, eq } from 'drizzle-orm';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { DevicesEvent, FrameEvent, TakeStopped } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { listSpeechPlans, updateSpeechTake, type StoredSpeechPlan } from '../../src/db/repos/speech';
import { useTranslation } from '../../src/i18n';
import { AudioBar } from '../../src/recorder/AudioBar';
import { InputSheet, OutputSheet } from '../../src/recorder/DeviceSheets';
import { RecordButton } from '../../src/recorder/RecordButton';
import { Sheet } from '../../src/recorder/Sheet';
import { formatDuration } from '../../src/recorder/SingControls';
import { Toast } from '../../src/recorder/Toast';
import { useMonitor } from '../../src/recorder/useMonitor';
import { persistAnalysis, persistStoppedTake } from '../../src/recorder/takePersistence';
import { reconcileTakes, saveStartedTake } from '../../src/recorder/reconcile';
import { VoiceStrip } from '../../src/speech-coach/VoiceStrip';

type SheetName = 'input' | 'output' | 'timer' | 'pacer' | 'plans' | null;
const card = { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#ECE9E2', padding: 16 } as const;
const ink = '#1B1D22';
export default function SpeakTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { frames, state } = useMonitor();
  const [frame, setFrame] = useState<FrameEvent | null>(null);
  const [devices, setDevices] = useState<DevicesEvent | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [plans, setPlans] = useState<StoredSpeechPlan[]>([]);
  const [plan, setPlan] = useState<StoredSpeechPlan | null>(null);
  const [target, setTarget] = useState(0);
  const [pacer, setPacer] = useState(0);
  const [lastId, setLastId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showError = useCallback(() => setToast(t('speak.error')), [t]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 3000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { const id = setInterval(() => setFrame(frames.current.values().at(-1) ?? null), 100); return () => clearInterval(id); }, [frames]);
  useEffect(() => { const sub = VcAudio.addListener('onDevices', setDevices); void VcAudio.getDevices().then(setDevices).catch(showError); return () => sub.remove(); }, [showError]);
  useFocusEffect(useCallback(() => { setPlans(listSpeechPlans(getDb())); return () => { if (recordingRef.current) void VcAudio.stopTake().catch(showError); void VcAudio.stopBeat().catch(showError); }; }, [showError]));
  useEffect(() => {
    const rows = getDb().select().from(takes).where(eq(takes.kind, 'speech')).orderBy(desc(takes.createdAt)).all();
    setLastId(rows.find((row) => row.planId === (plan?.id ?? null) && row.reportJson)?.id ?? null);
  }, [plan, recording]);
  const finish = useCallback(async (take: TakeStopped) => {
    recordingRef.current = false; setRecording(false);
    try { persistStoppedTake(getDb(), take); await reconcileTakes(); const analysis = await VcAudio.analyzeTake(take.path); persistAnalysis(getDb(), take.id, analysis); }
    catch { showError(); }
  }, [showError]);
  useEffect(() => { const sub = VcAudio.addListener('onTakeStopped', (take) => { if (recordingRef.current) void finish(take); }); return () => sub.remove(); }, [finish]);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (recordingRef.current) await VcAudio.stopTake();
      else {
        if (Platform.OS === 'android' && await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO) !== PermissionsAndroid.RESULTS.GRANTED) { setToast(t('common.coach.permission')); return; }
        const started = await VcAudio.startTake({ kind: 'speech' });
        recordingRef.current = true; setRecording(true);
        try { saveStartedTake(started, 'speech'); updateSpeechTake(getDb(), started.id, { planId: plan?.id ?? null }); }
        catch (error) { await VcAudio.stopTake(); throw error; }
      }
    } catch { showError(); } finally { setBusy(false); }
  };
  const changePacer = async (rate: number) => {
    try { if (rate) { await VcAudio.setBeat({ bpm: rate, beatsPerBar: 4, pattern: 'click', volume: 0.3, pacer: true }); await VcAudio.startBeat(); } else await VcAudio.stopBeat(); setPacer(rate); setSheet(null); }
    catch { showError(); }
  };
  const choice = (label: string, action: () => void, selected = false) => <Pressable key={label} onPress={action} style={({ pressed }) => ({ padding: 16, borderRadius: 14, marginBottom: 8, backgroundColor: selected ? '#EEF0FF' : '#F6F5F1', opacity: pressed ? 0.6 : 1 })}><Text style={{ color: ink, fontWeight: '700' }}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, backgroundColor: '#F6F5F1' }}>
    <AudioBar theme="light" devices={devices} level={frame?.rmsDb ?? -100} onInput={() => devices?.locked ? setToast(t('common.coach.locked')) : setSheet('input')} onOutput={() => devices?.locked ? setToast(t('common.coach.locked')) : setSheet('output')} />
    {state.silenced && <Text style={{ textAlign: 'center', color: '#B45309' }}>{t('common.coach.silenced')}</Text>}
    {state.reason === 'permission' && <Text style={{ textAlign: 'center', color: '#B45309' }}>{t('common.coach.permission')}</Text>}
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}>
      <Pressable onPress={() => setSheet('plans')} style={({ pressed }) => [card, { opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800' }}>{t('speak.plan')}</Text>
        <Text style={{ color: ink, fontSize: 21, fontWeight: '800', marginTop: 5 }}>{plan?.title ?? t('speak.free')}</Text>
        <Text style={{ color: '#6C6F78', marginTop: 4 }}>{plan ? `${t('speak.target')} ${target ? formatDuration(target) : t('speak.none')}` : t('speak.addPlan')}</Text>
        {plan?.sections.map((section, i) => <View key={section.id} style={{ borderTopWidth: 1, borderTopColor: '#ECE9E2', marginTop: 10, paddingTop: 10 }}><Text style={{ color: ink, fontWeight: '700' }}>{i + 1}. {section.name} {section.budgetMs ? ` · ${formatDuration(section.budgetMs)}` : ''}</Text><Text numberOfLines={2} style={{ color: '#6C6F78', fontSize: 12, marginTop: 4 }}>{section.keyPoints.join(' · ')}</Text></View>)}
      </Pressable>
      <Pressable onPress={() => lastId ? router.push({ pathname: '/speech-report/[id]' as never, params: { id: lastId } } as never) : setToast(t('speak.noPrevious'))} style={({ pressed }) => [card, { opacity: pressed ? 0.7 : 1 }]}><Text style={{ fontWeight: '800', color: ink }}>{t('speak.previous')} {lastId ? '›' : ''}</Text><Text style={{ color: '#6C6F78', marginTop: 4 }}>{lastId ? t('speak.report') : t('speak.noPrevious')}</Text></Pressable>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}><VoiceStrip frames={frames} /></View>
    </ScrollView>
    <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
      {choice(`◷ ${target ? formatDuration(target) : t('speak.none')}`, () => setSheet('timer'))}
      <RecordButton theme="light" recording={recording} disabled={busy} label={t(recording ? 'speak.stop' : 'speak.record')} onPress={() => void toggle()} />
      {choice(`♩ ${pacer || t('speak.off')}`, () => setSheet('pacer'))}
    </View>
    <InputSheet visible={sheet === 'input'} onClose={() => setSheet(null)} theme="light" devices={devices} rmsDb={frame?.rmsDb} onError={showError} />
    <OutputSheet visible={sheet === 'output'} onClose={() => setSheet(null)} theme="light" devices={devices} onError={showError} />
    <Sheet visible={sheet === 'timer'} onClose={() => setSheet(null)} theme="light" title={t('speak.timer')}>{[0, 1, 2, 3, 5, 10].map((m) => choice(m ? t('speak.minutes', { count: m }) : t('speak.none'), () => { setTarget(m * 60000); setSheet(null); }, target === m * 60000))}</Sheet>
    <Sheet visible={sheet === 'pacer'} onClose={() => setSheet(null)} theme="light" title={t('speak.pacer')}>{[0, 60, 80, 100, 120].map((n) => choice(n ? `${n} BPM` : t('speak.off'), () => void changePacer(n), pacer === n))}</Sheet>
    <Sheet visible={sheet === 'plans'} onClose={() => setSheet(null)} theme="light" title={t('speak.choosePlan')}>
      {choice(t('speak.free'), () => { setPlan(null); setTarget(0); setSheet(null); }, !plan)}
      {plans.map((p) => choice(`${p.title} · ${t('speak.practiceCount', { count: p.practiceCount })}`, () => { setPlan(p); setTarget(p.targetMs); setSheet(null); }, plan?.id === p.id))}
    </Sheet>
    <Toast message={toast} />
  </View>;
}
