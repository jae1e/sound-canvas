import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, Pressable, StatusBar, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type {
  DevicesEvent,
  FrameEvent,
  TakeAnalysis,
  TakeStopped,
} from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { useTranslation } from '../../src/i18n';
import { AudioBar } from '../../src/recorder/AudioBar';
import { InputSheet, OutputSheet } from '../../src/recorder/DeviceSheets';
import { PitchRoll, Waveform } from '../../src/recorder/LiveGraphs';
import { NoteReadout } from '../../src/recorder/NoteReadout';
import { RecordButton } from '../../src/recorder/RecordButton';
import { BeatSheet, DEFAULT_BEAT, type BeatSettings } from '../../src/recorder/BeatSheet';
import { Toast } from '../../src/recorder/Toast';
import { BeatDots, BottomControls } from '../../src/recorder/SingControls';
import { ResultCard } from '../../src/recorder/ResultCard';
import { listStoredTakes } from '../../src/db/repos/coach';
import { persistAnalysis, persistStoppedTake } from '../../src/recorder/takePersistence';
import { reconcileTakes, saveStartedTake } from '../../src/recorder/reconcile';
import { useMonitor } from '../../src/recorder/useMonitor';
import { setUpdateRecording } from '../../src/update/updater';

export default function SingTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { frames, state } = useMonitor();
  const [frame, setFrame] = useState<FrameEvent | null>(null);
  const [devices, setDevices] = useState<DevicesEvent | null>(null);
  const [sheet, setSheet] = useState<'input' | 'output' | 'beat' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startMs = useRef(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [lastTake, setLastTake] = useState<{ path: string; durationMs: number } | null>(null);
  const [result, setResult] = useState<{ id: string; durationMs: number; analysis: TakeAnalysis } | null>(
    null,
  );
  const [beat, setBeat] = useState<BeatSettings>(DEFAULT_BEAT);
  const showError = useCallback(() => {
    setToast(t('common.coach.error'));
  }, [t]);
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;
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
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsedMs(Math.max(0, VcAudio.nowMs() - startMs.current)), 250);
    return () => clearInterval(id);
  }, [recording]);
  useEffect(() => {
    recordingRef.current = recording;
    setUpdateRecording(recording);
    if (recording) void activateKeepAwakeAsync('take').catch(showError);
    else deactivateKeepAwake('take');
    return () => {
      setUpdateRecording(false);
      deactivateKeepAwake('take');
    };
  }, [recording, showError]);
  const finish = useCallback(
    async (take: TakeStopped) => {
      setRecording(false);
      try {
        persistStoppedTake(getDb(), take);
        await reconcileTakes();
        const analysis = await VcAudio.analyzeTake(take.path, { beatTimesMs: take.beatTimesMs });
        persistAnalysis(getDb(), take.id, analysis);
        const durationMs = take.durationMs || analysis.durationMs;
        setLastTake({ path: take.path, durationMs });
        setResult({ id: take.id, durationMs, analysis });
      } catch {
        showError();
      }
    },
    [showError],
  );
  useEffect(() => {
    const sub = VcAudio.addListener('onTakeStopped', (take) => {
      void finish(take);
    });
    return () => sub.remove();
  }, [finish]);
  useFocusEffect(
    useCallback(
      () => () => {
        if (recordingRef.current) void VcAudio.stopTake().catch(() => showErrorRef.current());
      },
      [],
    ),
  );
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (recording) await VcAudio.stopTake();
      else {
        if (Platform.OS === 'android') {
          const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
            setToast(t('common.coach.permission'));
            return;
          }
        }
        const started = await VcAudio.startTake({ kind: 'song', countIn: beat.countIn });
        setRecording(true);
        setResult(null);
        startMs.current = started.startMs;
        setElapsedMs(Math.max(0, VcAudio.nowMs() - started.startMs));
        try {
          saveStartedTake(
            started,
            'song',
            beat.enabled ? { bpm: beat.bpm, pattern: beat.pattern } : undefined,
          );
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
  };
  useEffect(() => {
    const sub = VcAudio.addListener('onBeat', (event) => setBeatIndex(event.beat));
    return () => sub.remove();
  }, []);
  useFocusEffect(
    useCallback(() => {
      const last = listStoredTakes(getDb()).find((take) => take.durationMs && take.durationMs > 0);
      setLastTake(last ? { path: last.fileUri, durationMs: last.durationMs ?? 0 } : null);
    }, []),
  );
  const changeBeat = useCallback(
    async (next: BeatSettings, persist = true) => {
      try {
        await VcAudio.setBeat({
          bpm: next.bpm,
          beatsPerBar: next.beatsPerBar,
          pattern: next.pattern,
          volume: 0.7,
        });
        if (next.enabled) await VcAudio.startBeat();
        else await VcAudio.stopBeat();
        setBeat(next);
        if (persist) await SecureStore.setItemAsync('vc.beatSettings', JSON.stringify(next));
      } catch {
        showError();
      }
    },
    [showError],
  );
  useEffect(() => {
    void SecureStore.getItemAsync('vc.beatSettings')
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<BeatSettings>;
        const patterns = ['click', 'eight', 'sixteen', 'ballad', 'shuffle', 'bossa', 'hiphop'];
        if (
          typeof saved.bpm !== 'number' ||
          saved.bpm < 30 ||
          saved.bpm > 240 ||
          ![2, 3, 4, 6].includes(saved.beatsPerBar ?? 0) ||
          !patterns.includes(saved.pattern ?? '') ||
          typeof saved.countIn !== 'boolean' ||
          typeof saved.enabled !== 'boolean'
        )
          return;
        void changeBeat(saved as BeatSettings, false);
      })
      .catch(showError);
  }, [changeBeat, showError]);
  useFocusEffect(
    useCallback(() => {
      if (beat.enabled)
        void VcAudio.setBeat({
          bpm: beat.bpm,
          beatsPerBar: beat.beatsPerBar,
          pattern: beat.pattern,
          volume: 0.7,
        })
          .then(() => VcAudio.startBeat())
          .catch(showError);
    }, [beat.enabled, beat.bpm, beat.beatsPerBar, beat.pattern, showError]),
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#0E1117' }}>
      <AudioBar
        theme="dark"
        devices={devices}
        level={frame?.rmsDb ?? -100}
        onInput={() => (devices?.locked ? setToast(t('common.coach.locked')) : setSheet('input'))}
        onOutput={() => (devices?.locked ? setToast(t('common.coach.locked')) : setSheet('output'))}
      />
      {state.silenced && (
        <Text style={{ color: '#FBBF24', textAlign: 'center', padding: 8 }}>
          {t('common.coach.silenced')}
        </Text>
      )}
      {state.reason === 'permission' && (
        <Pressable onPress={() => void Linking.openSettings()}>
          <Text style={{ color: '#FBBF24', textAlign: 'center', padding: 8 }}>
            {t('common.coach.permission')} · {t('common.coach.openSettings')}
          </Text>
        </Pressable>
      )}
      <NoteReadout
        midi={frame?.midi ?? null}
        hz={frame?.f0 ?? null}
        theme="dark"
        emptyLabel={t('common.coach.empty')}
      />
      <PitchRoll frames={frames} theme="dark" />
      {beat.enabled && <BeatDots beat={beatIndex} count={beat.beatsPerBar} />}
      <Waveform frames={frames} theme="dark" />
      {result && (
        <ResultCard
          analysis={result.analysis}
          durationMs={result.durationMs}
          onPress={() => router.push({ pathname: '/take/[id]', params: { id: result.id } })}
        />
      )}
      <BottomControls
        beat={beat}
        onBeat={() => setSheet('beat')}
        recording={recording}
        busy={busy}
        elapsedMs={elapsedMs}
        onRecord={() => void toggle()}
        lastDuration={lastTake?.durationMs ?? null}
        onPlay={() => {
          if (lastTake) void VcAudio.play(lastTake.path).catch(showError);
        }}
      />
      <InputSheet
        visible={sheet === 'input'}
        onClose={() => setSheet(null)}
        theme="dark"
        devices={devices}
        rmsDb={frame?.rmsDb ?? -100}
        onError={showError}
      />
      <OutputSheet
        visible={sheet === 'output'}
        onClose={() => setSheet(null)}
        theme="dark"
        devices={devices}
        onError={showError}
      />
      <BeatSheet
        visible={sheet === 'beat'}
        onClose={() => setSheet(null)}
        theme="dark"
        value={beat}
        onChange={(next) => {
          void changeBeat(next);
        }}
      />
      <Toast message={toast} />
    </View>
  );
}
