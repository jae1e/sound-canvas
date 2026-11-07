import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { AudioDevice, DevicesEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { useTranslation } from '../i18n';
import { Sheet } from './Sheet';
import { Calibration } from './Calibration';
import { deviceLabel, rmsLevel, uniqueDevices } from './deviceLabels';
type Props = {
  visible: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  devices: DevicesEvent | null;
  onError: () => void;
  rmsDb?: number;
};
function DeviceRow({
  name,
  subtitle,
  icon,
  selected,
  theme,
  warning,
  level,
  onPress,
}: {
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  theme: 'dark' | 'light';
  warning?: boolean;
  level?: number;
  onPress?: () => void;
}) {
  const dark = theme === 'dark';
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 68,
        padding: 12,
        marginBottom: 8,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: selected ? '#2DAE9E' : 'transparent',
        backgroundColor: selected ? (dark ? '#15312D' : '#EAF7F4') : dark ? '#202733' : '#F6F5F1',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? '#293241' : '#E9E8F8',
        }}
      >
        <Ionicons name={icon} size={18} color={selected ? '#5EEAD4' : '#8A93A5'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: dark ? '#E8EBF1' : '#1B1D22', fontWeight: '700', fontSize: 13 }}>{name}</Text>
        <Text style={{ color: warning ? '#FBBF24' : '#8A93A5', fontSize: 11, marginTop: 4 }}>{subtitle}</Text>
      </View>
      {level !== undefined && (
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 20 }}>
          {[0.4, 0.8, 1, 0.65].map((v, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: Math.max(3, 20 * level * v),
                backgroundColor: '#5EEAD4',
                borderRadius: 2,
              }}
            />
          ))}
        </View>
      )}
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: selected ? '#5EEAD4' : '#4A5366',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#5EEAD4' }} />}
      </View>
    </Pressable>
  );
}
function iconFor(device: AudioDevice): keyof typeof Ionicons.glyphMap {
  return device.type === 'usb'
    ? 'flash-outline'
    : device.type === 'bluetooth' || device.type === 'wired'
      ? 'headset-outline'
      : device.type === 'speaker'
        ? 'volume-high-outline'
        : 'phone-portrait-outline';
}
export function InputSheet({ visible, onClose, theme, devices, onError, rmsDb = -100 }: Props) {
  const { t } = useTranslation();
  const inputs = uniqueDevices(devices?.inputs ?? []);
  return (
    <Sheet visible={visible} onClose={onClose} theme={theme} title={t('common.coach.input')}>
      <Text style={{ color: '#8A93A5', fontSize: 12, marginBottom: 10 }}>
        {t('common.coach.inputSubtitle')}
      </Text>
      {inputs.map((device) => (
        <DeviceRow
          key={device.key}
          theme={theme}
          name={deviceLabel(device, 'input', t)}
          icon={iconFor(device)}
          subtitle={
            device.type === 'builtin'
              ? t('common.coach.inputBuiltin')
              : device.callQuality
                ? t('common.coach.inputBluetooth')
                : device.type === 'usb'
                  ? 'USB'
                  : device.productName
          }
          warning={device.callQuality}
          selected={devices?.activeInput?.key === device.key}
          level={devices?.activeInput?.key === device.key ? rmsLevel(rmsDb) : undefined}
          onPress={() => {
            void VcAudio.setInputPreference(
              device.type === 'builtin' ? { mode: 'builtin' } : { mode: 'device', key: device.key },
            ).catch(onError);
          }}
        />
      ))}
      {!inputs.some((d) => d.type === 'usb') && (
        <DeviceRow
          theme={theme}
          name={t('common.coach.usbMic')}
          icon="flash-outline"
          subtitle={t('common.coach.usbAbsent')}
          selected={false}
        />
      )}
      <Text style={{ color: '#8A93A5', fontSize: 12, marginTop: 4 }}>{t('common.coach.inputFooter')}</Text>
    </Sheet>
  );
}
export function OutputSheet({ visible, onClose, theme, devices, onError }: Props) {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0);
  const [width, setWidth] = useState(1);
  const [latency, setLatency] = useState<number | null>(null);
  const dark = theme === 'dark';
  const slide = (x: number) => {
    const v = Math.max(0, Math.min(1, x / width));
    setVolume(v);
    void VcAudio.setMediaVolume(v).catch(onError);
  };
  useEffect(() => {
    if (visible) void VcAudio.getMediaVolume().then(setVolume).catch(onError);
  }, [visible, onError]);
  useEffect(() => {
    setLatency(null);
  }, [devices?.activeOutput?.key]);
  return (
    <Sheet visible={visible} onClose={onClose} theme={theme} title={t('common.coach.output')}>
      <Text style={{ color: '#8A93A5', fontSize: 12, marginBottom: 10 }}>
        {t('common.coach.outputSubtitle')}
      </Text>
      <DeviceRow
        theme={theme}
        name={t('common.coach.system')}
        subtitle={t('common.coach.outputSystem', { name: deviceLabel(devices?.activeOutput, 'output', t) })}
        icon="settings-outline"
        selected={devices?.outputPreference.mode === 'system'}
        onPress={() => {
          void VcAudio.setOutputPreference({ mode: 'system' }).catch(onError);
        }}
      />
      {uniqueDevices(devices?.outputs ?? []).map((device) => (
        <DeviceRow
          key={device.key}
          theme={theme}
          name={deviceLabel(device, 'output', t)}
          icon={iconFor(device)}
          subtitle={
            device.type === 'bluetooth'
              ? latency !== null && devices?.activeOutput?.key === device.key
                ? t('common.coach.bluetoothCalibrated', { ms: latency })
                : t('common.coach.bluetooth')
              : device.type === 'speaker' || device.type === 'builtin'
                ? t('common.coach.outputSpeaker')
                : device.productName
          }
          selected={
            devices?.outputPreference.mode === 'device' && devices.outputPreference.key === device.key
          }
          onPress={() => {
            void VcAudio.setOutputPreference({ mode: 'device', key: device.key }).catch(onError);
          }}
        />
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: dark ? '#E8EBF1' : '#1B1D22', fontWeight: '700', fontSize: 12 }}>
          {t('common.coach.volumeLabel')}
        </Text>
        <Text style={{ color: '#8A93A5', fontSize: 12 }}>{t('common.coach.volume')}</Text>
      </View>
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => {
            void VcAudio.playTestTone().catch(onError);
          }}
          style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#222936', alignItems: 'center' }}
        >
          <Text style={{ color: dark ? '#E8EBF1' : '#1B1D22' }}>{t('common.coach.tone')}</Text>
        </Pressable>
        {devices?.activeOutput?.type === 'bluetooth' && (
          <View style={{ flex: 1 }}>
            <Calibration
              deviceKey={devices.activeOutput.key}
              theme={theme}
              onError={onError}
              onSaved={setLatency}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}
