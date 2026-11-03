import { useState } from 'react';
import { Text, View } from 'react-native';
import { midiToHz, centsBetween, targetClockStart, type Frame, type TargetSpec } from '@vlc/voice-analysis';
import { ContourChart } from './ContourChart';
import type { LiveState } from './useLiveTracker';
import type { T } from './strings';
import { Card, colors, s } from './ui';

const DB_FLOOR = -60;

/** Big note, cents needle, scrolling contour against the target, loudness meter. */
export function LiveView({ live, target, t }: { live: LiveState; target: TargetSpec | null; t: T }) {
  const [w, setW] = useState(300);
  const last = live.last;
  const voiced = last && last.f0 !== null && last.voicing >= 0.5;

  // With a single held target the needle reads against the target; otherwise against the nearest note.
  const held = target && target.notes.length === 1 && target.notes[0]!.durationS === undefined ? target.notes[0]!.midi : null;
  const cents = voiced ? (held !== null ? centsBetween(last!.f0!, midiToHz(held)) : last!.cents ?? 0) : null;
  const clamped = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const needleColor = cents === null ? '#8a949c' : Math.abs(cents) <= 25 ? colors.ok : Math.abs(cents) <= 50 ? colors.warn : colors.bad;

  const frames: Frame[] = live.frames;
  const tEnd = frames.length ? frames[frames.length - 1]!.t : 8;
  const span: [number, number] = [tEnd - 8, tEnd];
  const t0 = target ? targetClockStart(frames, target) : 0;
  const level = last ? Math.max(0, Math.min(1, (last.rmsDb - DB_FLOOR) / -DB_FLOOR)) : 0;

  return (
    <Card title={t('live')}>
      <View onLayout={(e) => setW(Math.max(100, e.nativeEvent.layout.width))}>
        <Text style={{ fontSize: 64, fontWeight: '800', textAlign: 'center', color: voiced ? '#14202a' : '#b0b8bf' }} accessibilityLabel="current note">
          {voiced ? last!.note : '–'}
        </Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          {voiced ? `${last!.f0!.toFixed(1)} Hz · ${cents! >= 0 ? '+' : ''}${cents!.toFixed(0)} ¢ ${Math.abs(cents!) > 25 ? (cents! > 0 ? t('sharp') : t('flat')) : ''}` : t('noPitch')}
        </Text>
        {/* Cents needle: centre = in tune, band = +-25 cents. */}
        <View style={{ height: 22, marginVertical: 8, backgroundColor: '#e8eef3', borderRadius: 11, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: '25%', width: '50%', top: 0, bottom: 0, backgroundColor: '#cfeedd' }} />
          <View style={{ position: 'absolute', left: '50%', width: 2, top: 0, bottom: 0, backgroundColor: '#14202a' }} />
          <View style={{ position: 'absolute', left: `${50 + clamped}%`, marginLeft: -6, width: 12, top: 2, bottom: 2, borderRadius: 6, backgroundColor: needleColor }} />
        </View>
        <ContourChart series={[{ frames, color: colors.a }]} span={span} target={target} targetT0={t0} width={w} height={150} />
        <View style={{ marginTop: 8 }}>
          <Text style={s.label}>
            {t('loudness')} {last ? `${last.rmsDb.toFixed(0)} dBFS` : ''}
          </Text>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: '#e8eef3', overflow: 'hidden' }}>
            <View style={{ width: `${level * 100}%`, height: '100%', backgroundColor: level > 0.92 ? colors.bad : colors.ok }} />
          </View>
        </View>
        {live.info ? (
          <Text style={s.muted}>
            {t('source')}: {live.info.source}, {live.info.sampleRate / 1000} kHz
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

