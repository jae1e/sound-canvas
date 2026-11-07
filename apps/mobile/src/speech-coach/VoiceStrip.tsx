import { useEffect, useState, type RefObject } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { FrameEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { Waveform } from '../recorder/LiveGraphs';
import type { RingBuffer } from '../recorder/ringBuffer';

export function VoiceStrip({ frames }: { frames: RefObject<RingBuffer<FrameEvent>> }) {
  const [samples, setSamples] = useState<FrameEvent[]>([]);
  useEffect(() => {
    const timer = setInterval(() => setSamples(frames.current.values()), 100);
    return () => clearInterval(timer);
  }, [frames]);
  const latest = samples.at(-1)?.tMs ?? 0;
  let drawing = false;
  let path = '';
  for (const f of samples) {
    if (f.midi === null || latest - f.tMs > 8000) { drawing = false; continue; }
    const x = 360 - ((latest - f.tMs) / 8000) * 360;
    const y = Math.max(2, Math.min(28, 26 - (f.midi - 45) * 0.5));
    path += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    drawing = true;
  }
  return <View><Waveform frames={frames} theme="light" /><Svg width="100%" height={30} viewBox="0 0 360 30" preserveAspectRatio="none"><Path d={path} fill="none" stroke="#4F46E5" strokeWidth={1.5} /></Svg></View>;
}
