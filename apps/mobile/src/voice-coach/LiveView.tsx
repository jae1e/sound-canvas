import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { midiToHz, hzToMidi, centsBetween, centsWord, noteLabel, targetClockStart, isVoiced, type Frame, type Lang, type NoteStyle, type TargetSpec } from '@vlc/voice-analysis';
import { ContourChart } from './ContourChart';
import { KeyboardStrip, type StripRange } from './KeyboardStrip';
import type { LiveState } from './useLiveTracker';
import type { T } from './strings';
import { Button, Card, colors, s } from './ui';

const DB_FLOOR = -60;

/** Big note, cents needle, scrolling contour against the target, loudness meter. */
export function LiveView({ live, target, t, lang, noteStyle, range }: { live: LiveState; target: TargetSpec | null; t: T; lang: Lang; noteStyle: NoteStyle; range: StripRange | null }) {
  const [w, setW] = useState(300);
  const [help, setHelp] = useState(false);
  const last = live.last;
  const voiced = last && last.f0 !== null && last.voicing >= 0.5;

  // With a single held target the needle reads against the target; otherwise against the nearest note.
  const held = target && target.notes.length === 1 && target.notes[0]!.durationS === undefined ? target.notes[0]!.midi : null;
  const cents = voiced ? (held !== null ? centsBetween(last!.f0!, midiToHz(held)) : last!.cents ?? 0) : null;
  const clamped = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const needleColor = cents === null ? '#8a949c' : Math.abs(cents) <= 10 ? colors.ok : Math.abs(cents) <= 25 ? colors.warn : colors.bad;
  const word = cents === null ? '' : centsWord(cents, lang);

  const frames: Frame[] = live.frames;
  const tEnd = frames.length ? frames[frames.length - 1]!.t : 8;
  const span: [number, number] = [tEnd - 8, tEnd];
  const t0 = target ? targetClockStart(frames, target) : 0;
  const loud = last ? Math.max(0, Math.min(1, (last.rmsDb - DB_FLOOR) / -DB_FLOOR)) : 0;

  // Median of the voiced pitch in the rolling window; the strip centres on it.
  const medianMidi = useMemo(() => {
    const m = frames.filter((f) => isVoiced(f)).map((f) => hzToMidi(f.f0!)).sort((a, b) => a - b);
    return m.length ? m[Math.floor(m.length / 2)]! : null;
  }, [frames]);
  const heldTarget = target && target.notes.length ? target.notes[0]!.midi : null;
  const currentMidi = voiced ? hzToMidi(last!.f0!) : null;

  return (
    <Card title={t('live')}>
      <View onLayout={(e) => setW(Math.max(100, e.nativeEvent.layout.width))}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', textAlign: 'center', color: voiced ? '#14202a' : '#b0b8bf' }} accessibilityLabel="current note">
            {voiced ? noteLabel(last!.f0!, noteStyle, lang) : '–'}
          </Text>
          <Button label={t('helpToggle')} onPress={() => setHelp((h) => !h)} active={help} />
        </View>
        {help ? (
          <View style={{ backgroundColor: '#eef4fb', borderRadius: 8, padding: 10, gap: 4, marginVertical: 4 }} accessibilityLabel="note help">
            <Text style={[s.body, { fontWeight: '700' }]}>{t('helpTitle')}</Text>
            {t.lines('helpLines').map((l, i) => (
              <Text key={i} style={s.body}>
                {l}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={[s.muted, { textAlign: 'center' }]}>{voiced ? `${cents! >= 0 ? '+' : ''}${cents!.toFixed(0)} ${t('centsUnit')}` : t('noPitch')}</Text>
        {/* Cents needle: centre = on pitch (+-10 cents), wider band = a bit off (+-25 cents). */}
        <View style={{ height: 22, marginVertical: 8, backgroundColor: '#e8eef3', borderRadius: 11, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: '25%', width: '50%', top: 0, bottom: 0, backgroundColor: '#f6e7cf' }} />
          <View style={{ position: 'absolute', left: '40%', width: '20%', top: 0, bottom: 0, backgroundColor: '#cfeedd' }} />
          <View style={{ position: 'absolute', left: '50%', width: 2, top: 0, bottom: 0, backgroundColor: '#14202a' }} />
          <View style={{ position: 'absolute', left: `${50 + clamped}%`, marginLeft: -6, width: 12, top: 2, bottom: 2, borderRadius: 6, backgroundColor: needleColor }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.muted}>{lang === 'ko' ? '낮음' : 'flat'}</Text>
          <Text style={[s.body, { fontWeight: '700', color: needleColor }]} accessibilityLabel="cents word">
            {voiced ? word : ''}
          </Text>
          <Text style={s.muted}>{lang === 'ko' ? '높음' : 'sharp'}</Text>
        </View>
        <Text style={s.label}>{t('keyboard')}</Text>
        <KeyboardStrip medianMidi={medianMidi} currentMidi={currentMidi} targetMidi={heldTarget} range={range} style={noteStyle} lang={lang} width={w} />
        <Text style={s.muted}>{t('keyboardLegend')}</Text>
        <ContourChart series={[{ frames, color: colors.a }]} noteStyle={noteStyle} lang={lang} span={span} target={target} targetT0={t0} width={w} height={150} />
        <View style={{ marginTop: 8 }}>
          <Text style={s.label}>
            {t('loudness')} {last ? `${last.rmsDb.toFixed(0)} dBFS` : ''}
          </Text>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: '#e8eef3', overflow: 'hidden' }}>
            <View style={{ width: `${loud * 100}%`, height: '100%', backgroundColor: loud > 0.92 ? colors.bad : colors.ok }} />
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

