import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import VlcSessionService, {
  type ModelDownloadProgressEvent,
  type ModelStatus,
  type TtsLabEngineId,
  type TtsLabEngineInfo,
  type TtsLabEvent,
  type TtsLabPrepareResult,
  type TtsLabPreparedEvent,
  type TtsLabSelfTestRow,
  type TtsLabSelfTestDone,
  type TtsLabRoutePreview,
  type MusicVolume,
  type TtsLabVoice,
} from '../modules/vlc-session-service';
import { Btn, PercentSlider, Row, Section, styles } from './ui';

const KO_TEXT = '파스타 1분 남았어요. 버섯 다 됐는지 확인해 주세요.';
const EN_TEXT = 'One minute left on the pasta. Please check whether the mushrooms are done.';

/** Engines that need a downloaded model set before they can run. */
const MODEL_SETS: Partial<Record<TtsLabEngineId, string[]>> = {
  supertonic: ['tts-supertonic'],
  kitten: ['tts-kitten-en', 'tts-lexicon-en'],
  kokoro: ['tts-kokoro-en', 'tts-lexicon-en'],
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
  output?: string;
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
  // Several operations can run at once (a download and a prepare of another engine), so busy is a map key -> start time.
  const [busyMap, setBusyMap] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);
  // null = system route (Auto); otherwise an AudioDeviceInfo id from the preview's outputs list.
  const [outputId, setOutputId] = useState<number | null>(null);
  const [volume, setVolume] = useState<MusicVolume | null>(null);
  const [selfTest, setSelfTest] = useState<TtsLabSelfTestRow[]>([]);
  const [selfTestState, setSelfTestState] = useState<string>('');
  const [steps, setSteps] = useState<8 | 16>(8);
  const [routePreview, setRoutePreview] = useState<TtsLabRoutePreview | null>(null);
  const pendingMeta = useRef<Record<string, { voice: string | null; lang: string; output: string }>>({});
  const busy = (k: string) => k in busyMap;
  const setBusyKey = (k: string, on: boolean) =>
    setBusyMap((m) => {
      const n = { ...m };
      if (on) n[k] = Date.now();
      else delete n[k];
      return n;
    });
  const busyLabel = (k: string, idle: string, working: string) =>
    k in busyMap ? `${working} ${Math.round((Date.now() - busyMap[k]) / 1000)} s` : idle;
  const anyBusy = Object.keys(busyMap).length > 0;
  useEffect(() => {
    if (!anyBusy) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [anyBusy]);

  const outputRef = useRef<number | null>(outputId);
  outputRef.current = outputId;
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';

  const refreshModels = useCallback(async () => {
    setModels(await VlcSessionService.getModelStatus());
    onModelsChanged();
  }, [onModelsChanged]);

  const refreshRoute = useCallback(async (o: number | null) => {
    try {
      const p = await VlcSessionService.ttsLabPreviewRoute(o);
      setRoutePreview(p);
      setVolume(p.music);
      // The selected device was unplugged: fall back to the system route.
      if (o !== null && !p.outputs.some((d) => d.id === o)) setOutputId(null);
    } catch (e) {
      note(`route preview failed: ${e}`);
    }
  }, [note]);
  useEffect(() => {
    refreshRoute(outputId).catch(() => {});
  }, [outputId, refreshRoute]);
  // Hardware volume keys change STREAM_MUSIC behind our back: poll so the slider follows.
  useEffect(() => {
    const t = setInterval(() => {
      try {
        setVolume(VlcSessionService.ttsLabGetVolume());
      } catch {
        /* module not ready */
      }
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const applyPrepared = useCallback((id: TtsLabEngineId, r: TtsLabPrepareResult) => {
    setStatus((s) => ({ ...s, [id]: r }));
  }, []);

  useEffect(() => {
    setEngines(VlcSessionService.ttsLabEngines());
    refreshModels().catch((e) => note(`model status failed: ${e}`));
    const subs = [
      VlcSessionService.addListener('ttsLabPrepared', (e: TtsLabPreparedEvent) => applyPrepared(e.engine, e.result)),
      VlcSessionService.addListener('ttsLabSelfTest', (r: TtsLabSelfTestRow) => setSelfTest((p) => [...p, r])),
      VlcSessionService.addListener('ttsLabSelfTestDone', (d: TtsLabSelfTestDone) => {
        refreshModels().catch(() => {});
        setSelfTestState(`done: ${d.okCount}/${d.count} ok${d.cancelled ? ' (cancelled)' : ''}${d.failed.length ? `\nfailed: ${d.failed.join('; ')}` : ''}`);
      }),
      VlcSessionService.addListener('speechOutputRoute', () => {
        refreshRoute(outputRef.current).catch(() => {});
      }),
      VlcSessionService.addListener('ttsLabEvent', (e: TtsLabEvent) => {
        if (e.phase === 'requested') {
          const meta = pendingMeta.current[e.requestId] ?? { voice: null, lang: '', output: '' };
          setResults((prev) =>
            prev.some((r) => r.requestId === e.requestId)
              ? prev
              : [{ requestId: e.requestId, engine: e.engine, voice: meta.voice, lang: meta.lang, output: e.outputSelection ?? meta.output }, ...prev].slice(0, 30),
          );
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
  }, [refreshModels, note, refreshRoute, applyPrepared]);

  // Sherpa voices are static lists (Supertonic F1-F5 / M1-M5, Kokoro names): show them before the first Prepare.
  useEffect(() => {
    (['supertonic', 'kitten', 'kokoro'] as const).forEach((id) => {
      VlcSessionService.ttsLabVoices(id, locale)
        .then((v) => {
          setVoices((s) => (s[id]?.length ? s : { ...s, [id]: v }));
          setSelected((s) => (s[id] ? s : { ...s, [id]: v[0]?.name ?? null }));
        })
        .catch((e) => note(`${id} voices failed: ${e}`));
    });
  }, [locale, note]);

  const switchLang = (l: 'ko' | 'en') => {
    setLang(l);
    setText((t) => (t === KO_TEXT || t === EN_TEXT ? (l === 'ko' ? KO_TEXT : EN_TEXT) : t));
    setStatus({});
    setVoices({});
    setSelected({});
  };

  const prepare = async (id: TtsLabEngineId) => {
    setBusyKey(id, true);
    setStatus((st) => ({ ...st, [id]: { ok: false, error: 'preparing...' } }));
    try {
      const r = await VlcSessionService.ttsLabPrepare(id, locale);
      setStatus((st) => ({ ...st, [id]: r }));
      note(`prepare ${id}: ${r.ok ? 'ready' : r.error ?? 'failed'}`);
      if (r.ok || id === 'mlkit') {
        const v = await VlcSessionService.ttsLabVoices(id, locale);
        setVoices((st) => ({ ...st, [id]: v }));
        setSelected((st) => {
          if (st[id]) return st;
          const first = v.find((x) => x.installed !== false && !x.networkRequired && x.status !== 'DOWNLOADABLE') ?? v[0];
          return { ...st, [id]: first?.name ?? null };
        });
      }
    } catch (e) {
      setStatus((st) => ({ ...st, [id]: { ok: false, error: String(e) } }));
      note(`prepare ${id} rejected: ${e}`);
    } finally {
      setBusyKey(id, false);
    }
  };

  const speak = (id: TtsLabEngineId) => {
    const voice = selected[id] ?? null;
    try {
      const rid = VlcSessionService.ttsLabSpeak(id, text, locale, voice, { outputDeviceId: outputId, steps: id === 'supertonic' ? steps : undefined });
      const outputText = routePreview?.selection ?? (outputId === null ? 'system' : String(outputId));
      pendingMeta.current[rid] = { voice, lang, output: outputText };
      // The native side also emits 'requested'; seed here in case that event raced ahead of the return value.
      setResults((prev) => (prev.some((r) => r.requestId === rid) ? prev : [{ requestId: rid, engine: id, voice, lang, output: outputText }, ...prev].slice(0, 30)));
    } catch (e) {
      note(`speak failed: ${e}`);
    }
  };

  const runAll = (onlyEngine: TtsLabEngineId | null = null) => {
    setSelfTest([]);
    setSelfTestState(`running${onlyEngine ? ` ${onlyEngine}` : ''}... (output: ${routePreview?.selection ?? 'system'}; downloads missing models, 30 s timeout per utterance, 1 s between engines)`);
    try {
      if (!VlcSessionService.ttsLabRunAll(KO_TEXT, EN_TEXT, outputId, onlyEngine)) setSelfTestState('already running');
    } catch (e) {
      setSelfTestState(`failed to start: ${e}`);
    }
  };

  const downloadSets = async (setIds: string[]) => {
    const setId = setIds.join('+');
    setBusyKey(setId, true);
    try {
      await VlcSessionService.downloadModels(setIds);
      note(`${setId} downloaded and verified`);
    } catch (e) {
      note(`download ${setId} failed: ${e}`);
    } finally {
      setBusyKey(setId, false);
      refreshModels().catch(() => {});
    }
  };

  const visible = useMemo(() => engines.filter((e) => (lang === 'ko' ? e.supportsKo : e.supportsEn)), [engines, lang]);

  return (
    <Section title="6b. TTS A/B test">
      <Text style={{ fontWeight: '700' }}>Output</Text>
      <Row>
        <Btn label="System route (Auto)" active={outputId === null} onPress={() => setOutputId(null)} />
        {(routePreview?.outputs ?? []).map((d) => (
          <Btn key={d.id} label={d.label} active={outputId === d.id} onPress={() => setOutputId(d.id)} />
        ))}
        <Btn label="Refresh" onPress={() => refreshRoute(outputId)} />
      </Row>
      <View style={[styles.banner, routePreview && !routePreview.ok && styles.bannerWarn]}>
        <Text style={[styles.bannerText, routePreview && !routePreview.ok && styles.bannerWarnText]}>
          Speech route: {routePreview ? routePreview.label : '...'}
        </Text>
        {routePreview && outputId !== null ? <Text style={styles.small}>System route right now: {routePreview.systemRoute}</Text> : null}
        {routePreview?.warning ? <Text style={styles.bannerWarnText}>WARNING: {routePreview.warning}</Text> : null}
        {routePreview?.platformNote ? <Text style={styles.small}>Note: platform engines follow the system route. {routePreview.platformNote}</Text> : null}
        {routePreview ? (
          <Text style={styles.small}>
            audio mode {routePreview.audioMode}, comm device {routePreview.communicationDevice?.typeName ?? 'none'}, held by {routePreview.commOwner}
          </Text>
        ) : null}
      </View>
      <Row>
        <Text style={styles.small}>Media volume {volume ? `${volume.percent}% (${volume.volume}/${volume.max})` : '-'}</Text>
        <PercentSlider
          value={volume?.percent ?? 0}
          onChange={(p) => {
            try {
              setVolume(VlcSessionService.ttsLabSetVolume(p));
            } catch (e) {
              note(`set volume failed: ${e}`);
            }
          }}
        />
      </Row>
      <Row>
        <Btn label="Run all engines" testID="tts-lab-run-all" onPress={() => runAll(null)} />
        <Btn label="Stop" onPress={() => VlcSessionService.ttsLabStop()} />
      </Row>
      {!!selfTestState && <Text style={styles.mono}>{selfTestState}</Text>}
      {selfTest.map((r, i) => (
        <Text key={`${r.engine}-${r.lang}-${i}`} style={[styles.mono, !r.ok && { color: '#a83a0c' }]}>
          {r.ok ? 'OK  ' : 'FAIL'} {r.engine}/{r.lang} prep {num(r.prepareMs)} ms, first {num(r.firstAudioMs)} ms, gen {num(r.genMs)} ms, RTF {num(r.rtf, 2)}, audio {num(r.audioDurationMs)} ms, model {num(r.modelMB)} MB
          {'\n'}     route: {r.routeLabel ?? r.routedDevice?.typeName ?? '-'}{r.routeOk === false ? ' (NOT THE SELECTED OUTPUT)' : ''}{r.error ? `\n     ${r.error}` : ''}
        </Text>
      ))}
      <Row>
        <Btn label="ko-KR" active={lang === 'ko'} onPress={() => switchLang('ko')} />
        <Btn label="en-US" active={lang === 'en'} onPress={() => switchLang('en')} />
      </Row>
      <TextInput style={[styles.input, { minHeight: 56 }]} value={text} onChangeText={setText} multiline />
      <Text style={styles.small}>
        Latency = tap to first audio (engine start callback, or first PCM written to our AudioTrack). Press Prepare once per engine
        and language first so the number excludes load time. Each result also shows the output device used.
      </Text>

      {visible.map((eng) => {
        const setIds = MODEL_SETS[eng.id];
        const setId = setIds?.join('+');
        const sets = (setIds ?? []).map((id) => models.find((m) => m.id === id));
        const allReady = sets.length > 0 && sets.every((m) => m?.ready);
        const totalBytes = sets.reduce((a, m) => a + (m?.totalBytes ?? 0), 0);
        const vs = voices[eng.id] ?? [];
        const shown = eng.id.startsWith('platform') && localOnly ? vs.filter((v) => !v.networkRequired) : vs;
        return (
          <View key={eng.id} style={styles.transcript}>
            <Text style={{ fontWeight: '700' }}>{eng.label}</Text>
            <Text style={styles.small}>{eng.inProcess ? 'plays in our process (own AudioTrack)' : 'plays in the engine process'}</Text>
            {setIds && setId && (
              <Row>
                <Text style={styles.mono}>
                  model {setIds.join(' + ')}: {allReady ? 'READY' : 'missing'} ({mb(totalBytes)} MB download)
                </Text>
                {!allReady && <Btn label={busyLabel(setId, 'Download', 'Downloading...')} disabled={busy(setId)} onPress={() => downloadSets(setIds)} />}
                {busy(setId) && <Btn label="Cancel" onPress={() => VlcSessionService.cancelModelDownload()} />}
              </Row>
            )}
            <Row>
              <Btn label={busyLabel(eng.id, 'Prepare', 'Preparing...')} disabled={busy(eng.id)} onPress={() => prepare(eng.id)} />
              <Btn label="Speak" onPress={() => speak(eng.id)} />
              <Btn label="Test this engine" onPress={() => runAll(eng.id)} />
            </Row>
            <Text style={styles.mono}>{statusText(status[eng.id])}</Text>

            {eng.id === 'supertonic' && (
              <Row>
                <Text style={styles.small}>Denoising steps (more = slower, may reduce choppy Korean)</Text>
                <Btn label="8" active={steps === 8} onPress={() => setSteps(8)} />
                <Btn label="16" active={steps === 16} onPress={() => setSteps(16)} />
              </Row>
            )}

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
                    label={busy('mlkit-dl') ? 'Downloading voice...' : `Download voice ${selected.mlkit}`}
                    disabled={busy('mlkit-dl')}
                    onPress={async () => {
                      setBusyKey('mlkit-dl', true);
                      try {
                        const r = await VlcSessionService.ttsLabDownloadVoice(selected.mlkit as string);
                        note(r.ok ? `ML Kit voice ${selected.mlkit} downloaded` : `ML Kit download: ${r.error}`);
                      } catch (e) {
                        note(`ML Kit download error: ${e}`);
                      } finally {
                        setBusyKey('mlkit-dl', false);
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
            {r.engine} {r.voice ? `[${r.voice}]` : ''} {r.lang} {r.requestId} out={r.output ?? '?'}
            {'\n'}first audio: {r.latencyMs != null ? `${r.latencyMs} ms` : r.outcome ? '-' : '...'}   total: {r.totalMs != null ? `${r.totalMs} ms` : '...'}   {r.outcome ?? ''}
          </Text>
          <Text style={[styles.mono, r.routeOk === false && { color: '#a83a0c', fontWeight: '700' }]}>
            output: {r.routeLabel ?? '...'}
            {r.routeOk === false ? '   (WARNING: not the selected output)' : ''}
          </Text>
          {r.message ? <Text style={[styles.mono, { color: '#a83a0c' }]}>{r.message}</Text> : null}
          {r.info && (r.info.genMs != null || r.info.chunks != null) ? (
            <Text style={styles.mono}>
              {r.info.genMs != null
                ? `generation ${num(r.info.genMs)} ms, audio ${num(r.info.audioSec, 2)} s, RTF ${num(r.info.rtf, 2)}${r.info.steps != null ? `, steps ${num(r.info.steps)}` : ''}, sid ${num(r.info.sid)}, first chunk ${num(r.info.firstChunkMs)} ms, ${num(r.info.sampleRate)} Hz`
                : `ML Kit chunks ${num(r.info.chunks)}, ${num(r.info.pcmBytes)} bytes`}
              {r.info.method ? `\nroute method: ${String(r.info.method)}` : ''}
            </Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}
