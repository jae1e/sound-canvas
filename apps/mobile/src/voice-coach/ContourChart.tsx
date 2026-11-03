import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { hzToMidi, isVoiced, noteName, type Frame, type TargetSpec } from '@vlc/voice-analysis';

export interface ContourSeries {
  frames: Frame[];
  color: string;
}

interface Props {
  series: ContourSeries[];
  /** Visible time span in seconds [t0, t1]. Defaults to the data extent. */
  span?: [number, number];
  target?: TargetSpec | null;
  /** Time at which the target clock starts (see targetClockStart). */
  targetT0?: number;
  width: number;
  height: number;
}

/** Pitch contour(s) over time on a semitone axis, with the target as a +-25 cent band. */
export function ContourChart({ series, span, target, targetT0 = 0, width, height }: Props) {
  const m = useMemo(() => {
    const all = series.flatMap((s) => s.frames);
    const t0 = span?.[0] ?? (all.length ? Math.min(...all.map((f) => f.t)) : 0);
    const t1 = span?.[1] ?? (all.length ? Math.max(...all.map((f) => f.t)) : 1);
    const midis = all.filter((f) => isVoiced(f)).map((f) => hzToMidi(f.f0!));
    const tgt = target?.notes.map((n) => n.midi) ?? [];
    const lo0 = Math.min(...midis, ...tgt, 1000);
    const hi0 = Math.max(...midis, ...tgt, -1000);
    let lo = lo0 > hi0 ? 55 : lo0 - 2;
    let hi = lo0 > hi0 ? 67 : hi0 + 2;
    if (hi - lo < 12) {
      const c = (hi + lo) / 2;
      lo = c - 6;
      hi = c + 6;
    }
    return { t0, t1: Math.max(t1, t0 + 0.5), lo, hi };
  }, [series, span, target]);

  const x = (t: number) => ((t - m.t0) / (m.t1 - m.t0)) * width;
  const y = (midi: number) => height - ((midi - m.lo) / (m.hi - m.lo)) * height;

  const grid: number[] = [];
  for (let n = Math.ceil(m.lo); n <= Math.floor(m.hi); n++) if (n % 12 === 0 || n % 12 === 7 || n % 12 === 4) grid.push(n);

  const targetRects: { x: number; w: number; midi: number }[] = [];
  if (target) {
    let acc = 0;
    for (const n of target.notes) {
      if (n.durationS === undefined) targetRects.push({ x: 0, w: width, midi: n.midi });
      else {
        targetRects.push({ x: x(targetT0 + acc), w: (n.durationS / (m.t1 - m.t0)) * width, midi: n.midi });
        acc += n.durationS;
      }
    }
  }
  const bandH = Math.max(2, (0.5 / (m.hi - m.lo)) * height);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#101418" />
        {grid.map((n) => (
          <Line key={n} x1={0} x2={width} y1={y(n)} y2={y(n)} stroke="#2a323a" strokeWidth={1} />
        ))}
        {grid.map((n) => (
          <SvgText key={`l${n}`} x={3} y={y(n) - 2} fill="#6b7782" fontSize={10}>
            {noteName(n)}
          </SvgText>
        ))}
        {targetRects.map((r, i) => (
          <Rect key={i} x={r.x} y={y(r.midi) - bandH / 2} width={Math.max(1, r.w)} height={bandH} fill="#2ecc71" opacity={0.35} />
        ))}
        {series.map((s, si) =>
          runs(s.frames).map((run, ri) => (
            <Polyline key={`${si}-${ri}`} points={run.map((f) => `${x(f.t).toFixed(1)},${y(hzToMidi(f.f0!)).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} />
          )),
        )}
      </Svg>
    </View>
  );
}

/** Splits into runs of consecutive voiced frames so unvoiced gaps are not joined by a line. */
function runs(frames: Frame[]): Frame[][] {
  const out: Frame[][] = [];
  let cur: Frame[] = [];
  for (const f of frames) {
    if (isVoiced(f)) cur.push(f);
    else if (cur.length) {
      if (cur.length > 1) out.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}
