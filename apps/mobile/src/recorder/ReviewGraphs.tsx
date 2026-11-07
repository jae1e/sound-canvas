import { useRef } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { TakeAnalysis } from '../../modules/vc-audio/src/VcAudio.types';
import { noteName } from './derive';
import { Lanes } from './LiveGraphs';

export function ReviewGraphs({
  analysis,
  duration,
  position,
  beats,
  theme,
  onSeek,
  silentLabel,
}: {
  analysis: TakeAnalysis | null;
  duration: number;
  position: number;
  beats: number[];
  theme: 'dark' | 'light';
  onSeek: (position: number) => void;
  silentLabel: string;
}) {
  const dark = theme === 'dark';
  const notes =
    analysis?.midi.filter((value): value is number => value !== null && Number.isFinite(value)) ?? [];
  const low = notes.length ? Math.floor(Math.min(...notes)) : 54;
  const high = notes.length ? Math.ceil(Math.max(...notes)) : 66;
  const count = Math.max(13, high - low + 1);
  const bottom = Math.floor((low + high - count + 1) / 2);
  let path = '';
  let voiced = false;
  analysis?.midi.forEach((note, i) => {
    if (note === null) {
      voiced = false;
      return;
    }
    const x = (analysis.tMs[i] / duration) * 360;
    const y = 300 - ((note - bottom + 0.5) / count) * 300;
    path += `${voiced ? 'L' : 'M'}${x} ${y} `;
    voiced = true;
  });
  const width = useRef(1);
  const seek = (x: number) => onSeek((x / width.current) * duration);
  return (
    <View
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => seek(event.nativeEvent.locationX)}
      onResponderMove={(event) => seek(event.nativeEvent.locationX)}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position) }}
    >
      <View style={{ height: 250 }}>
        <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="none">
          {count === 13 ? (
            <Lanes bottom={bottom} theme={theme} />
          ) : (
            Array.from({ length: count }, (_, i) => {
              const y = 300 - ((i + 1) * 300) / count;
              const sharp = [1, 3, 6, 8, 10].includes((((bottom + i) % 12) + 12) % 12);
              return (
                <Rect
                  key={i}
                  x="0"
                  y={y}
                  width="360"
                  height={300 / count}
                  fill={sharp ? (dark ? '#121620' : '#F0EEE8') : 'transparent'}
                  stroke={dark ? '#1D222C' : '#E6E3DC'}
                  strokeWidth="0.5"
                />
              );
            })
          )}
          <Path d={path} stroke={dark ? '#5EEAD4' : '#4F46E5'} strokeWidth="2.6" fill="none" />
        </Svg>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 10, top: 0, bottom: 0, justifyContent: 'space-around' }}
        >
          {Array.from({ length: count }, (_, i) => bottom + count - 1 - i).map((note) => (
            <Text key={note} style={{ color: dark ? '#6B7486' : '#9A9DA6', fontSize: 10 }}>
              {[1, 3, 6, 8, 10].includes(((note % 12) + 12) % 12) ? '' : noteName(note)}
            </Text>
          ))}
        </View>
        {analysis && !notes.length && (
          <Text
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: '45%',
              color: dark ? '#8A93A5' : '#6C6F78',
            }}
          >
            {silentLabel}
          </Text>
        )}
      </View>
      <Svg width="100%" height={78} viewBox="0 0 360 78" preserveAspectRatio="none">
        <Line x1="0" x2="360" y1="39" y2="39" stroke={dark ? '#9AA5B8' : '#9A9DA6'} />
        {analysis?.peaks.map((peak, i) => {
          const height = Math.max(1, Math.min(68, peak * 68));
          return (
            <Rect
              key={i}
              x={(i / analysis.peaks.length) * 360}
              y={(78 - height) / 2}
              width={Math.max(0.5, 360 / analysis.peaks.length)}
              height={height}
              fill={dark ? '#9AA5B8' : '#9A9DA6'}
            />
          );
        })}
      </Svg>
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 360 328"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {beats.map((beat, i) => (
          <Line
            key={i}
            x1={(beat / duration) * 360}
            x2={(beat / duration) * 360}
            y1="0"
            y2="328"
            stroke={dark ? '#FFF' : '#55585F'}
            opacity={0.25}
          />
        ))}
        <Line
          x1={(position / duration) * 360}
          x2={(position / duration) * 360}
          y1="0"
          y2="328"
          stroke={dark ? '#FFF' : '#4F46E5'}
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
}
