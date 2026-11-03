import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Share, StyleSheet, Switch, Text, View, type Permission } from 'react-native';

import VlcSessionService, {
  type ModelDownloadProgressEvent,
  type ModelStatus,
  type SttEngineId,
  type SttFinalEvent,
  type SttLangMode,
  type SttMicMode,
  type SttSupport,
  type SttTiming,
} from '../modules/vlc-session-service';
import { analyzeFinal, type LabParse } from './sttParse';
import { Btn, Row, Section, styles } from './ui';

type HistoryRow = SttFinalEvent & { parse: LabParse; alternatives: string[] };

const ACTIVE_STATES = new Set(['starting', 'loading', 'listening', 'processing', 'speech_timeout', 'segmented_session_end']);
const BY_LABEL: Record<string, string> = {
  platform_detection: 'platform language detection',
  dual_decode: 'dual decode (ko+en, log-prob)',
  script: 'script of recognized text',
  requested: 'language you selected',
  prior_retry: 'prior / retry in other language',
};

const mb = (n: number) => (n / 1e6).toFixed(1);
const time = (ms: number) => new Date(ms).toLocaleTimeString();
const ms = (n: number | null | undefined) => (n == null ? '-' : `${Math.round(n)} ms`);
const timingLine = (t: SttTiming | undefined): string =>
  t
    ? `ready ${ms(t.readyMs)} | begin->1st partial ${ms(t.beginToFirstPartialMs)} | end->final ${ms(t.endToFinalMs)}${t.speechEndRt == null ? ' (no end event)' : ''} | last partial->final ${ms(t.lastPartialToFinalMs)} | ${t.partials} partials${t.lateEvents ? ` | ${t.lateEvents} late event(s) ignored` : ''}`
    : 'no timing';
/** Raw timestamps relative to listenStartRt (ms), "-" when the event did not happen. */
const timingTimes = (t: SttTiming | undefined): string => {
  if (!t || t.listenStartRt == null) return '';
  const base = t.listenStartRt;
  const r = (v: number | null) => (v == null ? '-' : String(v - base));
  return `rt+ listen 0, ready ${r(t.readyRt)}, begin ${r(t.speechBeginRt)}, 1st partial ${r(t.firstPartialRt)}, last partial ${r(t.lastPartialRt)}, end ${r(t.speechEndRt)}, final ${r(t.finalRt)}`;
};
const dev = (d: unknown): string => {
  const x = d as { typeName?: string; productName?: string | null } | null | undefined;
  return x?.typeName ? `${x.typeName}${x.productName ? `(${x.productName})` : ''}` : 'none';
};

function describeRoute(e: Record<string, unknown>): string {
  switch (e.kind) {
    case 'communication_device':
      return `comm device requested ${dev(e.requested)}, active ${dev(e.active)}, ok=${String(e.ok)}${e.reason ? ` (${e.reason})` : ''}`;
    case 'record_route':
      return `record_route (our AudioRecord): ${dev(e.routedDevice)}${e.preferredOk === false ? ', preferred device rejected' : ''}`;
    case 'recording_configs': {
      const cfgs = (e.configs as { clientAudioSource: number; device: unknown }[]) ?? [];
      return `system recording configs: ${cfgs.map((c) => `src ${c.clientAudioSource} -> ${dev(c.device)}`).join('; ') || 'none'}; comm device ${dev(e.communicationDevice)}`;
    }
    case 'platform_recognizer_input':
      return String(e.note);
    case 'silent_input':
      return `WARNING: mic delivered only zeros for ${String(e.frames)} frames`;
    case 'released':
      return 'communication device released (MODE_NORMAL)';
    default:
      return JSON.stringify(e);
  }
}

export function SttLabPanel({ note, sessionRunning }: { note: (m: string) => void; sessionRunning: boolean }) {
  const [engine, setEngine] = useState<SttEngineId>('platform');
  const [lang, setLang] = useState<SttLangMode>('auto');
  const [mic, setMic] = useState<SttMicMode>('phone');
  const [segmented, setSegmented] = useState(true);
  const [active, setActive] = useState(false);
  const [stateLine, setStateLine] = useState('idle');
  const [pathLabel, setPathLabel] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [live, setLive] = useState<{ text: string; final: boolean }>({ text: '', final: false });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [support, setSupport] = useState<SttSupport | null>(null);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [downloadInfo, setDownloadInfo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [platformDl, setPlatformDl] = useState('');
  const [route, setRoute] = useState('');
  const [detectInfo, setDetectInfo] = useState('no onLanguageDetection callback seen yet');
  const [lastError, setLastError] = useState('');
  const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});
  const langRef = useRef(lang);
  langRef.current = lang;

  const refreshSupport = useCallback(async () => {
    try {
      setSupport(await VlcSessionService.sttSupport());
    } catch (e) {
      note(`stt support failed: ${e}`);
    }
  }, [note]);
  const refreshModels = useCallback(async () => setModels(await VlcSessionService.getModelStatus()), []);

  useEffect(() => {
    setActive(VlcSessionService.sttIsRunning());
    refreshSupport().catch(() => {});
    refreshModels().catch(() => {});
    const subs = [
      VlcSessionService.addListener('sttState', (e) => {
        setStateLine(e.state + (e.detail && Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : ''));
        if (e.path) setPathLabel(e.path);
        if (e.state === 'stopped' || e.state === 'error') {
          setActive(false);
          setLevel(0);
        } else if (ACTIVE_STATES.has(e.state)) {
          setActive(true);
        }
      }),
      VlcSessionService.addListener('sttPartial', (e) => setLive({ text: e.text, final: false })),
      VlcSessionService.addListener('sttFinal', (e) => {
        setLive({ text: e.text, final: true });
        const alternatives = Array.isArray(e.details?.alternatives) ? (e.details.alternatives as string[]) : [];
        const parse = analyzeFinal(e.text, alternatives, e.lang);
        setLive({ text: parse.chosen, final: true });
        const row: HistoryRow = { ...e, parse, alternatives };
        setHistory((h) => [row, ...h].slice(0, 100));
      }),
      VlcSessionService.addListener('sttError', (e) => {
        setLastError(`${time(e.atEpochMs)} ${e.code}: ${e.message}`);
        setErrorCounts((c) => ({ ...c, [e.code]: (c[e.code] ?? 0) + 1 }));
        if (!e.recoverable) note(`STT ${e.code}: ${e.message}`);
      }),
      VlcSessionService.addListener('sttLevel', (e) => setLevel(e.level)),
      VlcSessionService.addListener('sttLangDetect', (e) =>
        setDetectInfo(
          `onLanguageDetection fired at ${time(e.atEpochMs)}: ${String(e.detectedTag)} (${String(e.confidenceName)}), switch result ${String(e.switchResult)}`,
        ),
      ),
      VlcSessionService.addListener('sttMicRoute', (e) => setRoute(describeRoute(e))),
      VlcSessionService.addListener('sttDownload', (e) =>
        setPlatformDl(`${e.locale}: ${e.event}${e.percent != null ? ` ${e.percent}%` : ''}`),
      ),
      VlcSessionService.addListener('modelDownloadProgress', (e: ModelDownloadProgressEvent) => {
        if (!e.setId.startsWith('tts-')) {
          setDownloadInfo(`${e.setId}/${e.file} ${e.phase} ${mb(e.fileBytes)}/${mb(e.fileTotalBytes)} MB, total ${(e.overallFraction * 100).toFixed(0)}%`);
        }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [note, refreshSupport, refreshModels]);

  const start = async () => {
    if (Platform.OS !== 'android') return;
    const needed: Permission[] = ['android.permission.RECORD_AUDIO'];
    if (mic === 'bluetooth') needed.push('android.permission.BLUETOOTH_CONNECT');
    const granted = await PermissionsAndroid.requestMultiple(needed);
    if (granted['android.permission.RECORD_AUDIO'] !== 'granted') {
      note('STT: microphone permission denied');
      return;
    }
    setLive({ text: '', final: false });
    setLastError('');
    setActive(true);
    try {
      await VlcSessionService.sttStart({ engine, lang, mic, segmented });
    } catch (e) {
      setActive(false);
      note(`sttStart failed: ${e}`);
    }
  };
  const stop = () => VlcSessionService.sttStop();

  const downloadSherpa = async () => {
    setDownloading(true);
    try {
      await VlcSessionService.downloadModels(['vad', 'ko', 'en']);
    } catch (e) {
      note(`download failed: ${e}`);
    } finally {
      setDownloading(false);
      refreshModels().catch(() => {});
      refreshSupport().catch(() => {});
    }
  };
  const downloadPlatform = async (tag: string) => {
    setPlatformDl(`${tag}: requesting...`);
    try {
      const r = await VlcSessionService.sttTriggerDownload(tag);
      setPlatformDl(`${tag}: ${r.outcome ?? (r.ok ? 'ok' : 'failed')}${r.error ? ` ${r.error}` : ''}${r.reason ? ` ${r.reason}` : ''}`);
    } catch (e) {
      setPlatformDl(`${tag}: ${e}`);
    }
    setTimeout(() => refreshSupport().catch(() => {}), 2000);
  };

  const historyText = () =>
    history
      .map(
        (h) =>
          `${time(h.finalAtEpochMs)} ${h.engine}/${h.path} [${h.lang} by ${h.detectedBy}] "${h.parse.chosen}"${h.parse.differs ? ` (top: "${h.text}", alternatives: ${JSON.stringify(h.alternatives)})` : ''} ${timingLine(h.timing)} => ${h.parse.summary}`,
      )
      .join('\n');

  const sherpaKo = models.find((m) => m.id === 'ko');
  const sherpaEn = models.find((m) => m.id === 'en');
  const sherpaVad = models.find((m) => m.id === 'vad');
  const sherpaReady = (lang === 'en' ? true : !!sherpaKo?.ready) && (lang === 'ko' ? true : !!sherpaEn?.ready);
  const blocked = sessionRunning;

  return (
    <Section title="STT lab (live speech to text)">
      <Text style={styles.small}>Plays no audio. The platform recognizer may play its own start/stop beeps; they are not suppressed.</Text>
      <Row>
        <Text>Engine</Text>
        <Btn label="Platform" active={engine === 'platform'} onPress={() => setEngine('platform')} disabled={active} testID="stt-engine-platform" />
        <Btn label="Sherpa offline" active={engine === 'sherpa'} onPress={() => setEngine('sherpa')} disabled={active} testID="stt-engine-sherpa" />
      </Row>
      <Row>
        <Text>Language</Text>
        <Btn label="Auto" active={lang === 'auto'} onPress={() => setLang('auto')} disabled={active} testID="stt-lang-auto" />
        <Btn label="한국어" active={lang === 'ko'} onPress={() => setLang('ko')} disabled={active} testID="stt-lang-ko" />
        <Btn label="English" active={lang === 'en'} onPress={() => setLang('en')} disabled={active} testID="stt-lang-en" />
      </Row>
      <Row>
        <Text>Mic</Text>
        <Btn label="Phone mic" active={mic === 'phone'} onPress={() => setMic('phone')} disabled={active} testID="stt-mic-phone" />
        <Btn label="Bluetooth headset mic" active={mic === 'bluetooth'} onPress={() => setMic('bluetooth')} disabled={active} testID="stt-mic-bt" />
      </Row>
      {engine === 'platform' ? (
        <>
          <Row>
            <Text>Segmented session (API 33+)</Text>
            <Switch value={segmented} onValueChange={setSegmented} disabled={active} />
          </Row>
          <Text style={styles.small}>
            The system recognizer chooses its own input; the mic setting above only sets the communication device as a hint, so it may
            not be honoured. Segmented sessions cannot switch language mid-session; with Auto the retry layer applies at each restart.
          </Text>
        </>
      ) : (
        <View style={[stt.warn]}>
          <Text style={stt.warnText}>Sherpa ko model: dev reference — not shippable (training-data license unclear).</Text>
          <Text style={styles.small}>
            {lang === 'auto' ? 'Auto = both models decode the same audio; the better scoring hypothesis wins.' : 'Single model decode.'} Utterances end after
            0.8 s of silence.
          </Text>
        </View>
      )}

      {blocked && <Text style={stt.warnText}>A session is running and owns the microphone. Stop it before using the STT lab.</Text>}
      <Row>
        <Btn label="Start" onPress={start} disabled={active || blocked || (engine === 'sherpa' && !sherpaReady)} testID="stt-start" />
        <Btn label="Stop" onPress={stop} disabled={!active} testID="stt-stop" />
        <View style={stt.meterTrack}>
          <View style={[stt.meterFill, { width: `${Math.round(level * 100)}%` }]} />
        </View>
      </Row>
      {engine === 'sherpa' && !sherpaReady && <Text style={styles.small}>Download the sherpa models first (below).</Text>}

      <View style={stt.liveBox} testID="stt-live-text">
        <Text style={[stt.liveText, live.final ? stt.liveFinal : stt.livePartial]}>
          {live.text || (active ? 'Listening...' : 'Press Start and speak.')}
        </Text>
      </View>
      <Text style={styles.mono}>state: {stateLine}</Text>
      <Text style={styles.mono}>
        recognizer path: {pathLabel ?? (support?.recognizerPath ?? '?')}
        {'\n'}last error: {lastError || '-'}
        {Object.keys(errorCounts).length ? `\nerror counts: ${JSON.stringify(errorCounts)}` : ''}
      </Text>
      <Text style={styles.mono}>mic route: {route || '-'}</Text>
      {lang === 'auto' && engine === 'platform' && <Text style={styles.mono}>{detectInfo}</Text>}

      <Row>
        <Btn label="Check support" onPress={refreshSupport} />
        <Btn label="Download ko-KR (platform)" onPress={() => downloadPlatform('ko-KR')} />
        <Btn label="Download en-US (platform)" onPress={() => downloadPlatform('en-US')} />
      </Row>
      <Text style={styles.mono}>
        {support
          ? `API ${support.sdk} | on-device available: ${support.onDeviceAvailable ? 'yes' : 'no'} | system recognizer: ${support.recognitionAvailable ? 'yes' : 'no'}` +
            `\nservice: ${support.defaultService ?? '?'}` +
            `\nsupport check: ${support.supportCheck ?? 'n/a'}` +
            `\ninstalled on-device: ${(support.installedOnDevice ?? []).join(', ') || 'none'}` +
            `\nsupported on-device: ${(support.supportedOnDevice ?? []).join(', ') || 'none'}` +
            `${support.pendingOnDevice?.length ? `\npending: ${support.pendingOnDevice.join(', ')}` : ''}` +
            `\nko-KR installed: ${String(support.koInstalled)} | en-US installed: ${String(support.enInstalled)}` +
            `\nlang-detection API (34+): ${support.languageDetectionApi ? 'yes' : 'no'} | segmented API (33+): ${support.segmentedSessionApi ? 'yes' : 'no'}` +
            `\nBluetooth mic: ${dev(support.bluetoothCommunicationDevice)}`
          : 'support not checked yet'}
      </Text>
      {!!platformDl && <Text style={styles.mono}>platform model download: {platformDl}</Text>}

      <Text style={styles.sectionTitle}>Sherpa models (offline engine)</Text>
      {[sherpaVad, sherpaKo, sherpaEn].map(
        (m) =>
          m && (
            <Text key={m.id} style={styles.mono}>
              {m.id}: {m.ready ? 'READY' : 'missing'} ({mb(m.totalBytes)} MB)
              {m.id === 'ko' ? '  dev reference — not shippable (training-data license unclear)' : ''}
            </Text>
          ),
      )}
      <Row>
        <Btn label={downloading ? 'Downloading...' : 'Download vad + ko + en'} onPress={downloadSherpa} disabled={downloading || active} />
        {downloading && <Btn label="Cancel" onPress={() => VlcSessionService.cancelModelDownload()} />}
      </Row>
      {!!downloadInfo && <Text style={styles.mono}>{downloadInfo}</Text>}

      <Row>
        <Text style={styles.sectionTitle}>History ({history.length})</Text>
        <Btn label="Copy / share" onPress={() => Share.share({ message: historyText() }).catch(() => {})} disabled={history.length === 0} testID="stt-copy" />
        <Btn label="Clear" onPress={() => setHistory([])} disabled={history.length === 0} testID="stt-clear" />
      </Row>
      {history.map((h) => (
        <View key={`${h.finalAtEpochMs}-${h.seq}`} style={stt.entry}>
          <Text style={styles.small}>
            {time(h.finalAtEpochMs)} | {h.engine} ({h.path}) | mic {h.mic}
          </Text>
          <Text style={styles.small}>
            [{h.lang}] by {BY_LABEL[h.detectedBy] ?? h.detectedBy}
            {h.confidence != null ? ` | conf ${h.confidence.toFixed(2)}` : ''}
            {h.requestedLang === 'auto' && h.nextLang ? ` | next try: ${h.nextLang}` : ''}
          </Text>
          <Text style={styles.transcriptText}>{h.parse.chosen}</Text>
          {h.parse.differs && (
            <Text style={[styles.small, stt.alt]}>
              alternative chosen ({h.parse.reason}); top was "{h.text}"
            </Text>
          )}
          {h.alternatives.length > 0 && <Text style={styles.small}>n-best: {[h.text, ...h.alternatives].join(' | ')}</Text>}
          <Text style={styles.small}>{timingLine(h.timing)}</Text>
          <Text style={styles.small}>{timingTimes(h.timing)}</Text>
          <Text style={[styles.small, stt.parse]}>parse: {h.parse.summary}</Text>
        </View>
      ))}
    </Section>
  );
}

const stt = StyleSheet.create({
  liveBox: { minHeight: 96, borderWidth: 1, borderColor: '#cfd6e4', borderRadius: 8, padding: 10, justifyContent: 'center', backgroundColor: '#fafbfd' },
  liveText: { fontSize: 24, lineHeight: 32 },
  livePartial: { color: '#8a8f99' },
  liveFinal: { color: '#000' },
  meterTrack: { flex: 1, minWidth: 80, height: 14, borderRadius: 7, backgroundColor: '#e3e8f0', overflow: 'hidden' },
  meterFill: { height: 14, backgroundColor: '#3a9a5b' },
  warn: { backgroundColor: '#fde3d0', borderRadius: 6, padding: 8, gap: 2 },
  warnText: { color: '#a83a0c', fontWeight: '700', fontSize: 13 },
  entry: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', paddingTop: 4, gap: 1 },
  parse: { color: '#1d5b1d', fontWeight: '700' },
  alt: { color: '#a83a0c', fontWeight: '700' },
});
