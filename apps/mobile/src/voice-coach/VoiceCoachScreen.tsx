import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { parseTarget, type TakeSummary } from '@vlc/voice-analysis';
import VlcVoiceCoach, { type TakeInfo } from '../../modules/vlc-voice-coach';
import { contourToFrames, summarize, type SummaryContext } from './analysis';
import { LiveView } from './LiveView';
import { newBlock, SetupPanel } from './SetupPanel';
import { makeT } from './strings';
import { TakesPanel, type TakeEntry } from './TakesPanel';
import type { PracticeBlock, VoiceCoachScreenProps } from './types';
import { useLiveTracker } from './useLiveTracker';
import { Button, Card, Row, s } from './ui';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Grace period in speech mode so the app's STT can deliver the final transcript before feedback is built. */
const SPEECH_TRANSCRIPT_GRACE_MS = 800;

interface Runner {
  phase: 'practice' | 'rest';
  repeat: number;
  remainingS: number;
}

/**
 * Voice Coach screen: practice setup, live pitch view, takes list with notes and A/B comparison, and short
 * objective feedback after each take. Feedback is shown on screen and passed to `onFeedback`; this component never
 * speaks and never starts playback by itself.
 */
export function VoiceCoachScreen(props: VoiceCoachScreenProps) {
  const { lang } = props;
  const t = useMemo(() => makeT(lang), [lang]);
  const live = useLiveTracker();

  const [blocks, setBlocksState] = useState<PracticeBlock[]>(() => (props.initialBlocks?.length ? props.initialBlocks : [newBlock()]));
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [takes, setTakes] = useState<TakeEntry[]>([]);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [runner, setRunner] = useState<Runner | null>(null);
  const [feedback, setFeedback] = useState<{ takeId: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const block = blocks.find((b) => b.id === selectedId) ?? blocks[0]!;
  const target = useMemo(() => (block.target.trim() ? parseTarget(block.target) : null), [block.target]);

  // Latest props/state for async flows.
  const latest = useRef({ props, takes, block, target, lang });
  latest.current = { props, takes, block, target, lang };
  const cancel = useRef(false);
  const recording = useRef(false);
  recording.current = live.state.recording;

  const setBlocks = useCallback((next: PracticeBlock[]) => {
    setBlocksState(next);
    latest.current.props.onBlocksChange?.(next);
  }, []);

  const notes = props.takeNotes ?? localNotes;
  const setNote = (id: string, text: string) => {
    setLocalNotes((n) => ({ ...n, [id]: text }));
    props.onTakeNotesChange?.(id, text);
  };

  const refreshTakes = useCallback(async () => {
    const list = await VlcVoiceCoach.listTakes();
    setTakes((old) => list.map((i) => ({ ...old.find((o) => o.id === i.id), id: i.id, durationS: i.durationS, createdAtMs: i.createdAtMs })));
  }, []);

  useEffect(() => {
    void refreshTakes().catch(() => undefined);
    const sub = VlcVoiceCoach.addListener('playbackState', (e) => setPlayingId(e.state === 'playing' ? e.id : null));
    return () => {
      sub.remove();
      cancel.current = true;
      if (recording.current) void VlcVoiceCoach.stopTake().catch(() => undefined);
      void VlcVoiceCoach.stopPlayback().catch(() => undefined);
    };
  }, [refreshTakes]);

  /** Native offline analysis -> frames; then a summary against the previous take of the same mode. */
  const analyze = useCallback(async (info: { id: string }, ctx: SummaryContext, previous: TakeSummary | null) => {
    const res = await VlcVoiceCoach.analyzeTake(info.id, { maxContourPoints: 1500, target: ctx.target?.notes });
    const frames = contourToFrames(res.contour);
    return { frames, summary: summarize(frames, ctx, previous) };
  }, []);

  const finishTake = useCallback(
    async (blk: PracticeBlock) => {
      const stopped = await live.stopTake();
      if (!stopped) return;
      const info: TakeInfo = stopped.take;
      latest.current.props.onTakeRecorded?.({ id: info.id, path: info.path, durationS: info.durationS, createdAtMs: info.createdAtMs, blockId: blk.id });
      setBusy(true);
      try {
        if (blk.mode === 'speech') await sleep(SPEECH_TRANSCRIPT_GRACE_MS);
        const cur = latest.current;
        const prev = cur.takes.find((x) => x.summary?.mode === blk.mode)?.summary ?? null;
        const ctx: SummaryContext = {
          mode: blk.mode,
          target: blk.target.trim() ? parseTarget(blk.target) : null,
          transcript: blk.mode === 'speech' ? cur.props.transcript : undefined,
          words: blk.mode === 'speech' ? cur.props.words : undefined,
          speechLang: cur.props.speechLang ?? cur.lang,
        };
        const { frames, summary } = await analyze(info, ctx, prev);
        const entry: TakeEntry = { id: info.id, durationS: info.durationS, createdAtMs: info.createdAtMs, frames, summary };
        setTakes((old) => [entry, ...old.filter((x) => x.id !== info.id)]);
        setFeedback({ takeId: info.id, text: summary.text[cur.lang] });
        cur.props.onFeedback?.(summary.text[cur.lang], cur.lang);
      } catch (e) {
        setFeedback({ takeId: info.id, text: `${t('error')}: ${String((e as Error).message ?? e)}` });
      } finally {
        setBusy(false);
      }
    },
    [analyze, live, t],
  );

  const countdown = useCallback(async (seconds: number, phase: Runner['phase'], repeat: number) => {
    const end = Date.now() + seconds * 1000;
    while (!cancel.current) {
      const left = (end - Date.now()) / 1000;
      if (left <= 0) break;
      setRunner({ phase, repeat, remainingS: Math.ceil(left) });
      await sleep(Math.min(250, left * 1000));
    }
  }, []);

  const runBlock = useCallback(async () => {
    const blk = latest.current.block;
    cancel.current = false;
    for (let r = 1; r <= blk.repeats && !cancel.current; r++) {
      const started = await live.startTake();
      if (!started) break;
      await countdown(blk.durationS, 'practice', r);
      await finishTake(blk);
      if (cancel.current) break;
      if (r < blk.repeats && blk.restS > 0) await countdown(blk.restS, 'rest', r);
    }
    setRunner(null);
  }, [countdown, finishTake, live]);

  const manualRecord = async () => {
    if (live.state.recording) await finishTake(block);
    else await live.startTake();
  };

  const toggleCompare = async (id: string) => {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
    const entry = takes.find((x) => x.id === id);
    if (entry && !entry.frames) {
      try {
        const ctx: SummaryContext = { mode: block.mode, target, speechLang: props.speechLang ?? lang };
        const { frames, summary } = await analyze(entry, ctx, null);
        setTakes((old) => old.map((x) => (x.id === id ? { ...x, frames, summary } : x)));
      } catch {
        /* shown as "analyzing" until retried */
      }
    }
  };

  const deleteTake = async (id: string) => {
    await VlcVoiceCoach.deleteTake(id);
    props.onTakeDeleted?.(id);
    setCompare((c) => c.filter((x) => x !== id));
    setTakes((old) => old.filter((x) => x.id !== id));
  };

  const locked = runner !== null || live.state.recording;
  const err = live.state.error;

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: '#14202a' }}>{t('title')}</Text>
      {err ? <Text style={{ color: '#c0392b', marginBottom: 8 }}>{err === 'PERMISSION_RECORD_AUDIO' ? t('micDenied') : `${t('error')}: ${err}`}</Text> : null}

      <SetupPanel blocks={blocks} onChange={setBlocks} selectedId={block.id} onSelect={setSelectedId} t={t} locked={locked} />

      <Card>
        <Row>
          {runner ? (
            <Button label={t('stopBlock')} danger onPress={() => (cancel.current = true)} />
          ) : (
            <Button label={t('startBlock')} onPress={() => void runBlock()} disabled={live.state.recording || busy} />
          )}
          <Button label={live.state.recording && !runner ? t('stop') : t('record')} onPress={() => void manualRecord()} disabled={runner !== null || busy} danger={live.state.recording && !runner} />
          <Button
            label={live.state.monitoring ? t('monitorOff') : t('monitorOn')}
            onPress={() => void (live.state.monitoring ? live.stopMonitor() : live.startMonitor())}
            disabled={live.state.recording}
            active={live.state.monitoring}
          />
        </Row>
        {runner ? (
          <Text style={s.body}>
            {runner.phase === 'practice' ? t('phasePractice') : t('phaseRest')} · {t('repeatOf')} {runner.repeat}/{block.repeats} · {runner.remainingS} {t('seconds')}
          </Text>
        ) : null}
      </Card>

      {live.state.monitoring || live.state.recording ? <LiveView live={live.state} target={target} t={t} /> : null}

      {busy ? <Text style={s.muted}>{t('analyzing')}</Text> : null}
      {feedback && !live.state.recording ? (
        <Card title={t('feedback')}>
          <Text style={s.body} accessibilityLabel="feedback text">
            {feedback.text}
          </Text>
        </Card>
      ) : null}

      <TakesPanel
        takes={takes}
        notes={notes}
        onNote={setNote}
        playingId={playingId}
        onPlay={(id) => void VlcVoiceCoach.playTake(id).catch((e) => setFeedback({ takeId: id, text: `${t('error')}: ${String((e as Error).message ?? e)}` }))}
        onStopPlay={() => void VlcVoiceCoach.stopPlayback()}
        onDelete={(id) => void deleteTake(id)}
        compare={compare}
        onToggleCompare={(id) => void toggleCompare(id)}
        t={t}
        lang={lang}
        busy={locked || busy}
      />
    </ScrollView>
  );
}

