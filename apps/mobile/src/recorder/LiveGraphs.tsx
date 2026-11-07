import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { FrameEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { centerPitchRange, noteName } from './derive';
import type { RingBuffer } from './ringBuffer';

type Props = { frames: RefObject<RingBuffer<FrameEvent>>; theme: 'dark' | 'light' };
function useFrames(frames: Props['frames']) {
  const [snapshot, setSnapshot] = useState<FrameEvent[]>([]);
  useEffect(() => {
    let id = 0;
    let last = 0;
    const tick = (time: number) => {
      if (time - last >= 1000 / 30) {
        last = time;
        setSnapshot(frames.current.values());
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [frames]);
  return snapshot;
}
const Lanes = memo(function Lanes({ bottom, theme }: { bottom: number; theme: 'dark' | 'light' }) {
  const dark = theme === 'dark';
  return (
    <>
      {Array.from({ length: 13 }, (_, i) => {
        const note = bottom + i;
        const y = 300 - (i + 1) * (300 / 13);
        const sharp = [1, 3, 6, 8, 10].includes(((note % 12) + 12) % 12);
        return <ReactLane key={note} y={y} sharp={sharp} dark={dark} />;
      })}
    </>
  );
});
function ReactLane({ y, sharp, dark }: { y: number; sharp: boolean; dark: boolean }) {
  return (
    <>
      {sharp ? <Rect x="0" y={y} width="360" height={300 / 13} fill={dark ? '#121620' : '#F0EEE8'} /> : null}
      <Line
        x1="34"
        x2="360"
        y1={y + 300 / 13}
        y2={y + 300 / 13}
        stroke={dark ? '#1D222C' : '#E6E3DC'}
        strokeWidth="1"
      />
    </>
  );
}
export function PitchRoll({ frames, theme }: Props) {
  const samples = useFrames(frames);
  const center = useRef(60);
  const recent = samples.filter((f) => f.midi !== null).map((f) => f.midi as number);
  center.current = centerPitchRange(center.current, recent);
  const bottom = Math.round(center.current) - 6;
  const latest = samples.at(-1)?.tMs ?? 0;
  let path = '';
  let lastVoiced = false;
  let dot: { x: number; y: number } | null = null;
  for (const f of samples) {
    const x = 309.6 - ((latest - f.tMs) / 8000) * 274;
    if (x < 35 || f.midi === null) {
      lastVoiced = false;
      continue;
    }
    const y = 300 - (f.midi - bottom + 0.5) * (300 / 13);
    path += `${lastVoiced ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    lastVoiced = true;
    dot = { x, y };
  }
  const color = theme === 'dark' ? '#5EEAD4' : '#4F46E5';
  return (
    <View style={{ flex: 1, minHeight: 100, marginTop: 6 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 10,
          top: 0,
          bottom: 0,
          width: 28,
          justifyContent: 'space-around',
        }}
      >
        {Array.from({ length: 13 }, (_, i) => bottom + 12 - i).map((note) => (
          <Text key={note} style={{ color: theme === 'dark' ? '#6B7486' : '#9A9DA6', fontSize: 10 }}>
            {[1, 3, 6, 8, 10].includes(((note % 12) + 12) % 12) ? '' : noteName(note)}
          </Text>
        ))}
      </View>
      <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="none">
        <Lanes bottom={bottom} theme={theme} />
        <Line
          x1="309.6"
          x2="309.6"
          y1="0"
          y2="300"
          stroke={theme === 'dark' ? '#2B3242' : '#D9D6CE'}
          strokeDasharray="3 4"
        />
        <Path d={path} stroke={color} strokeWidth="7" opacity={0.13} fill="none" />
        <Path
          d={path}
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {dot && lastVoiced ? (
          <>
            <Circle cx={dot.x} cy={dot.y} r="11" fill={color} opacity={0.18} />
            <Circle cx={dot.x} cy={dot.y} r="5.5" fill={color} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
export function Waveform({ frames, theme }: Props) {
  const samples = useFrames(frames);
  const latest = samples.at(-1);
  const bars = useMemo(() => samples.filter((_, i) => i % 5 === 0).slice(-70), [samples]);
  return (
    <View style={{ height: 78, marginBottom: 4 }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 78" preserveAspectRatio="none">
        {bars.map((f, i) => {
          const h = Math.max(2, Math.min(68, f.peak * 68));
          return (
            <Rect
              key={`${f.tMs}-${i}`}
              x={309 - (bars.length - i) * 4}
              y={(78 - h) / 2}
              width="2.4"
              height={h}
              rx="1.2"
              fill={theme === 'dark' ? '#9AA5B8' : '#9A9DA6'}
            />
          );
        })}
        <Line x1="309.6" x2="309.6" y1="0" y2="78" stroke={theme === 'dark' ? '#2B3242' : '#D9D6CE'} />
      </Svg>
      <Text style={{ position: 'absolute', right: 14, top: 0, fontSize: 11, color: '#6B7486' }}>
        {Math.round(latest?.rmsDb ?? -100)} dB
      </Text>
    </View>
  );
}
