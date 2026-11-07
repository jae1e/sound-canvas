import { useEffect, useState, type RefObject } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import type { FrameEvent } from '../../modules/vc-audio/src/VcAudio.types';
import type { RingBuffer } from '../recorder/ringBuffer';

export function VoiceStrip({ frames }: { frames: RefObject<RingBuffer<FrameEvent>> }) {
  const [samples, setSamples] = useState<FrameEvent[]>([]);
  useEffect(() => {
    const timer = setInterval(() => setSamples(frames.current.values()), 100);
    return () => clearInterval(timer);
  }, [frames]);
  const latest = samples.at(-1)?.tMs ?? 0;
  const visible = samples.filter((f) => latest - f.tMs <= 8000);
  let drawing = false;
  let path = '';
  for (const f of visible) {
    if (f.midi === null) {
      drawing = false;
      continue;
    }
    const x = 360 - ((latest - f.tMs) / 8000) * 360;
    const y = Math.max(4, Math.min(52, 36 - (f.midi - 45) * 0.5));
    path += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    drawing = true;
  }
  return (
    <View style={{ height: 56 }}>
      <Svg width="100%" height={56} viewBox="0 0 360 56" preserveAspectRatio="none">
        <Line x1={0} y1={28} x2={360} y2={28} stroke="#D6D3CC" strokeDasharray="2 3" />
        {visible
          .filter((_, i) => i % 4 === 0)
          .map((f, i) => {
            const x = 360 - ((latest - f.tMs) / 8000) * 360;
            const height = Math.max(1, Math.min(23, (f.rmsDb + 75) * 0.45));
            return (
              <Line
                key={i}
                x1={x}
                x2={x}
                y1={28 - height}
                y2={28 + height}
                stroke="#C9C7D2"
                strokeWidth={2}
              />
            );
          })}
        <Path d={path} fill="none" stroke="#4F46E5" strokeWidth={1.5} />
      </Svg>
    </View>
  );
}
