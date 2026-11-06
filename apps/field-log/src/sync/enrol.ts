import Constants from 'expo-constants';
import { Platform } from 'react-native';
import FlNative from '../native';
import { saveEnrolment, useSettings } from '../state/settings';
import { apiEnrol } from './api';
import { triggerSync } from './engine';

export async function enrol(pairingCode: string): Promise<void> {
  const s = useSettings.getState();
  if (s.deviceId) throw new Error('This phone is already enrolled');
  const caps = await FlNative.getCapabilities();
  const res = await apiEnrol(
    { baseUrl: s.serverUrl },
    {
      pairing_code: pairingCode.trim().toUpperCase(),
      device: {
        model: caps.model,
        manufacturer: caps.manufacturer,
        os_version: `Android ${String(Platform.Version)}`,
        app_version: Constants.expoConfig?.version ?? '0.0.0',
        install_id: s.installId,
      },
    },
  );
  await saveEnrolment(res.device_id, res.token);
  triggerSync();
}
