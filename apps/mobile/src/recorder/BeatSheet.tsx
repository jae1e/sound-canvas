import { useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { BeatPattern } from '../../modules/vc-audio/src/VcAudio.types';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { useTranslation } from '../i18n';
import { Sheet } from './Sheet';

export type BeatSettings = {
  bpm: number;
  beatsPerBar: 2 | 3 | 4 | 6;
  pattern: BeatPattern;
  countIn: boolean;
  enabled: boolean;
};
export const DEFAULT_BEAT: BeatSettings = {
  bpm: 92,
  beatsPerBar: 4,
  pattern: 'click',
  countIn: true,
  enabled: false,
};
const PATTERNS: Record<BeatPattern, string> = {
  click: '1000100010001000',
  eight: '1010101010101010',
  sixteen: '1111111111111111',
  ballad: '1000001000100000',
  shuffle: '1001001001001001',
  bossa: '1001001000101000',
  hiphop: '1000101001001010',
};

function BeatPatternTile({
  pattern,
  selected,
  label,
  onPress,
}: {
  pattern: BeatPattern;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: '23%',
        height: 55,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: selected ? '#15342F' : '#202733',
        borderWidth: 1,
        borderColor: selected ? '#38BFAE' : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Svg width={42} height={12} viewBox="0 0 34 10">
        {[...PATTERNS[pattern]].map((v, i) => (
          <Circle
            key={i}
            cx={1.5 + i * 2.07}
            cy={5}
            r={v === '1' ? 1.1 : 0.45}
            fill={selected ? '#5EEAD4' : '#8A93A5'}
          />
        ))}
      </Svg>
      <Text style={{ color: selected ? '#5EEAD4' : '#CBD1DC', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export function BeatSheet({
  visible,
  onClose,
  theme,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  value: BeatSettings;
  onChange: (value: BeatSettings) => void;
}) {
  const { t } = useTranslation();
  const taps = useRef<number[]>([]);
  const [width, setWidth] = useState(1);
  const color = theme === 'dark' ? '#E8EBF1' : '#1B1D22';
  const patch = (p: Partial<BeatSettings>) => onChange({ ...value, ...p });
  const slider = (x: number) => patch({ bpm: Math.round(30 + Math.max(0, Math.min(1, x / width)) * 210) });
  const switchControl = (v: boolean, onValueChange: (v: boolean) => void) => (
    <Switch
      value={v}
      onValueChange={onValueChange}
      trackColor={{ false: '#3A4457', true: '#288D80' }}
      thumbColor="#FFF"
    />
  );
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={t('common.coach.beat')}
      headerRight={switchControl(value.enabled, (enabled) => patch({ enabled }))}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        {[-1, 0, 1].map((n) =>
          n === 0 ? (
            <View key={n} style={{ alignItems: 'center' }}>
              <Text style={{ color, fontWeight: '800', fontSize: 50, lineHeight: 54 }}>{value.bpm}</Text>
              <Text style={{ color: '#8A93A5', fontSize: 11 }}>BPM</Text>
            </View>
          ) : (
            <Pressable
              key={n}
              onPress={() => patch({ bpm: Math.max(30, Math.min(240, value.bpm + n)) })}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#222936',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color, fontSize: 26 }}>{n < 0 ? '−' : '+'}</Text>
            </Pressable>
          ),
        )}
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => slider(e.nativeEvent.locationX)}
        onResponderMove={(e) => slider(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        accessibilityLabel="BPM"
        accessibilityValue={{ min: 30, max: 240, now: value.bpm }}
        style={{ height: 36, justifyContent: 'center' }}
      >
        <View style={{ height: 4, backgroundColor: '#3A4457', borderRadius: 2 }}>
          <View
            style={{ width: `${((value.bpm - 30) / 210) * 100}%`, height: 4, backgroundColor: '#5EEAD4' }}
          />
          <View
            style={{
              position: 'absolute',
              left: `${((value.bpm - 30) / 210) * 100}%`,
              marginLeft: -9,
              top: -7,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#FFF',
            }}
          />
        </View>
      </View>
      <Pressable
        onPress={() => {
          const now = VcAudio.nowMs();
          taps.current = [...taps.current.filter((n) => now - n < 3000), now].slice(-5);
          if (taps.current.length > 1) {
            const span = now - taps.current[0];
            if (span > 0)
              patch({
                bpm: Math.max(30, Math.min(240, Math.round((60000 * (taps.current.length - 1)) / span))),
              });
          }
        }}
        style={{ backgroundColor: '#222936', padding: 12, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color }}>{t('common.coach.tapTempo')}</Text>
      </Pressable>
      <View
        style={{ flexDirection: 'row', backgroundColor: '#202733', borderRadius: 12, marginVertical: 12 }}
      >
        {([4, 3, 6, 2] as const).map((n) => (
          <Pressable
            key={n}
            onPress={() => patch({ beatsPerBar: n })}
            style={{
              flex: 1,
              alignItems: 'center',
              padding: 10,
              borderRadius: 10,
              backgroundColor: value.beatsPerBar === n ? '#303A4B' : 'transparent',
            }}
          >
            <Text style={{ color }}>
              {n}/{n === 6 ? 8 : 4}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '2.5%' }}>
        {(Object.keys(PATTERNS) as BeatPattern[]).map((pattern) => (
          <BeatPatternTile
            key={pattern}
            pattern={pattern}
            selected={pattern === value.pattern}
            label={t(`common.coach.pattern.${pattern}`)}
            onPress={() => patch({ pattern })}
          />
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
        }}
      >
        <Text style={{ color, fontWeight: '700' }}>{t('common.coach.countIn')}</Text>
        {switchControl(value.countIn, (countIn) => patch({ countIn }))}
      </View>
    </Sheet>
  );
}
