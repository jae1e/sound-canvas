import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { eq } from 'drizzle-orm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, Pressable, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type {
  DevicesEvent,
  FrameEvent,
  TakeAnalysis,
  TakeStopped,
} from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { useTranslation } from '../../src/i18n';
import { AudioBar } from '../../src/recorder/AudioBar';
import { InputSheet, OutputSheet } from '../../src/recorder/DeviceSheets';
import { PitchRoll, Waveform } from '../../src/recorder/LiveGraphs';
import { NoteReadout } from '../../src/recorder/NoteReadout';
import { RecordButton } from '../../src/recorder/RecordButton';
import { BeatSheet, type BeatSettings } from '../../src/recorder/BeatSheet';
import { Toast } from '../../src/recorder/Toast';
import { nextTip, rangeLabel, stabilityLabel } from '../../src/recorder/derive';
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
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<{ id: string; analysis: TakeAnalysis } | null>(null);
  const [beat, setBeat] = useState<BeatSettings>({
    bpm: 92,
    beatsPerBar: 4,
    pattern: 'click',
    countIn: true,
    enabled: false,
  });
  const showError = useCallback(() => {
    setToast(t('common.coach.error'));
  }, [t]);
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
    const id = setInterval(() => setSeconds((v) => v + 1), 1000);
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
        await reconcileTakes();
        const analysis = await VcAudio.analyzeTake(take.path, { beatTimesMs: take.beatTimesMs });
        getDb()
          .update(takes)
          .set({ analysisJson: JSON.stringify(analysis) })
          .where(eq(takes.id, take.id))
          .run();
        setResult({ id: take.id, analysis });
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
        if (recordingRef.current) void VcAudio.stopTake().catch(showError);
      },
      [showError],
    ),
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
        setSeconds(0);
        try {
          saveStartedTake(started, 'song');
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
  const changeBeat = async (next: BeatSettings) => {
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
    } catch {
      showError();
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#0E1117' }}>
      <AudioBar
        theme="dark"
        devices={devices}
        level={frame?.peak ?? 0}
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
      <Waveform frames={frames} theme="dark" />
      {result && (
        <Pressable
          onPress={() => router.push({ pathname: '/take/[id]', params: { id: result.id } })}
          style={({ pressed }) => ({
            marginHorizontal: 16,
            padding: 12,
            marginBottom: 8,
            backgroundColor: '#171C25',
            borderRadius: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: '#E8EBF1', fontWeight: '700' }}>{t('common.coach.saved')} ›</Text>
          <Text style={{ color: '#5EEAD4', marginTop: 4 }}>
            {t('common.coach.range')}{' '}
            {rangeLabel(result.analysis.rangeLowMidi, result.analysis.rangeHighMidi) ?? '—'} ·{' '}
            {t('common.coach.stability')}{' '}
            {t(`common.coach.stability.${stabilityLabel(result.analysis.stabilityCents)}`)}
            {result.analysis.beatOffsetMs !== null ? ` · ${Math.round(result.analysis.beatOffsetMs)} ms` : ''}
          </Text>
          <Text style={{ color: '#8A93A5', marginTop: 4 }}>
            {t(`common.coach.tip.${nextTip(result.analysis.stabilityCents, result.analysis.beatOffsetMs)}`)}
          </Text>
        </Pressable>
      )}
      {recording && (
        <Text style={{ color: '#FF3B30', textAlign: 'center', fontWeight: '700' }}>
          ● {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </Text>
      )}
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 12 }}
      >
        <Pressable
          onPress={() => {
            setSheet('beat');
            if (!beat.enabled) void changeBeat({ ...beat, enabled: true });
          }}
          style={{ padding: 14, backgroundColor: '#171C25', borderRadius: 16 }}
        >
          <Text style={{ color: beat.enabled ? '#5EEAD4' : '#8A93A5' }}>
            {t('common.coach.beat')} {beat.enabled ? beat.bpm : '○'}
          </Text>
        </Pressable>
        <RecordButton
          theme="dark"
          recording={recording}
          disabled={busy}
          label={t(recording ? 'common.coach.stop' : 'common.coach.record')}
          onPress={() => void toggle()}
        />
        <View style={{ width: 60 }} />
      </View>
      <InputSheet
        visible={sheet === 'input'}
        onClose={() => setSheet(null)}
        theme="dark"
        devices={devices}
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
