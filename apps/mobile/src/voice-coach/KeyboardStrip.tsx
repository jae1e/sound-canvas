import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { formatNote, isBlackKey, noteParts, type Lang, type NoteStyle } from '@vlc/voice-analysis';
import { colors } from './ui';

/** The strip never re-renders faster than this (about 20 Hz). */
export const STRIP_MIN_INTERVAL_MS = 50;
const SPAN = 24; // semitones shown, about 2 octaves
/** Re-centre only when the recent median drifts this far from the window centre, so the keys do not jitter. */
const RECENTER_SEMITONES = 4;

export interface StripRange {
  lowMidi: number;
  highMidi: number;
}

interface Props {
  /** Recent median pitch as a (fractional) MIDI number; null before any voiced frame. */
  medianMidi: number | null;
  currentMidi: number | null;
  targetMidi: number | null;
  /** Measured range from takes. */
  range: StripRange | null;
  style: NoteStyle;
  lang: Lang;
  width: number;
}

/** Latest value, republished at most once per `minMs`. */
export function useThrottled<V>(value: V, minMs: number): V {
  const [out, setOut] = useState(value);
  const latest = useRef(value);
  const lastAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  latest.current = value;
  useEffect(() => {
    const now = Date.now();
    const wait = lastAt.current + minMs - now;
    if (wait <= 0) {
      lastAt.current = now;
      setOut(value);
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        lastAt.current = Date.now();
        setOut(latest.current);
      }, wait);
    }
  }, [value, minMs]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return out;
}

/** Small piano strip: ~2 octaves around the recent median, current/target keys highlighted, measured range as a bar. */
export function KeyboardStrip(props: Props) {
  const p = useThrottled(props, STRIP_MIN_INTERVAL_MS);
  const centre = useRef<number | null>(null);
  if (p.medianMidi !== null && (centre.current === null || Math.abs(p.medianMidi - centre.current) > RECENTER_SEMITONES)) {
    centre.current = Math.round(p.medianMidi);
  }
  const c = centre.current ?? 60;
  const first = c - SPAN / 2;
  const last = first + SPAN;
  const mids: number[] = [];
  for (let m = first; m <= last; m++) mids.push(m);
  const whites = mids.filter((m) => !isBlackKey(m));
  const keyW = p.width / whites.length;
  const whiteX = new Map<number, number>();
  whites.forEach((m, i) => whiteX.set(m, i * keyW));
  const h = 56;
  const rangeH = 6;
  /** X centre of any key (black keys sit between the neighbouring whites). */
  const cx = (m: number) => (isBlackKey(m) ? (whiteX.get(m - 1) ?? 0) + keyW : (whiteX.get(m) ?? 0) + keyW / 2);
  const cur = p.currentMidi === null ? null : Math.round(p.currentMidi);
  const tgt = p.targetMidi === null ? null : Math.round(p.targetMidi);
  const fillFor = (m: number, base: string) => (m === cur ? colors.a : m === tgt ? colors.ok : base);
  const blackW = keyW * 0.6;

  return (
    <View accessibilityLabel="keyboard strip" style={{ width: p.width, height: h + rangeH + 2 }}>
      <Svg width={p.width} height={h + rangeH + 2}>
        {whites.map((m) => (
          <Rect key={m} x={whiteX.get(m)!} y={0} width={keyW - 1} height={h} fill={fillFor(m, '#fff')} stroke="#9aa5ae" strokeWidth={1} />
        ))}
        {whites
          .filter((m) => noteParts(m).pc === 0)
          .map((m) => (
            <SvgText key={`l${m}`} x={whiteX.get(m)! + keyW / 2} y={h - 4} fill="#52606b" fontSize={9} textAnchor="middle">
              {formatNote(m, p.style === 'letter' ? 'scientific' : p.style, p.lang)}
            </SvgText>
          ))}
        {mids
          .filter((m) => isBlackKey(m))
          .map((m) => (
            <Rect key={m} x={cx(m) - blackW / 2} y={0} width={blackW} height={h * 0.6} fill={fillFor(m, '#14202a')} stroke={m === cur || m === tgt ? '#14202a' : 'none'} />
          ))}
        {p.range ? (
          <Rect
            x={Math.max(0, cx(Math.max(p.range.lowMidi, first)) - keyW / 2)}
            y={h + 2}
            width={Math.max(2, Math.min(p.width, cx(Math.min(p.range.highMidi, last)) + keyW / 2) - Math.max(0, cx(Math.max(p.range.lowMidi, first)) - keyW / 2))}
            height={rangeH}
            rx={3}
            fill={colors.b}
            opacity={p.range.highMidi < first || p.range.lowMidi > last ? 0 : 1}
          />
        ) : null}
      </Svg>
    </View>
  );
}
