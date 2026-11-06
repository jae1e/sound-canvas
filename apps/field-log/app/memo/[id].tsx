import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Image, Modal, Pressable, ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';
import { deriveMemoStatus, memoProgress, type MemoFacts, noteButtonState, noteSyncState, noSpeechChip, autoTitle, durationLabel, stampLabel, controlPhase, type ControlAction, formatPlace, isSilentPeak, mergeTranscript, segmentStartsMs, type DraftUtt, type FinalSeg } from '../../src/core';
import { getMemoDetail, type MemoDetail, type SegmentRow } from '../../src/db/queries';
import { goHome } from '../../src/ui/nav';
import { useLang, useT, type Key } from '../../src/i18n';
import { confirmDeleteMemo } from '../../src/memo/confirmDelete';
import { transcribeAnyway, stopOnLeaveScreen, pauseMemoRecording, resumeMemoRecording, saveNote, startMemoRecording, stopMemoRecording } from '../../src/memo/actions';
import { playRecording, stopPlayback, togglePlayback } from '../../src/memo/playback';
import { usePlayback, useRecorder } from '../../src/state/recorder';
import { BigButton, Chip, ProgressLine, Row, StatusPill, useLiveFacts, useRouteText } from '../../src/ui/components';
import { TitleEditor } from '../../src/ui/TitleEditor';
import { InputChip } from '../../src/ui/inputUi';
import { LeftAppNotice } from '../../src/ui/LeftAppNotice';
import { ControlPanel, LiveWave, RecordingPlayer } from '../../src/ui/recorderUi';
import FlNative, { type Capabilities } from '../../src/native';
import { updateSetting, useSettings } from '../../src/state/settings';
import { formatElapsed, formatTime } from '../../src/ui/format';
import { colors, s } from '../../src/ui/theme';
import { useDbQuery } from '../../src/ui/useQuery';

const NO_DRAFTS: DraftUtt[] = [];

function LevelBanner({ active }: { active: boolean }) {
  const t = useT();
  const alert = useRecorder((r) => r.monitor.alert);
  const silenced = useRecorder((r) => r.silenced);
  const paused = useRecorder((r) => r.paused);
  if (!active || paused) return null;
  const kind = silenced ? 'silenced' : alert;
  if (kind === 'ok') return null;
  const red = kind !== 'quiet';
  return (
    <View
      accessibilityRole="alert"
      style={{ alignSelf: 'stretch', marginVertical: 8, padding: 14, borderRadius: 12, backgroundColor: red ? colors.danger : '#FFB300' }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: red ? '#FFFFFF' : '#111418' }}>
        {`${red ? '⚠ ' : '△ '}${kind === 'silenced' ? t('silencedBanner') : kind === 'silent' ? t('silentBanner') : t('quietBanner')}`}
      </Text>
    </View>
  );
}

function LiveBadge({ active }: { active: boolean }) {
  const t = useT();
  const live = useRecorder((r) => r.liveState);
  const label: Key = !active
    ? 'draftOff'
    : live === 'live'
      ? 'draftLive'
      : live === 'paused'
        ? 'draftPaused'
        : live === 'connecting'
          ? 'draftConnecting'
          : live === 'busy'
            ? 'draftBusy'
            : 'draftOff';
  const glyph = label === 'draftLive' ? '●' : label === 'draftPaused' || label === 'draftConnecting' ? '◐' : '○';
  return <Chip glyph={glyph} label={t(label)} active={label === 'draftLive'} />;
}

function LiveLine({ active }: { active: boolean }) {
  const t = useT();
  const live = useRecorder((r) => r.liveState);
  const last = useRecorder((r) => r.lastDraftAtMs);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  const stateKey: Key = ({ live: 'draftLive', paused: 'draftPaused', connecting: 'draftConnecting', busy: 'draftBusy', off: 'draftOff' } as const)[live];
  const ago = last > 0 ? t('lastTextAgo').replace('{n}', String(Math.max(0, Math.round((Date.now() - last) / 1000)))) : t('noTextYet');
  return <Text style={[s.small, { marginTop: 4 }]}>{`${t(stateKey)} · ${ago}`}</Text>;
}

const statusKey = (seg: FinalSeg): Key =>
  seg.noSpeech && seg.status === 'done'
    ? 'segNoSpeech'
    : ({ queued: 'segQueued', running: 'segRunning', done: 'segDone', failed: 'segFailed' } as const)[seg.status];

function SegmentLine({ seg, row, label, onPlay }: { seg: FinalSeg; row?: SegmentRow; label: string; onPlay: () => void }) {
  const t = useT();
  const routeText = useRouteText();
  const chip = noSpeechChip(row?.noSpeechReason ?? null, row?.filteredText || seg.text);
  const noSpeechLabel = t(chip.key).replace('{text}', chip.text ?? '');
  const isNoSpeech = seg.noSpeech && seg.status === 'done';
  const showText = seg.status === 'done' && !seg.noSpeech && seg.text.trim().length > 0;
  return (
    <Pressable accessibilityRole="button" onPress={onPlay} style={[s.card, { marginVertical: 4 }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <Text style={s.small}>{`▶ ${label}`}</Text>
        {seg.noSpeech && seg.status === 'done' ? (
          <Chip glyph="○" label={noSpeechLabel} active={false} />
        ) : (
          <Chip glyph={seg.status === 'done' ? '✓' : seg.status === 'failed' ? '✕' : '…'} label={t(statusKey(seg))} active={seg.status === 'failed'} />
        )}
        {row && isSilentPeak(row.peakDbfsX100) && <Chip glyph="✕" label={t('silentSegment')} active />}
        {row?.flags.includes('clipped') && <Chip glyph="▲" label={t('clipped')} active />}
        {row?.flags.includes('narrowband') && <Chip glyph="▼" label={t('narrowband')} active />}
      </View>
      {isNoSpeech && (
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <BigButton label={t('playSegment')} variant="outline" onPress={onPlay} style={{ flex: 1, minHeight: 48, marginRight: 6 }} />
          <BigButton
            label={t('transcribeAnyway')}
            variant="outline"
            onPress={() => transcribeAnyway(seg.segmentId).catch((e: Error) => Alert.alert(t('error'), e.message))}
            style={{ flex: 1, minHeight: 48, marginLeft: 6 }}
          />
        </View>
      )}
      {seg.status === 'running' && <Text style={s.small}>{t('transcribing')}</Text>}
      {row?.route && <Text style={s.small}>{`${t('segmentInput')}: ${routeText(row.route)}`}</Text>}
      {showText && <Text style={[s.body, { marginTop: 4 }]}>{seg.text}</Text>}
      {seg.status === 'failed' && row?.error ? <Text style={s.small}>{row.error}</Text> : null}
      {seg.status === 'failed' && (
        <BigButton
          label={t('retry')}
          variant="outline"
          onPress={() => transcribeAnyway(seg.segmentId).catch((e: Error) => Alert.alert(t('error'), e.message))}
          style={{ minHeight: 48, marginTop: 6 }}
        />
      )}
    </Pressable>
  );
}

function TranscriptView({ detail, activeRecordingId, onPlayAt }: { detail: MemoDetail; activeRecordingId: string | null; onPlayAt: (recordingId: string, ms: number) => void }) {
  const t = useT();
  const drafts = useRecorder((r) => r.drafts);
  const blocks = useMemo(() => {
    return detail.recordings.map((rec) => {
      const rows = detail.segments.filter((x) => x.recordingId === rec.recordingId);
      // Recorded time: the sum of earlier segment durations, so pauses do not shift later segments.
      const starts = segmentStartsMs(rows.map((x) => ({ index: x.index, durationMs: x.durationMs })));
      const finals: FinalSeg[] = rows.map((x, i) => ({
        segmentId: x.segmentId,
        index: x.index,
        startMs: starts[i],
        durationMs: x.durationMs,
        status: x.status,
        text: x.text,
        noSpeech: x.noSpeech,
      }));
      const byId = new Map(rows.map((x) => [x.segmentId, x]));
      return { rec, finals, byId };
    });
  }, [detail]);

  return (
    <View>
      {blocks.map(({ rec, finals, byId }) => {
        const items = mergeTranscript(finals, drafts[rec.recordingId] ?? NO_DRAFTS, rec.recordingId === activeRecordingId);
        return (
          <View key={rec.recordingId}>
            {items.map((it) =>
              it.kind === 'final' ? (
                <SegmentLine
                  key={it.seg.segmentId}
                  seg={it.seg}
                  row={byId.get(it.seg.segmentId)}
                  label={`${t('segment')} ${it.seg.index + 1} · ${formatElapsed(it.seg.startMs)}`}
                  onPlay={() => onPlayAt(rec.recordingId, it.seg.startMs)}
                />
              ) : (
                <Text
                  key={`d${it.utt.utterance}`}
                  onPress={it.utt.startMs !== undefined ? () => onPlayAt(rec.recordingId, it.utt.startMs ?? 0) : undefined}
                  style={{ fontSize: 18, fontStyle: 'italic', color: colors.draft, marginVertical: 4 }}
                >
                  {it.utt.text}
                </Text>
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function MemoScreen() {
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const detail = useDbQuery(() => getMemoDetail(id), [id]);
  const rec = useRecorder();
  const play = usePlayback();
  const navigation = useNavigation();

  // Every way of leaving stops and saves a recording of this memo (idempotent, decided from native status).
  useEffect(() => {
    const nav = navigation as unknown as { addListener: (e: 'beforeRemove', cb: () => void) => () => void };
    const off = nav.addListener('beforeRemove', () => {
      void saveNote(id, noteRef.current).catch(() => undefined);
      void stopOnLeaveScreen(id, 'beforeRemove');
    });
    return () => {
      off();
      void saveNote(id, noteRef.current).catch(() => undefined);
      void stopOnLeaveScreen(id, 'unmount');
    };
  }, [navigation, id]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        void stopOnLeaveScreen(id, 'hardwareBack');
        return false; // let navigation proceed
      });
      return () => {
        sub.remove();
        void stopOnLeaveScreen(id, 'blur');
      };
    }, [id]),
  );
  const routeText = useRouteText();
  const active = rec.recording && rec.memoId === id;
  const otherActive = rec.recording && rec.memoId !== id;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef('');
  noteRef.current = note;
  const persistNote = async (text: string, toast: boolean) => {
    setSavingNote(true);
    try {
      const wrote = await saveNote(id, text);
      if (wrote && toast) ToastAndroid.show(t('noteSaved'), ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSavingNote(false);
    }
  };
  const started = useRef(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const m = (e as Error).message;
      Alert.alert(t('error'), m === 'MIC_DENIED' ? t('micDenied') : m === 'PLAY_WHILE_RECORDING' ? t('playRefuse') : m);
    } finally {
      setBusy(false);
    }
  };
  const start = () => run(() => startMemoRecording(id));
  const stop = () => run(stopMemoRecording);

  useEffect(() => {
    if (autostart === '1' && !started.current) {
      started.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  useEffect(() => () => void stopPlayback().catch(() => undefined), []);

  useEffect(() => {
    if (detail?.note && note === '') setNote(detail.note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.note]);

  const live = useLiveFacts(id);

  if (!detail) return <View style={s.screen} />;

  const totalMs = detail.segments.reduce((a, x) => a + x.durationMs, 0);
  const done = detail.segments.filter((x) => x.status === 'done').length;
  const failed = detail.segments.filter((x) => x.status === 'failed').length;
  const facts: MemoFacts = {
    isRecording: active,
    paused: live.paused,
    recordedMs: live.recordedMs,
    offline: live.offline,
    segmentCount: detail.segments.length,
    segmentsDone: done,
    segmentsFailed: failed,
    segmentsUploaded: detail.segmentsUploaded,
    segmentsNoSpeech: detail.segments.filter((x) => x.status === 'done' && x.noSpeech).length,
    recordingCount: detail.recordings.length,
    hasOpenRecordingRows: detail.recordings.some((r) => !r.stopped),
    pendingEvents: detail.pendingEvents,
    pendingObjects: detail.pendingObjects,
  };
  const status = deriveMemoStatus(facts);
  const steps = memoProgress(facts);
  const nb = noteButtonState(detail.note, note, savingNote);
  const noteSync = noteSyncState(!!detail.note, detail.noteSynced);
  const photo = detail.photos[0];
  const firstFinal = detail.segments.find((x) => x.status === 'done' && !x.noSpeech && x.text.trim())?.text;
  const draftList = Object.values(rec.drafts).flat();
  const newestDraft = draftList.length ? draftList[draftList.length - 1].text : undefined;
  const autoText = autoTitle({ firstFinalText: firstFinal, draftText: newestDraft, kind: detail.kind, fallbacks: { voice: t('memoVoice'), photo: t('memoPhoto') } });
  const stampText = [
    stampLabel(detail.createdWallMs, lang),
    durationLabel(totalMs),
    detail.location ? `📍 ${formatPlace(detail.location)}` : null,
  ].filter(Boolean).join(' · ');
  const phase = controlPhase({ active, paused: rec.paused, hasRecordings: detail.recordings.length > 0 });
  const latest = detail.recordings[detail.recordings.length - 1];
  const latestRows = latest ? detail.segments.filter((x) => x.recordingId === latest.recordingId).sort((a, b) => a.index - b.index) : [];
  const latestPaths = latestRows.map((x) => x.path);
  const latestPlaying = !!latest && play.recordingId === latest.recordingId && play.state === 'playing';

  const onAction = (a: ControlAction) => {
    if (a === 'record' || a === 'recordMore') void start();
    else if (a === 'pause') void run(pauseMemoRecording);
    else if (a === 'resume') void run(resumeMemoRecording);
    else if (a === 'stop') void stop();
    else if (a === 'play' && latest) void run(() => togglePlayback(latest.recordingId, latestPaths, 0));
  };

  const playAt = (recordingId: string, ms: number) => {
    const paths = detail.segments.filter((x) => x.recordingId === recordingId).sort((a, b) => a.index - b.index).map((x) => x.path);
    void run(() => playRecording(recordingId, paths, ms));
  };

  const finish = async () => {
    await stopPlayback().catch(() => undefined);
    ToastAndroid.show(t('savedToast'), ToastAndroid.SHORT);
    goHome(router);
  };

  const saveAndClose = () => {
    if (!active) return void finish();
    Alert.alert(t('closeRecTitle'), t('closeRecBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('saveClose'), onPress: () => void run(async () => { await stopMemoRecording(); await finish(); }) },
    ]);
  };
  const loc = formatPlace(detail.location) ?? t('noLocation');

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      {photo && (
        <Image source={{ uri: photo.path }} resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: 12, backgroundColor: colors.surface }} />
      )}

      <LeftAppNotice />
      <TitleEditor memoId={id} title={detail.title} placeholder={autoText} />
      <Text style={[s.small, { marginBottom: 4 }]}>{stampText}</Text>

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <ControlPanel
          phase={phase}
          recordedMs={rec.recordedMs}
          savedMs={totalMs}
          busy={busy}
          blocked={otherActive}
          playing={latestPlaying}
          canPlay={!!latest && latestRows.length > 0 && !rec.recording}
          onAction={onAction}
        />
        {otherActive && <Text style={s.small}>{t('otherRecording')}</Text>}
        <InputChip />
        <LevelBanner active={active} />
        {active && <LiveWave active={active} />}
        <LiveBadge active={active} />
        <LiveLine active={active} />
      </View>
      {rec.error && <Text style={{ color: colors.danger, fontSize: 16 }}>{rec.error}</Text>}

      <StatusPill status={status} />
      <ProgressLine steps={steps} />
      {status.kind === 'failed' && <Text style={[s.small, { color: colors.danger }]}>{t('failedHint')}</Text>}

      {detail.recordings.map((r, i) => {
        const rows = detail.segments.filter((x) => x.recordingId === r.recordingId);
        return rows.length > 0 && !(active && rec.recordingId === r.recordingId) ? (
          <RecordingPlayer key={r.recordingId} index={i} rec={r} rows={rows} />
        ) : null;
      })}

      <Text style={s.h2}>{t('transcript')}</Text>
      <Text style={s.small}>{t('draftHint')}</Text>
      <TranscriptView detail={detail} activeRecordingId={active ? rec.recordingId : null} onPlayAt={playAt} />

      <Text style={s.h2}>{t('note')}</Text>
      <TextInput
        style={[s.input, { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 }]}
        multiline
        value={note}
        onChangeText={setNote}
        onBlur={() => void persistNote(note, false)}
        placeholder={t('notePlaceholder')}
        placeholderTextColor={colors.muted}
      />
      <BigButton
        label={nb.label === 'saved' ? t('noteSaved') : nb.label === 'saving' ? t('noteSaving') : t('saveNote')}
        variant="outline"
        disabled={!nb.enabled}
        onPress={() => void persistNote(note, true)}
        style={{ minHeight: 56 }}
      />
      {noteSync !== 'none' && <Text style={s.small}>{noteSync === 'synced' ? t('noteSyncedLine') : t('noteSavedPhone')}</Text>}

      <Text style={s.h2}>{t('details')}</Text>
      <View style={s.card}>
        <Row label={t('created')} value={`${formatTime(detail.createdWallMs, lang, detail.tz)} (${detail.tz})`} />
        <Row label={t('location')} value={loc} />
        {detail.recordings.map((r, i) => (
          <View key={r.recordingId} style={{ marginVertical: 4, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: colors.border }}>
            <Row label={`${t('route')} #${i + 1}`} value={routeText(r.route)} />
            <Row label={t('source')} value={r.source} />
            {r.stopReason === 'left_app' && <Row label={t('stoppedLeftApp')} value="" />}
            <Row label={t('effects')} value={`NS ${r.effects.ns} · AGC ${r.effects.agc} · AEC ${r.effects.aec}`} />
          </View>
        ))}
        <Row label={t('segments')} value={String(detail.segments.length)} />
        <Row label={t('duration')} value={formatElapsed(totalMs)} />
      </View>

      <Text style={[s.small, { marginTop: 16 }]}>{t('autoSaveNote')}</Text>
      <BigButton label={t('saveClose')} onPress={saveAndClose} disabled={busy} style={{ minHeight: 88 }} />
      <BigButton label={t('deleteBtn')} variant="outline" disabled={active} onPress={() => confirmDeleteMemo(t, id, () => goHome(router))} />
    </ScrollView>
  );
}
