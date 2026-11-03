import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { noteName, type Frame, type TakeSummary } from '@vlc/voice-analysis';
import { ContourChart } from './ContourChart';
import type { T } from './strings';
import { Button, Card, colors, Row, s } from './ui';

export interface TakeEntry {
  id: string;
  durationS: number;
  createdAtMs: number;
  frames?: Frame[];
  summary?: TakeSummary;
}

interface Props {
  takes: TakeEntry[];
  notes: Record<string, string>;
  onNote: (id: string, text: string) => void;
  playingId: string | null;
  onPlay: (id: string) => void;
  onStopPlay: () => void;
  onDelete: (id: string) => void;
  compare: string[];
  onToggleCompare: (id: string) => void;
  t: T;
  lang: 'ko' | 'en';
  busy: boolean;
}

const fmt = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? '–' : v.toFixed(d));

export function TakesPanel(p: Props) {
  const { t } = p;
  const [w, setW] = useState(300);
  const a = p.takes.find((x) => x.id === p.compare[0]);
  const b = p.takes.find((x) => x.id === p.compare[1]);

  return (
    <>
      <Card title={t('takes')}>
        {p.takes.length === 0 ? <Text style={s.muted}>{t('noTakes')}</Text> : null}
        {p.takes.map((tk) => {
          const idx = p.compare.indexOf(tk.id);
          const playing = p.playingId === tk.id;
          return (
            <View key={tk.id} style={{ borderTopWidth: 1, borderTopColor: '#e3e8ec', paddingTop: 8, gap: 6 }}>
              <Text style={s.body}>
                {new Date(tk.createdAtMs).toLocaleString()} · {tk.durationS.toFixed(1)} {t('seconds')}
              </Text>
              {tk.summary ? <Text style={s.muted}>{tk.summary.text[p.lang]}</Text> : null}
              <Row>
                <Button label={playing ? t('stopPlay') : t('play')} onPress={() => (playing ? p.onStopPlay() : p.onPlay(tk.id))} active={playing} disabled={p.busy} />
                <Button label={idx >= 0 ? `${t('selected')} ${idx === 0 ? 'A' : 'B'}` : `${t('compare')}`} onPress={() => p.onToggleCompare(tk.id)} active={idx >= 0} />
                <Button label={t('delete')} onPress={() => p.onDelete(tk.id)} disabled={p.busy} />
              </Row>
              <TextInput
                value={p.notes[tk.id] ?? ''}
                onChangeText={(v) => p.onNote(tk.id, v)}
                placeholder={t('notePlaceholder')}
                placeholderTextColor="#8a949c"
                multiline
                accessibilityLabel={t('notes')}
                style={{ borderWidth: 1, borderColor: '#c9d1d8', borderRadius: 8, padding: 8, minHeight: 40, color: '#14202a' }}
              />
            </View>
          );
        })}
      </Card>

      <Card title={t('compare')}>
        {!a || !b ? (
          <Text style={s.muted}>{t('compareHint')}</Text>
        ) : (
          <View onLayout={(e) => setW(Math.max(100, e.nativeEvent.layout.width))}>
            {a.frames && b.frames ? (
              <ContourChart
                series={[
                  { frames: a.frames, color: colors.a },
                  { frames: b.frames, color: colors.b },
                ]}
                span={[0, Math.max(a.durationS, b.durationS)]}
                width={w}
                height={170}
              />
            ) : (
              <Text style={s.muted}>{t('analyzing')}</Text>
            )}
            <MetricsTable a={a} b={b} t={t} />
            <Text style={s.muted}>{t('heuristicNote')}</Text>
          </View>
        )}
      </Card>
    </>
  );
}

function MetricsTable({ a, b, t }: { a: TakeEntry; b: TakeEntry; t: T }) {
  const ma = a.summary?.metrics;
  const mb = b.summary?.metrics;
  if (!ma || !mb) return null;
  const range = (m: typeof ma) => (m.range ? `${noteName(m.range.lowMidi)}–${noteName(m.range.highMidi)}` : '–');
  const rows: [string, string, string][] = [
    [t('mStability'), fmt(ma.stability.sdCents, 1), fmt(mb.stability.sdCents, 1)],
    [t('mWithin25'), fmt(ma.target?.within25Pct), fmt(mb.target?.within25Pct)],
    [t('mWithin50'), fmt(ma.target?.within50Pct), fmt(mb.target?.within50Pct)],
    [t('mRange'), range(ma), range(mb)],
    [t('mLoudness'), fmt(ma.loudness.meanDb), fmt(mb.loudness.meanDb)],
    [t('mLoudnessSd'), fmt(ma.loudness.sdDb, 1), fmt(mb.loudness.sdDb, 1)],
    [t('mPauses'), `${ma.pauses.count} / ${ma.pauses.totalS.toFixed(1)}`, `${mb.pauses.count} / ${mb.pauses.totalS.toFixed(1)}`],
    [t('mVoiced'), fmt(ma.voicedRatio * 100), fmt(mb.voicedRatio * 100)],
    [t('mBrightness'), fmt(ma.brightnessHz), fmt(mb.brightnessHz)],
    [t('mBreathy'), fmt(ma.hnrDb, 1), fmt(mb.hnrDb, 1)],
  ];
  return (
    <View style={{ marginTop: 8 }}>
      <Row>
        <Text style={[s.label, { flex: 2 }]}>{t('metric')}</Text>
        <Text style={[s.label, { flex: 1, color: colors.a }]}>A</Text>
        <Text style={[s.label, { flex: 1, color: colors.b }]}>B</Text>
      </Row>
      {rows.map(([label, x, y]) => (
        <View key={label} style={{ flexDirection: 'row', paddingVertical: 3, borderTopWidth: 1, borderTopColor: '#eef1f4' }}>
          <Text style={[s.body, { flex: 2, fontSize: 13 }]}>{label}</Text>
          <Text style={[s.body, { flex: 1 }]}>{x}</Text>
          <Text style={[s.body, { flex: 1 }]}>{y}</Text>
        </View>
      ))}
    </View>
  );
}
