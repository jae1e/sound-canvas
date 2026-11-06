import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { formatPlace, mergeTranscript, segmentStartsMs, type DraftUtt, type FinalSeg } from '../../src/core';
import { getMemoDetail, type MemoDetail, type SegmentRow } from '../../src/db/queries';
import { useLang, useT, type Key } from '../../src/i18n';
import { confirmDeleteMemo } from '../../src/memo/confirmDelete';
import { saveNote, startMemoRecording, stopMemoRecording } from '../../src/memo/actions';
import { useRecorder } from '../../src/state/recorder';
import { BigButton, Chip, Row, TrustChips } from '../../src/ui/components';
import { formatElapsed, formatTime } from '../../src/ui/format';
import { colors, s } from '../../src/ui/theme';
import { useDbQuery } from '../../src/ui/useQuery';

const NO_DRAFTS: DraftUtt[] = [];

function Elapsed({ active }: { active: boolean }) {
  const anchor = useRecorder((r) => r.anchorMs);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [active]);
  return <Text style={{ fontSize: 48, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatElapsed(active ? Date.now() - anchor : 0)}</Text>;
}

function LevelMeter({ active }: { active: boolean }) {
  const db = useRecorder((r) => r.levelDbfsX100) / 100;
  const frac = active ? Math.min(1, Math.max(0, (db + 60) / 60)) : 0;
  return (
    <View accessibilityLabel={`level ${Math.round(db)} dBFS`} style={{ height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border, overflow: 'hidden', marginVertical: 8 }}>
      <View style={{ width: `${Math.round(frac * 100)}%`, height: '100%', backgroundColor: frac > 0.95 ? colors.danger : colors.primary }} />
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

function SegmentLine({ seg, row, label }: { seg: FinalSeg; row?: SegmentRow; label: string }) {
  const t = useT();
  const showText = seg.status === 'done' && !seg.noSpeech && seg.text.trim().length > 0;
  return (
    <View style={[s.card, { marginVertical: 4 }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <Text style={s.small}>{label}</Text>
        <Chip glyph={seg.status === 'done' ? '✓' : seg.status === 'failed' ? '✕' : '…'} label={t(statusKey(seg))} active={seg.status === 'failed'} />
        {row?.flags.includes('clipped') && <Chip glyph="▲" label={t('clipped')} active />}
        {row?.flags.includes('narrowband') && <Chip glyph="▼" label={t('narrowband')} active />}
      </View>
      {showText && <Text style={[s.body, { marginTop: 4 }]}>{seg.text}</Text>}
      {seg.status === 'failed' && row?.error ? <Text style={s.small}>{row.error}</Text> : null}
    </View>
  );
}

function TranscriptView({ detail, activeRecordingId }: { detail: MemoDetail; activeRecordingId: string | null }) {
  const t = useT();
  const drafts = useRecorder((r) => r.drafts);
  const blocks = useMemo(() => {
    return detail.recordings.map((rec) => {
      const rows = detail.segments.filter((x) => x.recordingId === rec.recordingId);
      const starts = segmentStartsMs(
        rows.map((x) => ({ index: x.index, durationMs: x.durationMs, startElapsedUs: x.startElapsedUs })),
        rec.startElapsedUs,
      );
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
                />
              ) : (
                <Text
                  key={`d${it.utt.utterance}`}
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
  const active = rec.recording && rec.memoId === id;
  const otherActive = rec.recording && rec.memoId !== id;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const started = useRef(false);

  const start = async () => {
    setBusy(true);
    try {
      await startMemoRecording(id);
    } catch (e) {
      const m = (e as Error).message;
      Alert.alert(t('error'), m === 'MIC_DENIED' ? t('micDenied') : m);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await stopMemoRecording();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autostart === '1' && !started.current) {
      started.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  useEffect(() => {
    if (detail?.note && note === '') setNote(detail.note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.note]);

  if (!detail) return <View style={s.screen} />;

  const lastRec = detail.recordings[detail.recordings.length - 1];
  const totalMs = detail.segments.reduce((a, x) => a + x.durationMs, 0);
  const photo = detail.photos[0];
  const loc = formatPlace(detail.location) ?? t('noLocation');
  const done = detail.segments.filter((x) => x.status === 'done').length;
  const failed = detail.segments.filter((x) => x.status === 'failed').length;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      {photo && (
        <Image source={{ uri: photo.path }} resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: 12, backgroundColor: colors.surface }} />
      )}

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Elapsed active={active} />
        <LevelMeter active={active} />
        <LiveBadge active={active} />
        <LiveLine active={active} />
      </View>

      <BigButton
        label={active ? t('stop') : detail.kind !== 'voice' ? t('recordVoice') : t('start')}
        variant={active ? 'danger' : 'solid'}
        disabled={busy || otherActive}
        onPress={active ? stop : start}
        style={{ minHeight: 96 }}
      />
      {rec.error && <Text style={{ color: colors.danger, fontSize: 16 }}>{rec.error}</Text>}

      <TrustChips
        isRecording={detail.recordings.some((r) => !r.stopped) || active}
        segmentCount={detail.segments.length}
        segmentsDone={done}
        segmentsFailed={failed}
        pendingEvents={detail.pendingEvents}
        pendingObjects={detail.pendingObjects}
      />

      <Text style={s.h2}>{t('transcript')}</Text>
      <Text style={s.small}>{t('draftHint')}</Text>
      <TranscriptView detail={detail} activeRecordingId={active ? rec.recordingId : null} />

      <Text style={s.h2}>{t('note')}</Text>
      <TextInput
        style={[s.input, { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 }]}
        multiline
        value={note}
        onChangeText={setNote}
        placeholder={t('notePlaceholder')}
        placeholderTextColor={colors.muted}
      />
      <BigButton label={t('saveNote')} variant="outline" onPress={() => void saveNote(id, note)} style={{ minHeight: 56 }} />

      <Text style={s.h2}>{t('details')}</Text>
      <View style={s.card}>
        <Row label={t('created')} value={`${formatTime(detail.createdWallMs, lang, detail.tz)} (${detail.tz})`} />
        <Row label={t('location')} value={loc} />
        {lastRec && (
          <>
            <Row
              label={t('route')}
              value={`${lastRec.route.type}${lastRec.route.productName ? ` · ${lastRec.route.productName}` : ''}`}
            />
            <Row label={t('source')} value={lastRec.source} />
            <Row label={t('effects')} value={`NS ${lastRec.effects.ns} · AGC ${lastRec.effects.agc} · AEC ${lastRec.effects.aec}`} />
          </>
        )}
        <Row label={t('segments')} value={String(detail.segments.length)} />
        <Row label={t('duration')} value={formatElapsed(totalMs)} />
      </View>

      <BigButton label={t('deleteMemo')} variant="outline" disabled={active} onPress={() => confirmDeleteMemo(t, id, () => router.replace('/'))} />
      <BigButton
        label={t('done')}
        variant="outline"
        disabled={active}
        onPress={() => router.replace('/')}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}
