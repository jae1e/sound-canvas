import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import VlcSessionService, {
  type ModelDownloadProgressEvent,
  type ModelStatus,
  type TtsLabEngineId,
  type TtsLabEngineInfo,
  type TtsLabEvent,
  type TtsLabPrepareResult,
  type TtsLabVoice,
} from '../modules/vlc-session-service';
import { Btn, Row, Section, styles } from './ui';

const KO_TEXT = '파스타 1분 남았어요. 버섯 다 됐는지 확인해 주세요.';
const EN_TEXT = 'One minute left on the pasta. Please check whether the mushrooms are done.';

/** Engines that need a downloaded model set before they can run. */
const MODEL_SET: Partial<Record<TtsLabEngineId, string>> = {
  supertonic: 'tts-supertonic',
  kokoro: 'tts-kokoro-en',
};

type LabResult = {
  requestId: string;
  engine: TtsLabEngineId;
  voice: string | null;
  lang: string;
  latencyMs?: number;
  routeLabel?: string;
  routeOk?: boolean;
  outcome?: string;
  message?: string | null;
  totalMs?: number;
  info?: Record<string, unknown>;
};

const mb = (n: number) => (n / 1e6).toFixed(1);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '-');

function statusText(r: TtsLabPrepareResult | undefined): string {
  if (!r) return 'not prepared';
  const { ok, error, ...rest } = r;
  const extra = Object.entries(rest)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');
  return `${ok ? 'READY' : 'NOT READY'}${error ? `: ${error}` : ''}${extra ? `\n${extra}` : ''}`;
}

export function TtsLabPanel({ note, onModelsChanged }: { note: (m: string) => void; onModelsChanged: () => void }) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [text, setText] = useState(KO_TEXT);
  const [engines, setEngines] = useState<TtsLabEngineInfo[]>([]);
  const [status, setStatus] = useState<Partial<Record<TtsLabEngineId, TtsLabPrepareResult>>>({});
  const [voices, setVoices] = useState<Partial<Record<TtsLabEngineId, TtsLabVoice[]>>>({});
  const [selected, setSelected] = useState<Partial<Record<TtsLabEngineId, string | null>>>({});
  const [localOnly, setLocalOnly] = useState(true);
  const [results, setResults] = useState<LabResult[]>([]);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [progress, setProgress] = useState('');
  const [mlkitProgress, setMlkitProgress] = useState('');
  const [ownPlayback, setOwnPlayback] = useState(false);
  const [sampleRate, setSampleRate] = useState('24000');
  const [busy, setBusy] = useState<string | null>(null);
  const pendingMeta = useRef<Record<string, { voice: string | null; lang: string }>>({});

  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';

  const refreshModels = useCallback(async () => {
    setModels(await VlcSessionService.getModelStatus());
    onModelsChanged();
  }, [onModelsChanged]);

  useEffect(() => {
    setEngines(VlcSessionService.ttsLabEngines());
    refreshModels().catch(() => {});
    const subs = [
      VlcSessionService.addListener('ttsLabEvent', (e: TtsLabEvent) => {
        if (e.phase === 'requested') {
          const meta = pendingMeta.current[e.requestId] ?? { voice: null, lang: '' };
          setResults((prev) => [{ requestId: e.requestId, engine: e.engine, voice: meta.voice, lang: meta.lang }, ...prev].slice(0, 30));
          return;
        }
        setResults((prev) =>
          prev.map((r) =>
            r.requestId !== e.requestId
              ? r
              : {
                  ...r,
                  latencyMs: e.latencyMs ?? r.latencyMs,
                  routeLabel: e.routeLabel ?? r.routeLabel,
                  routeOk: e.routeOk ?? r.routeOk,
                  outcome: e.outcome ?? (e.phase === 'error' ? 'error' : r.outcome),
                  message: e.message ?? r.message,
                  totalMs: e.totalMs ?? r.totalMs,
                  info: { ...r.info, ...e.info },
                },
          ),
        );
      }),
      VlcSessionService.addListener('ttsLabProgress', (e) => {
        setMlkitProgress(`${e.voice}: ${e.phase} ${mb(e.bytes)}/${mb(e.totalBytes)} MB`);
      }),
      VlcSessionService.addListener('modelDownloadProgress', (e: ModelDownloadProgressEvent) => {
        if (e.setId.startsWith('tts-')) {
          setProgress(`${e.setId}/${e.file} ${e.phase} ${mb(e.fileBytes)}/${mb(e.fileTotalBytes)} MB  total ${(e.overallFraction * 100).toFixed(0)}%`);
        }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [refreshModels]);

  const switchLang = (l: 'ko' | 'en') => {
    setLang(l);
    setText((t) => (t === KO_TEXT || t === EN_TEXT ? (l === 'ko' ? KO_TEXT : EN_TEXT) : t));
    setStatus({});
    setVoices({});
    setSelected({});
  };

  const prepare = async (id: TtsLabEngineId) => {
    setBusy(id);
    try {
      const r = await VlcSessionService.ttsLabPrepare(id, locale);
      setStatus((s) => ({ ...s, [id]: r }));
      if (r.ok || id === 'mlkit') {
        const v = await VlcSessionService.ttsLabVoices(id, locale);
        setVoices((s) => ({ ...s, [id]: v }));
        setSelected((s) => {
          if (s[id]) return s;
          const first = v.find((x) => x.installed !== false && !x.networkRequired && x.status !== 'DOWNLOADABLE') ?? v[0];
          return { ...s, [id]: first?.name ?? null };
        });
      }
    } catch (e) {
      setStatus((s) => ({ ...s, [id]: { ok: false, error: String(e) } }));
    } finally {
      setBusy(null);
    }
  };

  const speak = (id: TtsLabEngineId) => {
    const voice = selected[id] ?? null;
    try {
      const rid = VlcSessionService.ttsLabSpeak(id, text, locale, voice);
      pendingMeta.current[rid] = { voice, lang };
      // The native side also emits 'requested'; seed here in case that event raced ahead of the return value.
      setResults((prev) => (prev.some((r) => r.requestId === rid) ? prev : [{ requestId: rid, engine: id, voice, lang }, ...prev].slice(0, 30)));
    } catch (e) {
      note(`speak failed: ${e}`);
    }
  };

  const downloadSet = async (setId: string) => {
    setBusy(setId);
    try {
      await VlcSessionService.downloadModels([setId]);
      note(`${setId} downloaded and verified`);
    } catch (e) {
      note(`download ${setId} failed: ${e}`);
    } finally {
      setBusy(null);
      refreshModels().catch(() => {});
    }
  };

  const visible = useMemo(() => engines.filter((e) => (lang === 'ko' ? e.supportsKo : e.supportsEn)), [engines, lang]);

  return (
    <Section title="6b. TTS A/B test">
      <Row>
        <Btn label="ko-KR" active={lang === 'ko'} onPress={() => switchLang('ko')} />
        <Btn label="en-US" active={lang === 'en'} onPress={() => switchLang('en')} />
        <Btn label="Stop" onPress={() => VlcSessionService.ttsLabStop()} />
      </Row>
      <TextInput style={[styles.input, { minHeight: 56 }]} value={text} onChangeText={setText} multiline />
      <Text style={styles.small}>
        Latency = tap to first audio (engine start callback, or first PCM written to our AudioTrack). Press Prepare once per engine
        and language first so the number excludes load time. Each result also shows the output device used.
      </Text>

      {visible.map((eng) => {
        const setId = MODEL_SET[eng.id];
        const set = setId ? models.find((m) => m.id === setId) : undefined;
        const vs = voices[eng.id] ?? [];
        const shown = eng.id.startsWith('platform') && localOnly ? vs.filter((v) => !v.networkRequired) : vs;
        return (
          <View key={eng.id} style={styles.transcript}>
            <Text style={{ fontWeight: '700' }}>{eng.label}</Text>
            <Text style={styles.small}>{eng.inProcess ? 'plays in our process (own AudioTrack)' : 'plays in the engine process'}</Text>
            {setId && (
              <Row>
                <Text style={styles.mono}>
                  model {setId}: {set?.ready ? 'READY' : 'missing'} ({set ? mb(set.totalBytes) : '?'} MB)
                </Text>
                {!set?.ready && <Btn label={busy === setId ? 'Downloading...' : 'Download'} disabled={busy === setId} onPress={() => downloadSet(setId)} />}
                {busy === setId && <Btn label="Cancel" onPress={() => VlcSessionService.cancelModelDownload()} />}
              </Row>
            )}
            <Row>
              <Btn label={busy === eng.id ? 'Preparing...' : 'Prepare'} disabled={busy === eng.id} onPress={() => prepare(eng.id)} />
              <Btn label="Speak" onPress={() => speak(eng.id)} />
            </Row>
            <Text style={styles.mono}>{statusText(status[eng.id])}</Text>

            {eng.id.startsWith('platform') && (
              <Row>
                <Text style={styles.small}>Local (offline) voices only</Text>
                <Switch value={localOnly} onValueChange={setLocalOnly} />
              </Row>
            )}
            {eng.id === 'mlkit' && (
              <>
                <Row>
                  <Text style={styles.small}>Also play chunks with our AudioTrack (SDK may already play: double audio)</Text>
                  <Switch
                    value={ownPlayback}
                    onValueChange={(v) => {
                      setOwnPlayback(v);
                      VlcSessionService.ttsLabSetMlKitPlayback(v, Number(sampleRate) || 24000);
                    }}
                  />
                </Row>
                <Row>
                  <Text style={styles.small}>Assumed PCM16 mono rate</Text>
                  <TextInput
                    style={styles.input}
                    value={sampleRate}
                    keyboardType="number-pad"
                    onChangeText={(v) => {
                      setSampleRate(v);
                      VlcSessionService.ttsLabSetMlKitPlayback(ownPlayback, Number(v) || 24000);
                    }}
                  />
                </Row>
                {selected.mlkit && vs.find((v) => v.name === selected.mlkit)?.status === 'DOWNLOADABLE' && (
                  <Btn
                    label={busy === 'mlkit-dl' ? 'Downloading voice...' : `Download voice ${selected.mlkit}`}
                    disabled={busy === 'mlkit-dl'}
                    onPress={async () => {
                      setBusy('mlkit-dl');
                      try {
                        const r = await VlcSessionService.ttsLabDownloadVoice(selected.mlkit as string);
                        note(r.ok ? `ML Kit voice ${selected.mlkit} downloaded` : `ML Kit download: ${r.error}`);
                      } catch (e) {
                        note(`ML Kit download error: ${e}`);
                      } finally {
                        setBusy(null);
                        prepare('mlkit');
                      }
                    }}
                  />
                )}
                {!!mlkitProgress && <Text style={styles.mono}>{mlkitProgress}</Text>}
              </>
            )}
            {shown.length > 0 && (
              <Row>
                {shown.map((v) => (
                  <Btn
                    key={v.name}
                    label={v.label}
                    active={selected[eng.id] === v.name}
                    onPress={() => setSelected((s) => ({ ...s, [eng.id]: v.name }))}
                  />
                ))}
              </Row>
            )}
          </View>
        );
      })}
      {!!progress && <Text style={styles.mono}>{progress}</Text>}

      <Text style={{ fontWeight: '700' }}>Results (newest first)</Text>
      {results.map((r) => (
        <View key={r.requestId} style={styles.transcript}>
          <Text style={styles.mono}>
            {r.engine} {r.voice ? `[${r.voice}]` : ''} {r.lang} {r.requestId}
            {'\n'}first audio: {r.latencyMs != null ? `${r.latencyMs} ms` : r.outcome ? '-' : '...'}   total: {r.totalMs != null ? `${r.totalMs} ms` : '...'}   {r.outcome ?? ''}
          </Text>
          <Text style={[styles.mono, r.routeOk === false && { color: '#a83a0c', fontWeight: '700' }]}>
            output: {r.routeLabel ?? '...'}
            {r.routeOk === false ? '   (WARNING: not speaker / selected device)' : ''}
          </Text>
          {r.message ? <Text style={[styles.mono, { color: '#a83a0c' }]}>{r.message}</Text> : null}
          {r.info && (r.info.genMs != null || r.info.chunks != null) ? (
            <Text style={styles.mono}>
              {r.info.genMs != null
                ? `generation ${num(r.info.genMs)} ms, audio ${num(r.info.audioSec, 2)} s, RTF ${num(r.info.rtf, 2)}, first chunk ${num(r.info.firstChunkMs)} ms, ${num(r.info.sampleRate)} Hz`
                : `ML Kit chunks ${num(r.info.chunks)}, ${num(r.info.pcmBytes)} bytes`}
              {r.info.method ? `\nroute method: ${String(r.info.method)}` : ''}
            </Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}
