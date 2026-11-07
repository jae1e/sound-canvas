import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import { deviceLabel, outputLabel, rmsLevel } from './deviceLabels';
import type { DevicesEvent } from '../../modules/vc-audio/src/VcAudio.types';
export function AudioBar({
  theme,
  devices,
  level,
  onInput,
  onOutput,
}: {
  theme: 'dark' | 'light';
  devices: DevicesEvent | null;
  level: number;
  onInput: () => void;
  onOutput: () => void;
}) {
  const { t } = useTranslation();
  const dark = theme === 'dark';
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
      {(['input', 'output'] as const).map((kind) => (
        <Pressable
          key={kind}
          onPress={kind === 'input' ? onInput : onOutput}
          style={({ pressed }) => ({
            flex: 1,
            height: 40,
            borderRadius: 20,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: dark ? '#171C25' : '#FFF',
            borderWidth: 1,
            borderColor: dark ? '#262D3A' : '#E6E3DC',
            opacity: pressed ? 0.7 : 1,
            overflow: 'hidden',
          })}
        >
          <Ionicons
            name={kind === 'input' ? 'mic-outline' : 'headset-outline'}
            size={17}
            color={dark ? '#5EEAD4' : '#4F46E5'}
          />
          <Text numberOfLines={1} style={{ flex: 1, color: dark ? '#D6DBE4' : '#33363D', fontSize: 13 }}>
            {kind === 'input'
              ? deviceLabel(devices?.activeInput, 'input', t)
              : outputLabel(devices?.activeOutput, devices?.outputs ?? [], t)}
          </Text>
          <Ionicons
            name={devices?.locked ? 'lock-closed-outline' : 'chevron-down'}
            size={14}
            color="#8A93A5"
          />
          {kind === 'input' && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                width: `${Math.max(0, Math.min(100, rmsLevel(level) * 100))}%`,
                backgroundColor: '#5EEAD4',
              }}
            />
          )}
        </Pressable>
      ))}
    </View>
  );
}
