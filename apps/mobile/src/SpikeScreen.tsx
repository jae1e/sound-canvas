import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type Permission,
} from 'react-native';

import { Btn, Row, Section, styles } from './ui';
import { TtsLabPanel } from './TtsLabPanel';
import VlcSessionService, {
  type AudioDevice,
  type CapabilityReport,
  type FinalTranscriptEvent,
  type LogSummary,
  type ModelStatus,
  type RouteState,
  type SpeechOutputRoute,
  type SessionStateName,
} from '../modules/vlc-session-service';

type TranscriptRow = { key: string; text: string; latency: number; trailing: number; duringTts: boolean };
type CueStat = { id: string; driftMs: number; deliveryMs: number; audibleMs?: number; source?: string };

const PERMISSIONS: Permission[] = [
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.BLUETOOTH_CONNECT',
];

const mb = (n: number) => (n / 1e6).toFixed(1);
const fmt = (n: number | null | undefined, digits = 0) => (n == null || Number.isNaN(n) ? '-' : n.toFixed(digits));

export default function SpikeScreen() {
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [bargeIn, setBargeIn] = useState(false);
  const [perms, setPerms] = useState<Record<string, string>>({});
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [downloadInfo, setDownloadInfo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [session, setSession] = useState<SessionStateName>('stopped');
  const [sttEnabled, setSttEnabled] = useState<boolean | null>(null);
  const [partial, setPartial] = useState('');
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [cueEnabled, setCueEnabled] = useState(false);
  const [cueSeconds, setCueSeconds] = useState('60');
  const [cueStats, setCueStats] = useState<CueStat[]>([]);
  const [gps, setGps] = useState({ count: 0, accuracy: NaN, maxGap: 0, lastGap: 0 });
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [capability, setCapability] = useState<CapabilityReport | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [speechRoute, setSpeechRoute] = useState<SpeechOutputRoute | null>(null);
  const [forceSpeaker, setForceSpeaker] = useState(false);
  const [ttsInput, setTtsInput] = useState('안녕하세요, 음성 테스트입니다.');

  const cueCounter = useRef(0);
  const cueSecondsRef = useRef(60);
  const cueEnabledRef = useRef(false);
  const languageRef = useRef<'ko' | 'en'>('ko');
  languageRef.current = language;
  cueSecondsRef.current = Math.max(5, Number(cueSeconds) || 60);

  const note = useCallback((m: string) => {
    setMessages((prev) => [`${new Date().toLocaleTimeString()} ${m}`, ...prev].slice(0, 30));
  }, []);

  const refreshModels = useCallback(async () => setModels(await VlcSessionService.getModelStatus()), []);
  const refreshRoute = useCallback(async () => {
    setDevices(await VlcSessionService.listCommunicationDevices());
    setRoute(await VlcSessionService.getRouteState());
  }, []);
  const refreshSummary = useCallback(async () => setSummary(await VlcSessionService.getLogSummary()), []);

  const cueText = (n: number) => (languageRef.current === 'ko' ? `테스트 알림 ${n}번` : `Test reminder number ${n}`);

  const scheduleNext = useCallback((atEpochMs: number) => {
    cueCounter.current += 1;
    const n = cueCounter.current;
    VlcSessionService.scheduleCue(`cue-${n}`, atEpochMs, cueText(n));
  }, []);

  // Native event subscriptions (mounted once).
  useEffect(() => {
    const subs = [
      VlcSessionService.addListener('sessionState', (e) => {
        setSession(e.state);
        note(`session ${e.state}${e.detail ? ` (${e.detail})` : ''}`);
        if (e.state !== 'running') {
          cueEnabledRef.current = false;
          setCueEnabled(false);
        }
      }),
      VlcSessionService.addListener('sessionError', (e) => note(`ERROR ${e.code}: ${e.message}`)),
      VlcSessionService.addListener('pipelineState', (e) => {
        setSttEnabled(e.sttEnabled);
        note(`pipeline stt=${e.sttEnabled} load=${e.loadMs}ms`);
      }),
      VlcSessionService.addListener('audioLevel', (e) => setLevel(e.rms)),
      VlcSessionService.addListener('speechStart', (e) => {
        setPartial(e.suppressed ? '(speech during TTS: suppressed)' : '...');
      }),
      VlcSessionService.addListener('partialTranscript', (e) => setPartial(e.text)),
      VlcSessionService.addListener('finalTranscript', (e: FinalTranscriptEvent) => {
        setPartial('');
        setRows((prev) =>
          [
            { key: `${e.seq}-${e.finalEpochMs}`, text: e.text, latency: e.endpointLatencyMs, trailing: e.trailingSilenceMs, duringTts: e.duringTts },
            ...prev,
          ].slice(0, 50),
        );
      }),
      VlcSessionService.addListener('echoSuppressed', (e) => {
        setPartial('');
        note(`echo suppressed: "${e.text}"`);
      }),
      VlcSessionService.addListener('cueDue', (e) => {
        // Ack first (synchronous) so the native fallback does not fire, then speak: this is the JS path being measured.
        const acked = VlcSessionService.ackCue(e.id);
        const n = Number(e.id.replace('cue-', ''));
        VlcSessionService.speak(cueText(n), 'cue', e.id);
        setCueStats((prev) =>
          [{ id: e.id, driftMs: e.driftMs, deliveryMs: Date.now() - e.firedEpochMs }, ...prev].slice(0, 20),
        );
        if (!acked) note(`ack for ${e.id} returned false`);
        if (cueEnabledRef.current) scheduleNext(e.atEpochMs + 3 * cueSecondsRef.current * 1000);
      }),
      VlcSessionService.addListener('cueAudible', (e) => {
        setCueStats((prev) =>
          prev.map((c) => (c.id === e.id ? { ...c, audibleMs: e.fireToAudibleMs, source: e.source } : c)),
        );
      }),
      VlcSessionService.addListener('location', (e) =>
        setGps((g) => ({ ...g, count: e.count, accuracy: e.accuracy })),
      ),
      VlcSessionService.addListener('locationGap', (e) =>
        setGps((g) => ({ ...g, lastGap: e.gapMs, maxGap: Math.max(g.maxGap, e.gapMs) })),
      ),
      VlcSessionService.addListener('routeChanged', (e) => {
        setRoute(e.route);
        refreshRoute().catch(() => {});
        note(`route ${e.change}: ${e.devices.map((d) => d.typeName).join(', ')}`);
      }),
      VlcSessionService.addListener('speechOutputRoute', (e) => {
        setSpeechRoute(e);
        setForceSpeaker(e.mode === 'speaker');
      }),
      VlcSessionService.addListener('modelDownloadProgress', (e) => {
        setDownloadInfo(
          `${e.setId}/${e.file} ${e.phase} ${mb(e.fileBytes)}/${mb(e.fileTotalBytes)} MB  total ${(e.overallFraction * 100).toFixed(0)}%`,
        );
      }),
    ];
    refreshModels().catch((e) => note(`models: ${e}`));
    refreshRoute().catch((e) => note(`route: ${e}`));
    VlcSessionService.getSpeechOutputRoute().then(setSpeechRoute).catch((e) => note(`speech route: ${e}`));
    setSession(VlcSessionService.getSessionState());
    return () => subs.forEach((s) => s.remove());
  }, [note, refreshModels, refreshRoute, scheduleNext]);

  // Periodic summary refresh while running (battery start/now come from the native log).
  useEffect(() => {
    if (session !== 'running') return;
    const t = setInterval(() => refreshSummary().catch(() => {}), 20000);
    refreshSummary().catch(() => {});
    return () => clearInterval(t);
  }, [session, refreshSummary]);

  const requestPerms = async () => {
    const wanted = PERMISSIONS.filter((p) => Platform.OS === 'android');
    const res = await PermissionsAndroid.requestMultiple(wanted);
    setPerms(Object.fromEntries(Object.entries(res).map(([k, v]) => [k.replace('android.permission.', ''), v])));
    refreshRoute().catch(() => {});
  };

  const download = async () => {
    setDownloading(true);
    try {
      await VlcSessionService.downloadModels(['vad', language]);
      note('models downloaded and verified');
    } catch (e) {
      note(`download failed: ${e}`);
      Alert.alert('Download failed', String(e));
    } finally {
      setDownloading(false);
      refreshModels().catch(() => {});
    }
  };

  const start = async () => {
    try {
      setRows([]);
      setCueStats([]);
      setGps({ count: 0, accuracy: NaN, maxGap: 0, lastGap: 0 });
      await VlcSessionService.startSession({ language, bargeIn, allowMissingModels: true });
      refreshRoute().catch(() => {});
    } catch (e) {
      note(`start failed: ${e}`);
      Alert.alert('Start failed', String(e));
    }
  };

  const stop = async () => {
    cueEnabledRef.current = false;
    setCueEnabled(false);
    await VlcSessionService.stopSession();
    refreshSummary().catch(() => {});
  };

  const toggleCues = (on: boolean) => {
    if (on && session !== 'running') {
      Alert.alert('Start the session first');
      return;
    }
    cueEnabledRef.current = on;
    setCueEnabled(on);
    if (on) {
      const step = cueSecondsRef.current * 1000;
      const now = Date.now();
      for (let i = 1; i <= 3; i++) scheduleNext(now + i * step);
      note(`cues every ${cueSecondsRef.current}s scheduled`);
    } else {
      for (let n = 1; n <= cueCounter.current; n++) VlcSessionService.cancelCue(`cue-${n}`);
    }
  };

  const shareLog = async () => {
    try {
      await VlcSessionService.writeLogMarker('share_log');
      const path = VlcSessionService.getLogPath();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', path);
        return;
      }
      await Sharing.shareAsync(`file://${path}`, { mimeType: 'text/plain', dialogTitle: 'Share VLC spike log' });
    } catch (e) {
      Alert.alert('Share failed', String(e));
    }
  };

  const koReady = models.find((m) => m.id === language)?.ready;
  const vadReady = models.find((m) => m.id === 'vad')?.ready;
  const running = session === 'running';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>VLC voice pipeline spike</Text>

        <Section title="Speech output (where TTS is heard)">
          <View style={[styles.banner, speechRoute && !speechRoute.ok && styles.bannerWarn]}>
            <Text style={[styles.bannerText, speechRoute && !speechRoute.ok && styles.bannerWarnText]}>
              Speech output: {speechRoute ? speechRoute.label : '...'}
            </Text>
            {speechRoute?.warning ? <Text style={styles.bannerWarnText}>WARNING: {speechRoute.warning}</Text> : null}
          </View>
          <Row>
            <Text>Force phone speaker for speech</Text>
            <Switch
              value={forceSpeaker}
              onValueChange={async (v) => {
                setForceSpeaker(v);
                try {
                  setSpeechRoute(await VlcSessionService.setSpeechOutput(v ? 'speaker' : 'auto'));
                } catch (e) {
                  note(`setSpeechOutput failed: ${e}`);
                }
              }}
            />
            <Btn label="Refresh" onPress={async () => setSpeechRoute(await VlcSessionService.getSpeechOutputRoute())} />
          </Row>
          {speechRoute && (
            <Text style={styles.mono}>
              usage: {speechRoute.usage}  reason: {speechRoute.reason}  audio mode: {speechRoute.audioMode}
              {'\n'}planned: {speechRoute.planned.map((d) => `${d.typeName}(${d.productName ?? ''})`).join(', ') || 'none'}
              {speechRoute.trackRouted ? `\ntrack routed: ${speechRoute.trackRouted.typeName}` : ''}
              {'\n'}all outputs: {speechRoute.allOutputs.map((d) => `${d.typeName}(${d.productName ?? ''})`).join(', ')}
            </Text>
          )}
          <Text style={styles.small}>
            Updated at every TTS start and on device changes. Warning = not the phone speaker nor the communication device you picked.
          </Text>
        </Section>

        <Section title="1. Permissions">
          <Btn label="Request permissions" onPress={requestPerms} />
          <Text style={styles.mono}>{Object.entries(perms).map(([k, v]) => `${k}: ${v}`).join('\n') || 'not requested yet'}</Text>
        </Section>

        <Section title="2. Models (not bundled)">
          <Row>
            <Btn label="ko" active={language === 'ko'} onPress={() => setLanguage('ko')} disabled={running} />
            <Btn label="en" active={language === 'en'} onPress={() => setLanguage('en')} disabled={running} />
          </Row>
          {models.map((m) => (
            <Text key={m.id} style={styles.mono}>
              {m.id}: {m.ready ? 'READY' : 'missing'} ({mb(m.totalBytes)} MB)
            </Text>
          ))}
          <Row>
            <Btn label={downloading ? 'Downloading...' : `Download vad + ${language}`} onPress={download} disabled={downloading} />
            {downloading && <Btn label="Cancel" onPress={() => VlcSessionService.cancelModelDownload()} />}
          </Row>
          {!!downloadInfo && <Text style={styles.mono}>{downloadInfo}</Text>}
          <Text style={styles.small}>Selected set ready: {vadReady && koReady ? 'yes' : 'no'}</Text>
        </Section>

        <Section title="3. Session">
          <Row>
            <Text>Barge-in</Text>
            <Switch value={bargeIn} onValueChange={(v) => { setBargeIn(v); if (running) VlcSessionService.setBargeIn(v); }} />
          </Row>
          <Row>
            <Btn label="Start session" onPress={start} disabled={running || session === 'starting'} />
            <Btn label="Stop session" onPress={stop} disabled={!running} />
          </Row>
          <Text style={styles.mono}>
            state: {session}   stt: {sttEnabled == null ? '-' : String(sttEnabled)}   mic rms: {level.toFixed(4)}
          </Text>
          <Text style={styles.small}>Start while this screen is visible, then lock the phone.</Text>
        </Section>

        <Section title="4. Audio route">
          <Text style={styles.mono}>
            comm device: {route?.communicationDevice ? `${route.communicationDevice.typeName} (${route.communicationDevice.productName})` : 'none'}
            {'\n'}record routed: {route?.recordRoutedDevice ? `${route.recordRoutedDevice.typeName} (${route.recordRoutedDevice.productName})` : 'none'}
            {'\n'}audio mode: {route?.audioMode ?? '-'}
          </Text>
          <Row>
            <Btn label="Refresh" onPress={() => refreshRoute()} />
            <Btn label="Auto (clear)" onPress={async () => { await VlcSessionService.clearCommunicationDevice(); refreshRoute(); }} />
          </Row>
          {devices.map((d) => (
            <Btn
              key={d.id}
              label={`${d.typeName}  ${d.productName ?? ''}  #${d.id}`}
              active={route?.communicationDevice?.id === d.id}
              onPress={async () => {
                const r = await VlcSessionService.setCommunicationDevice(d.id);
                if (!r.ok) note(`select failed: ${r.reason ?? 'setCommunicationDevice returned false'}`);
                refreshRoute();
              }}
            />
          ))}
        </Section>

        <Section title="5. Transcripts">
          <Text style={styles.partial}>{partial || ' '}</Text>
          {rows.map((r) => (
            <View key={r.key} style={styles.transcript}>
              <Text style={styles.transcriptText}>{r.text}</Text>
              <Text style={styles.small}>
                final {r.latency} ms after VAD end (+{r.trailing} ms trailing silence){r.duringTts ? '  [barge-in]' : ''}
              </Text>
            </View>
          ))}
        </Section>

        <Section title="6. Cue test (native timer -> JS ack -> speak)">
          <Row>
            <Text>Every</Text>
            <TextInput style={styles.input} value={cueSeconds} onChangeText={setCueSeconds} keyboardType="number-pad" editable={!cueEnabled} />
            <Text>s</Text>
            <Switch value={cueEnabled} onValueChange={toggleCues} />
          </Row>
          {cueStats.map((c) => (
            <Text key={c.id} style={styles.mono}>
              {c.id}: drift {c.driftMs} ms, JS delivery {c.deliveryMs} ms, fire-to-audible {c.audibleMs ?? '...'} ms {c.source ?? ''}
            </Text>
          ))}
          <Row>
            <TextInput style={[styles.input, { flex: 1 }]} value={ttsInput} onChangeText={setTtsInput} />
            <Btn label="Speak" disabled={!running} onPress={() => VlcSessionService.speak(ttsInput, 'normal', null)} />
          </Row>
        </Section>

        <TtsLabPanel note={note} onModelsChanged={refreshModels} />

        <Section title="7. GPS / battery">
          <Text style={styles.mono}>
            fixes: {gps.count}   last accuracy: {fmt(gps.accuracy, 1)} m{'\n'}max gap: {gps.maxGap} ms   last gap: {gps.lastGap} ms
            {'\n'}battery start: {fmt(summary?.batteryFirstPct, 0)}%  now: {fmt(summary?.batteryLastPct, 0)}%  max temp: {fmt(summary?.batteryMaxTempC, 1)} C
          </Text>
        </Section>

        <Section title="8. Report">
          <Row>
            <Btn label="Capability report" onPress={async () => setCapability(await VlcSessionService.getCapabilityReport())} />
            <Btn label="Summary" onPress={refreshSummary} />
          </Row>
          <Row>
            <Btn label="Mark: earbuds" onPress={() => VlcSessionService.writeLogMarker('earbuds')} />
            <Btn label="Mark: phone mic" onPress={() => VlcSessionService.writeLogMarker('phone_mic')} />
            <Btn label="Mark: BT reconnect" onPress={() => VlcSessionService.writeLogMarker('bt_reconnect')} />
          </Row>
          <Row>
            <Btn label="Share log" onPress={shareLog} />
            <Btn label="Clear log" onPress={async () => { await VlcSessionService.clearLog(); setSummary(null); }} />
          </Row>
          {summary && <Text style={styles.mono}>{JSON.stringify(summary, null, 1)}</Text>}
          {capability && <Text style={styles.mono}>{JSON.stringify(capability, null, 1)}</Text>}
        </Section>

        <Section title="Messages">
          <Text style={styles.mono}>{messages.join('\n') || '-'}</Text>
        </Section>
      </ScrollView>
    </View>
  );
}
