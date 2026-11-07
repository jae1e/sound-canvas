import { IMPROMPTU_TOPICS, INTERVIEW_QUESTIONS, pickRandom } from '@vlc/voice-analysis';
import { desc, eq } from 'drizzle-orm';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { DevicesEvent, FrameEvent, TakeStopped } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import {
  incrementSpeechPractice,
  listSpeechPlans,
  saveSpeechPlan,
  updateSpeechTake,
  type StoredSpeechPlan,
} from '../../src/db/repos/speech';
import { useTranslation } from '../../src/i18n';
import { AudioBar } from '../../src/recorder/AudioBar';
import { InputSheet, OutputSheet } from '../../src/recorder/DeviceSheets';
import { RecordButton } from '../../src/recorder/RecordButton';
import { Sheet } from '../../src/recorder/Sheet';
import { formatDuration } from '../../src/recorder/SingControls';
import { Toast } from '../../src/recorder/Toast';
import { useMonitor } from '../../src/recorder/useMonitor';
import { persistStoppedTake } from '../../src/recorder/takePersistence';
import { reconcileTakes, saveStartedTake } from '../../src/recorder/reconcile';
import { useSettings } from '../../src/settings/store';
import { speechBaseline } from '../../src/speech-coach/baseline';
import { ActivePractice } from '../../src/speech-coach/ActivePractice';
import { PlanEditor, newPlan } from '../../src/speech-coach/PlanEditor';
import { ensureSpeechAnalysis, processSpeechQueue } from '../../src/speech-coach/processing';
import { VoiceStrip } from '../../src/speech-coach/VoiceStrip';

type SheetName = 'input' | 'output' | 'timer' | 'pacer' | 'plans' | null;
const card = {
  backgroundColor: '#FFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#ECE9E2',
  padding: 16,
} as const;
const ink = '#1B1D22';
export default function SpeakTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const repeat = useLocalSearchParams<{ planId?: string; targetMs?: string; repeat?: string }>();
  const { frames, state } = useMonitor();
  const [frame, setFrame] = useState<FrameEvent | null>(null);
  const [devices, setDevices] = useState<DevicesEvent | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const language = useSettings((s) => s.language);
  const speechSettings = useSettings((s) => s.settings);
  const [editor, setEditor] = useState<StoredSpeechPlan | null>(null);
  const [plans, setPlans] = useState<StoredSpeechPlan[]>([]);
  const [plan, setPlan] = useState<StoredSpeechPlan | null>(null);
  const [target, setTarget] = useState(0);
  const [pacer, setPacer] = useState(0);
  const [lastId, setLastId] = useState<string | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [practiceNumber, setPracticeNumber] = useState(1);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [boundaries, setBoundaries] = useState<number[]>([]);
  const takeId = useRef<string | null>(null);
  const [preparing, setPreparing] = useState<number | null>(null);
  const recentPrompts = useRef<string[]>([]);
  useEffect(() => {
    if (!repeat.repeat) return;
    const selected = listSpeechPlans(getDb()).find((p) => p.id === repeat.planId) ?? null;
    setPlan(selected);
    setTarget(
      repeat.targetMs === undefined ? (selected?.targetMs ?? 0) : Math.max(0, Number(repeat.targetMs) || 0),
    );
  }, [repeat.repeat, repeat.planId, repeat.targetMs]);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const focused = useRef(false);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pacerBusy, setPacerBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showError = useCallback(() => setToast(t('speak.error')), [t]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const id = setInterval(() => setFrame(frames.current.values().at(-1) ?? null), 100);
    return () => clearInterval(id);
  }, [frames]);
  useEffect(() => {
    const sub = VcAudio.addListener('onDevices', setDevices);
    void VcAudio.getDevices().then(setDevices).catch(showError);
    return () => sub.remove();
  }, [showError]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void VcAudio.stopBeat().catch(showError);
      const freshPlans = listSpeechPlans(getDb());
      setPlans(freshPlans);
      setPlan((selected) => (selected ? (freshPlans.find((p) => p.id === selected.id) ?? selected) : null));
      recentPrompts.current = freshPlans
        .map((p) => p.promptId)
        .filter((id): id is string => !!id)
        .slice(0, 10);
      return () => {
        focused.current = false;
        setPreparing(null);
        if (recordingRef.current) void VcAudio.stopTake().catch(showError);
        void VcAudio.stopBeat().catch(showError);
        setPacer(0);
      };
    }, [showError]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPreparing(null);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    navigation.setOptions({
      headerShown: !recording,
      tabBarStyle: recording ? { display: 'none' } : undefined,
    });
    if (recording) void activateKeepAwakeAsync('speech-take').catch(showError);
    else deactivateKeepAwake('speech-take');
    return () => {
      deactivateKeepAwake('speech-take');
      navigation.setOptions({ headerShown: true, tabBarStyle: undefined });
    };
  }, [recording, navigation, showError]);
  useEffect(() => {
    const rows = getDb()
      .select()
      .from(takes)
      .where(eq(takes.kind, 'speech'))
      .orderBy(desc(takes.createdAt))
      .all();
    setLastId(rows.find((row) => row.planId === (plan?.id ?? null) && row.reportJson)?.id ?? null);
  }, [plan, recording]);
  const finish = useCallback(
    async (take: TakeStopped) => {
      recordingRef.current = false;
      setRecording(false);
      setFinishing(true);
      if (take.reason === 'error' || take.reason === 'permission') showError();
      try {
        persistStoppedTake(getDb(), take);
        await reconcileTakes();
        await ensureSpeechAnalysis(take.id);
        setLastId(take.id);
        void processSpeechQueue().catch(showError);
        if (take.reason === 'user' && focused.current)
          router.push({ pathname: '/speech-report/[id]', params: { id: take.id } });
      } catch {
        showError();
      } finally {
        setFinishing(false);
      }
    },
    [router, showError],
  );
  useEffect(() => {
    const sub = VcAudio.addListener('onTakeStopped', (take) => {
      if (recordingRef.current) void finish(take);
    });
    return () => sub.remove();
  }, [finish]);
  const startOrStop = useCallback(async () => {
    if (busy || finishing) return;
    setBusy(true);
    try {
      if (recordingRef.current) await VcAudio.stopTake();
      else {
        if (
          Platform.OS === 'android' &&
          (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)) !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          setToast(t('common.coach.permission'));
          return;
        }
        if (!focused.current || AppState.currentState !== 'active') {
          setToast(t('speak.returnFirst'));
          return;
        }
        const started = await VcAudio.startTake({ kind: 'speech' });
        recordingRef.current = true;
        setRecording(true);
        setStartMs(started.startMs);
        takeId.current = started.id;
        setSectionIndex(0);
        setBoundaries([]);
        try {
          const db = getDb();
          const number = plan
            ? plan.practiceCount + 1
            : db
                .select()
                .from(takes)
                .where(eq(takes.kind, 'speech'))
                .all()
                .filter((row) => row.planId === null).length + 1;
          setPracticeNumber(number);
          db.transaction(() => {
            saveStartedTake(started, 'speech');
            updateSpeechTake(db, started.id, { planId: plan?.id ?? null, boundariesJson: '[]' });
            db.update(takes)
              .set({
                title: `${plan?.title ?? t('speak.free')} · ${t('speak.nth', { count: number })}`,
                beatJson: JSON.stringify({
                  speechPlan: plan ? { ...plan, targetMs: target } : null,
                  targetMs: target,
                }),
              })
              .where(eq(takes.id, started.id))
              .run();
            if (plan) incrementSpeechPractice(db, plan.id);
          });
          if (!focused.current || AppState.currentState !== 'active') {
            await VcAudio.stopTake().catch(() => undefined);
            recordingRef.current = false;
            setRecording(false);
            void reconcileTakes()
              .then(() => processSpeechQueue(started.id))
              .catch(showError);
          }
        } catch (error) {
          await VcAudio.stopTake();
          throw error;
        }
      }
    } catch {
      showError();
    } finally {
      setBusy(false);
    }
  }, [busy, finishing, plan, showError, t, target]);
  useEffect(() => {
    if (preparing === null) return;
    if (preparing <= 0) {
      setPreparing(null);
      void startOrStop();
      return;
    }
    const timer = setTimeout(() => setPreparing(preparing - 1), 1000);
    return () => clearTimeout(timer);
  }, [preparing, startOrStop]);
  const toggle = () => {
    if (!recordingRef.current && (plan?.kind === 'impromptu' || plan?.kind === 'interview')) setPreparing(20);
    else void startOrStop();
  };
  const nextSection = () => {
    if (!plan || sectionIndex >= plan.sections.length - 1 || !takeId.current) {
      setToast(t('speak.nextSection'));
      return;
    }
    const next = [...boundaries, Math.max(0, VcAudio.nowMs() - startMs)];
    try {
      updateSpeechTake(getDb(), takeId.current, { boundariesJson: JSON.stringify(next) });
      setBoundaries(next);
      setSectionIndex(sectionIndex + 1);
    } catch {
      showError();
    }
  };
  const changePacer = async (rate: number) => {
    if (pacerBusy) return;
    setPacerBusy(true);
    try {
      if (rate) {
        await VcAudio.setBeat({ bpm: rate, beatsPerBar: 4, pattern: 'click', volume: 0.3, pacer: true });
        await VcAudio.startBeat();
      } else await VcAudio.stopBeat();
      setPacer(rate);
      setSheet(null);
    } catch {
      showError();
    } finally {
      setPacerBusy(false);
    }
  };
  const selectPrompt = (kind: 'impromptu' | 'interview') => {
    const prompt = pickRandom(
      (kind === 'impromptu' ? IMPROMPTU_TOPICS : INTERVIEW_QUESTIONS).filter((p) => p.lang === language),
      recentPrompts.current,
    );
    if (prompt) recentPrompts.current = [...recentPrompts.current, prompt.id].slice(-10);
    if (!prompt) {
      showError();
      return;
    }
    const created = {
      ...(plan?.kind === kind ? plan : newPlan()),
      kind,
      title: prompt.title,
      promptId: prompt.id,
      targetMs: 60000,
      lang: language,
      updatedAt: Date.now(),
    };
    try {
      saveSpeechPlan(getDb(), created);
      setPlan(created);
      setTarget(60000);
      setPlans(listSpeechPlans(getDb()));
      setSheet(null);
    } catch {
      showError();
    }
  };
  const choice = (label: string, action: () => void, selected = false) => (
    <Pressable
      key={label}
      onPress={action}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: selected ? '#EEF0FF' : '#F6F5F1',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: ink, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  const promptText = [...IMPROMPTU_TOPICS, ...INTERVIEW_QUESTIONS].find((p) => p.id === plan?.promptId)?.text;
  if (recording)
    return (
      <View style={{ flex: 1, backgroundColor: '#F6F5F1', paddingTop: 36 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18 }}>
          <Text style={{ color: '#6C6F78' }}>
            {plan?.title ?? t('speak.free')} · {t('speak.nth', { count: practiceNumber })}
          </Text>
          <Text style={{ color: '#FF3B30', fontWeight: '800' }}>● {t('speak.recording')}</Text>
        </View>
        <ActivePractice
          plan={plan}
          target={target}
          startMs={startMs}
          sectionIndex={sectionIndex}
          sectionStart={boundaries.at(-1) ?? 0}
          frames={frames}
          busy={busy}
          onNext={nextSection}
          onStop={() => void startOrStop()}
          prompt={promptText}
          language={language}
          hidePace={speechSettings.hideSpeechPace}
          baseline={
            speechSettings.learnSpeechBaseline
              ? speechBaseline(
                  getDb().select().from(takes).all(),
                  plan?.lang === 'auto' || !plan ? language : plan.lang,
                )
              : null
          }
        />
        <Toast message={toast} />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F1' }}>
      <AudioBar
        theme="light"
        devices={devices}
        level={frame?.rmsDb ?? -100}
        onInput={() => (devices?.locked ? setToast(t('common.coach.locked')) : setSheet('input'))}
        onOutput={() => (devices?.locked ? setToast(t('common.coach.locked')) : setSheet('output'))}
      />
      {state.silenced && (
        <Text style={{ textAlign: 'center', color: '#B45309' }}>{t('common.coach.silenced')}</Text>
      )}
      {state.reason === 'permission' && (
        <Text style={{ textAlign: 'center', color: '#B45309' }}>{t('common.coach.permission')}</Text>
      )}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}>
        <Pressable
          onPress={() => setSheet('plans')}
          style={({ pressed }) => [card, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800' }}>{t('speak.plan')}</Text>
          <Text style={{ color: ink, fontSize: 21, fontWeight: '800', marginTop: 5 }}>
            {plan?.title ?? t('speak.free')}
          </Text>
          <Text style={{ color: '#6C6F78', marginTop: 4 }}>
            {plan
              ? `${t('speak.target')} ${target ? formatDuration(target) : t('speak.none')}`
              : t('speak.addPlan')}
          </Text>
          {!!promptText && <Text style={{ color: ink, fontSize: 17, marginTop: 12 }}>{promptText}</Text>}
          {plan?.sections.map((section, i) => (
            <View
              key={section.id}
              style={{ borderTopWidth: 1, borderTopColor: '#ECE9E2', marginTop: 10, paddingTop: 10 }}
            >
              <Text style={{ color: ink, fontWeight: '700' }}>
                {i + 1}. {section.name} {section.budgetMs ? ` · ${formatDuration(section.budgetMs)}` : ''}
              </Text>
              <Text numberOfLines={2} style={{ color: '#6C6F78', fontSize: 12, marginTop: 4 }}>
                {section.keyPoints.join(' · ')}
              </Text>
            </View>
          ))}
        </Pressable>
        {!!promptText && (
          <Pressable
            onPress={() => selectPrompt(plan!.kind as 'impromptu' | 'interview')}
            style={({ pressed }) => [card, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: '#4F46E5', fontWeight: '700' }}>{t('speak.redraw')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() =>
            lastId
              ? router.push({ pathname: '/speech-report/[id]' as never, params: { id: lastId } } as never)
              : setToast(t('speak.noPrevious'))
          }
          style={({ pressed }) => [card, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ fontWeight: '800', color: ink }}>
            {t('speak.previous')} {lastId ? '›' : ''}
          </Text>
          <Text style={{ color: '#6C6F78', marginTop: 4 }}>
            {lastId ? t('speak.report') : t('speak.noPrevious')}
          </Text>
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <VoiceStrip frames={frames} />
        </View>
      </ScrollView>
      {(busy || finishing) && (
        <ActivityIndicator accessibilityLabel={t('speak.reportUnavailable')} color="#4F46E5" />
      )}
      {preparing !== null && (
        <Pressable
          onPress={() => setPreparing(null)}
          style={({ pressed }) => ({ alignItems: 'center', padding: 10, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: '#4F46E5', fontSize: 22, fontWeight: '800' }}>
            {t('speak.preparing', { time: formatDuration(preparing * 1000) })} · {t('speak.preparingCancel')}
          </Text>
        </Pressable>
      )}
      <View
        style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}
      >
        {choice(`◷ ${target ? formatDuration(target) : t('speak.none')}`, () => setSheet('timer'))}
        <RecordButton
          theme="light"
          recording={recording}
          disabled={busy || finishing || preparing !== null}
          label={t(recording ? 'speak.stop' : 'speak.record')}
          onPress={() => void toggle()}
        />
        {choice(`♩ ${pacer || t('speak.off')}`, () => setSheet('pacer'))}
      </View>
      <InputSheet
        visible={sheet === 'input'}
        onClose={() => setSheet(null)}
        theme="light"
        devices={devices}
        rmsDb={frame?.rmsDb}
        onError={showError}
      />
      <OutputSheet
        visible={sheet === 'output'}
        onClose={() => setSheet(null)}
        theme="light"
        devices={devices}
        onError={showError}
      />
      <Sheet
        visible={sheet === 'timer'}
        onClose={() => setSheet(null)}
        theme="light"
        title={t('speak.timer')}
      >
        {[0, 1, 2, 3, 5, 10].map((m) =>
          choice(
            m ? t('speak.minutes', { count: m }) : t('speak.none'),
            () => {
              setTarget(m * 60000);
              setSheet(null);
            },
            target === m * 60000,
          ),
        )}
      </Sheet>
      <Sheet
        visible={sheet === 'pacer'}
        onClose={() => setSheet(null)}
        theme="light"
        title={t('speak.pacer')}
      >
        {pacerBusy && <ActivityIndicator accessibilityLabel={t('speak.pacer')} color="#4F46E5" />}
        {[0, 60, 80, 100, 120].map((n) =>
          choice(n ? `${n} BPM` : t('speak.off'), () => void changePacer(n), pacer === n),
        )}
      </Sheet>
      <Sheet
        visible={sheet === 'plans'}
        onClose={() => setSheet(null)}
        theme="light"
        title={t('speak.choosePlan')}
      >
        {choice(
          t('speak.free'),
          () => {
            setPlan(null);
            setTarget(0);
            setSheet(null);
          },
          !plan,
        )}
        {plans.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ flex: 1 }}>
              {choice(
                `${p.title} · ${t('speak.practiceCount', { count: p.practiceCount })}`,
                () => {
                  setPlan(p);
                  setTarget(p.targetMs);
                  setSheet(null);
                },
                plan?.id === p.id,
              )}
            </View>
            {choice('✎', () => {
              setSheet(null);
              setEditor(p);
            })}
          </View>
        ))}
        {choice(t('speak.newPlan'), () => {
          setSheet(null);
          setEditor(newPlan());
        })}
        {choice(t('speak.impromptu'), () => selectPrompt('impromptu'))}
        {choice(t('speak.interview'), () => selectPrompt('interview'))}
        {choice(t('speak.scriptMode'), () => {
          setSheet(null);
          setEditor(newPlan('script'));
        })}
      </Sheet>
      {editor && (
        <PlanEditor
          key={editor.id}
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={(p) => {
            saveSpeechPlan(getDb(), p);
            setPlans(listSpeechPlans(getDb()));
            setPlan(p);
            setTarget(p.targetMs);
            setEditor(null);
            setToast(t('speak.saved'));
          }}
        />
      )}
      <Toast message={toast} />
    </View>
  );
}
