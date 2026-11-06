import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PanResponder, Text, View } from 'react-native';
import {
  WAVE_BARS,
  WAVE_GUIDE_X100,
  bucketsPerSegment,
  controlActions,
  levelBand,
  peakToFraction,
  playheadFraction,
  positionFromTouch,
  statusLine,
  type ControlAction,
  type ControlPhase,
} from '../core';
import type { RecordingRow, SegmentRow } from '../db/queries';
import { useT } from '../i18n';
import { seekIfLoaded, stopPlayback, togglePlayback } from '../memo/playback';
import FlNative from '../native';
import { usePlayback, useRecorder } from '../state/recorder';
import { BigButton } from './components';
import { formatElapsed } from './format';
import { colors, s } from './theme';

const BAR_STYLE = {
  quiet: { backgroundColor: colors.muted, opacity: 0.55 },
  good: { backgroundColor: colors.primary, opacity: 1 },
  hot: { backgroundColor: colors.danger, opacity: 1 },
} as const;

const WAVE_H = 112;

/** Scrolling bar waveform of the last ~6 s while recording. */
export function LiveWave({ active }: { active: boolean }) {
  const t = useT();
  const wave = useRecorder((r) => r.wave);
  const paused = useRecorder((r) => r.paused);
  const last = useRecorder((r) => r.levelDbfsX100);
  const slots: (number | undefined)[] = useMemo(() => {
    const out: (number | undefined)[] = new Array(WAVE_BARS - wave.length).fill(undefined);
    return out.concat(wave);
  }, [wave]);
  const db = last / 100;
  const hot = active && !paused && levelBand(last) === 'hot';
  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 8 }}>
      <View
        accessibilityLabel={`level ${Math.round(db)} dBFS`}
        style={{ height: WAVE_H, flexDirection: 'row', alignItems: 'flex-end', borderWidth: 2, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface, opacity: paused ? 0.5 : 1 }}
      >
        {slots.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {v !== undefined && (
              <View style={[{ width: '80%', height: Math.max(2, peakToFraction(v) * WAVE_H), borderRadius: 1 }, BAR_STYLE[levelBand(v)]]} />
            )}
          </View>
        ))}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: peakToFraction(WAVE_GUIDE_X100) * WAVE_H, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.text }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={s.small}>{`${t('level')}: ${active ? (db <= -96 ? '≤ -96' : db.toFixed(0)) : '-'} dBFS${hot ? ` · ${t('nearClipping')}` : ''}`}</Text>
        <Text style={s.small}>{`${t('legendQuiet')} · ${t('legendGood')} · ${t('legendHot')} · - -30`}</Text>
      </View>
    </View>
  );
}

const ACTION_LABEL = {
  record: 'ctlRecord',
  pause: 'ctlPause',
  resume: 'ctlResume',
  stop: 'ctlStop',
  recordMore: 'ctlRecordMore',
  play: 'ctlPlay',
} as const;

export function ControlPanel(props: {
  phase: ControlPhase;
  recordedMs: number;
  savedMs: number;
  busy: boolean;
  blocked: boolean;
  playing: boolean;
  canPlay: boolean;
  onAction: (a: ControlAction) => void;
}) {
  const t = useT();
  const line = statusLine(props.phase, props.recordedMs, props.savedMs);
  const lineText =
    line.key === 'none'
      ? t('lineNone')
      : line.key === 'saved'
        ? `${t('lineSaved')} · ${formatElapsed(line.ms ?? 0)}`
        : `${line.key === 'recording' ? t('lineRecording') : t('linePaused')} ${formatElapsed(line.ms ?? 0)}`;
  return (
    <View style={{ alignSelf: 'stretch' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginVertical: 8 }}>{lineText}</Text>
      <View style={{ flexDirection: 'row' }}>
        {controlActions(props.phase).map((a) => {
          const isRed = a === 'record' || a === 'resume' || a === 'recordMore';
          const label = a === 'play' && props.playing ? t('ctlPause') : t(ACTION_LABEL[a]);
          return (
            <BigButton
              key={a}
              label={label}
              variant={isRed ? 'danger' : a === 'stop' ? 'solid' : 'outline'}
              disabled={props.busy || (isRed && props.blocked) || (a === 'play' && !props.canPlay)}
              onPress={() => props.onAction(a)}
              style={{ flex: 1, marginHorizontal: 4, minHeight: 88, ...(a === 'stop' ? { backgroundColor: colors.text } : {}) }}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Static waveform of one recording with a playhead, play/pause, stop and tap-or-drag seeking. */
export function RecordingPlayer(props: { index: number; rec: RecordingRow; rows: SegmentRow[] }) {
  const t = useT();
  const { rec } = props;
  const rows = useMemo(() => [...props.rows].sort((a, b) => a.index - b.index), [props.rows]);
  const key = rows.map((r) => r.segmentId).join(',');
  const total = rows.reduce((a, r) => a + r.durationMs, 0);
  const [buckets, setBuckets] = useState<number[] | null>(null);
  const [cued, setCued] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const recording = useRecorder((r) => r.recording);
  const p = usePlayback();
  const mine = p.recordingId === rec.recordingId && p.state !== 'idle';
  const playing = mine && p.state === 'playing';
  const duration = mine && p.durationMs > 0 ? p.durationMs : total;
  const position = drag ?? (mine ? p.positionMs : cued);
  const paths = rows.map((r) => r.path);

  useEffect(() => {
    let live = true;
    setBuckets(null);
    const counts = bucketsPerSegment(rows.map((r) => r.durationMs), 300);
    Promise.all(rows.map((r, i) => FlNative.getWaveform(r.path, counts[i]).catch(() => new Array<number>(counts[i]).fill(-9600)))).then(
      (parts) => live && setBuckets(parts.flat()),
      () => live && setBuckets([]),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // PanResponder callbacks must see fresh values: keep them in a ref.
  const ctx = useRef({ width, duration, id: rec.recordingId });
  ctx.current = { width, duration, id: rec.recordingId };
  const responder = useMemo(() => {
    const at = (x: number) => positionFromTouch(x, ctx.current.width, ctx.current.duration);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setDrag(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => setDrag(at(e.nativeEvent.locationX)),
      onPanResponderRelease: (e) => {
        const ms = at(e.nativeEvent.locationX);
        setDrag(null);
        setCued(ms);
        void seekIfLoaded(ctx.current.id, ms);
      },
      onPanResponderTerminate: () => setDrag(null),
    });
  }, []);

  const onPlay = () =>
    togglePlayback(rec.recordingId, paths, cued).catch((e: Error) =>
      Alert.alert(t('error'), e.message === 'PLAY_WHILE_RECORDING' ? t('playRefuse') : e.message),
    );

  const H = 64;
  const frac = playheadFraction(position, duration);
  return (
    <View style={s.card}>
      <Text style={[s.body, { fontWeight: '700' }]}>{`${t('recordingN')} ${props.index + 1}`}</Text>
      <View
        {...responder.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', marginVertical: 8, backgroundColor: colors.bg, borderRadius: 8, overflow: 'hidden' }}
      >
        {buckets === null ? (
          <Text style={s.small}>{t('playerLoading')}</Text>
        ) : (
          buckets.map((v, i) => (
            <View key={i} pointerEvents="none" style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              <View style={{ width: '70%', height: Math.max(1, peakToFraction(v) * H), backgroundColor: i / buckets.length <= frac ? colors.primary : colors.muted, opacity: i / buckets.length <= frac ? 1 : 0.5 }} />
            </View>
          ))
        )}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: `${frac * 100}%`, width: 3, backgroundColor: colors.danger }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <BigButton label={playing ? t('ctlPause') : t('ctlPlay')} disabled={recording || total === 0} onPress={onPlay} style={{ flex: 1, minHeight: 56, marginRight: 6 }} />
        <BigButton label={t('ctlStop')} variant="outline" disabled={!mine} onPress={() => void stopPlayback()} style={{ flex: 1, minHeight: 56, marginLeft: 6 }} />
      </View>
      <Text style={[s.body, { textAlign: 'center', marginTop: 4, fontVariant: ['tabular-nums'] }]}>{`${formatElapsed(position)} / ${formatElapsed(duration)}`}</Text>
    </View>
  );
}
