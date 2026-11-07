import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { useTranslation } from '../i18n';
import { calibrationMedian } from './derive';
const KEY = 'vc.outputLatencies';
export function Calibration({
  deviceKey,
  theme,
  onError,
  onSaved,
}: {
  deviceKey: string;
  theme: 'dark' | 'light';
  onError: () => void;
  onSaved?: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const clicks = useRef<number[] | null>(null);
  const taps = useRef<number[]>([]);
  const activeRef = useRef(false);
  useEffect(() => {
    let live = true;
    setSaved(null);
    void SecureStore.getItemAsync(KEY)
      .then((s) => {
        if (live && s) {
          const n = JSON.parse(s)[deviceKey];
          if (typeof n === 'number') {
            setSaved(n);
            onSaved?.(n);
          }
        }
      })
      .catch(onError);
    return () => {
      live = false;
      activeRef.current = false;
    };
  }, [deviceKey, onError, onSaved]);
  const finish = async () => {
    if (!activeRef.current || !clicks.current || taps.current.length < 8) return;
    activeRef.current = false;
    setActive(false);
    const value = calibrationMedian(taps.current.map((tap, i) => tap - clicks.current![i]));
    if (value === null || value < 0 || value > 2000) {
      onError();
      return;
    }
    try {
      const rounded = Math.round(value);
      await VcAudio.setOutputLatency(deviceKey, rounded);
      const stored = JSON.parse((await SecureStore.getItemAsync(KEY)) ?? '{}');
      stored[deviceKey] = rounded;
      await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
      setSaved(rounded);
      onSaved?.(rounded);
    } catch {
      onError();
    }
  };
  const start = async () => {
    setCount(0);
    clicks.current = null;
    taps.current = [];
    activeRef.current = true;
    setActive(true);
    try {
      clicks.current = await VcAudio.playCalibrationClicks(8);
      await finish();
    } catch {
      activeRef.current = false;
      setActive(false);
      onError();
    }
  };
  return (
    <Pressable
      onPress={() => {
        if (!active) void start();
        else {
          taps.current.push(VcAudio.nowMs());
          setCount(taps.current.length);
          void finish();
        }
      }}
      style={({ pressed }) => ({
        padding: 14,
        marginTop: 0,
        borderRadius: 12,
        backgroundColor: theme === 'dark' ? '#222936' : '#F6F5F1',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ textAlign: 'center', color: theme === 'dark' ? '#E8EBF1' : '#1B1D22' }}>
        {active
          ? `${t('common.coach.tapClicks')} ${count}/8`
          : saved === null
            ? t('common.coach.calibrate')
            : t('common.coach.recalibrate')}
      </Text>
    </Pressable>
  );
}
