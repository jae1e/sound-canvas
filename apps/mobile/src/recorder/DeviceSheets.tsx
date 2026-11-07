import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { DevicesEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { useTranslation } from '../i18n';
import { Sheet } from './Sheet';
import { Calibration } from './Calibration';
type Props = {
  visible: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  devices: DevicesEvent | null;
  onError: () => void;
};
function Choice({
  text,
  selected,
  onPress,
  theme,
}: {
  text: string;
  selected: boolean;
  onPress: () => void;
  theme: 'dark' | 'light';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: 14,
        marginBottom: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? '#5EEAD4' : 'transparent',
        backgroundColor: theme === 'dark' ? '#222936' : '#F6F5F1',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: theme === 'dark' ? '#E8EBF1' : '#1B1D22' }}>
        {text}
        {selected ? '  ✓' : ''}
      </Text>
    </Pressable>
  );
}
export function InputSheet({ visible, onClose, theme, devices, onError }: Props) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} theme={theme} title={t('common.coach.input')}>
      {devices?.inputs.map((d) => (
        <Choice
          key={d.key}
          text={d.productName + (d.callQuality ? ` · ${t('common.coach.callQuality')}` : '')}
          selected={devices.activeInput?.key === d.key}
          theme={theme}
          onPress={() => {
            void VcAudio.setInputPreference(
              d.type === 'builtin' ? { mode: 'builtin' } : { mode: 'device', key: d.key },
            ).catch(onError);
          }}
        />
      ))}
    </Sheet>
  );
}
export function OutputSheet({ visible, onClose, theme, devices, onError }: Props) {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0);
  const [width, setWidth] = useState(1);
  const slide = (x: number) => {
    const v = Math.max(0, Math.min(1, x / width));
    setVolume(v);
    void VcAudio.setMediaVolume(v).catch(onError);
  };
  useEffect(() => {
    if (visible) void VcAudio.getMediaVolume().then(setVolume).catch(onError);
  }, [visible, onError]);
  return (
    <Sheet visible={visible} onClose={onClose} theme={theme} title={t('common.coach.output')}>
      <Choice
        theme={theme}
        text={t('common.coach.system')}
        selected={devices?.outputPreference.mode === 'system'}
        onPress={() => {
          void VcAudio.setOutputPreference({ mode: 'system' }).catch(onError);
        }}
      />
      {devices?.outputs.map((d) => (
        <Choice
          key={d.key}
          text={d.productName}
          theme={theme}
          selected={devices.outputPreference.mode === 'device' && devices.outputPreference.key === d.key}
          onPress={() => {
            void VcAudio.setOutputPreference({ mode: 'device', key: d.key }).catch(onError);
          }}
        />
      ))}
      <Text style={{ color: theme === 'dark' ? '#E8EBF1' : '#1B1D22', marginVertical: 8 }}>
        {t('common.coach.volume')} · {Math.round(volume * 100)}%
      </Text>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => slide(e.nativeEvent.locationX)}
        onResponderMove={(e) => slide(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        accessibilityLabel={t('common.coach.volume')}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}
        style={{ height: 36, justifyContent: 'center' }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: '#6B7486' }}>
          <View style={{ width: `${volume * 100}%`, height: 4, backgroundColor: '#5EEAD4' }} />
          <View
            style={{
              position: 'absolute',
              left: `${volume * 100}%`,
              top: -7,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#E8EBF1',
              marginLeft: -9,
            }}
          />
        </View>
      </View>
      <Choice
        theme={theme}
        text={t('common.coach.tone')}
        selected={false}
        onPress={() => {
          void VcAudio.playTestTone().catch(onError);
        }}
      />
      {devices?.activeOutput?.type === 'bluetooth' && (
        <Calibration deviceKey={devices.activeOutput.key} theme={theme} onError={onError} />
      )}
    </Sheet>
  );
}
