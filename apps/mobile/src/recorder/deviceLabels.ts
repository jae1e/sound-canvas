import type { AudioDevice } from '../../modules/vc-audio/src/VcAudio.types';

export function deviceLabel(
  device: AudioDevice | null | undefined,
  direction: 'input' | 'output',
  t: (key: string) => string,
  secondaryBuiltin = false,
): string {
  if (!device) return '—';
  if (direction === 'input' && device.type === 'other') return t('common.coach.otherInput');
  if (direction === 'input' && device.type === 'builtin' && secondaryBuiltin)
    return t('common.coach.secondaryMic');
  if (device.type === 'builtin' || device.type === 'speaker') {
    return t(direction === 'input' ? 'common.coach.phoneMic' : 'common.coach.phoneSpeaker');
  }
  return device.productName;
}

export function uniqueDevices(devices: AudioDevice[]): AudioDevice[] {
  return [...new Map(devices.map((device) => [device.key, device])).values()];
}

export function rmsLevel(db: number): number {
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

/** Android's contract reports the earpiece as "other"; match the built-in speaker's product name when present. */
export function outputDevices(devices: AudioDevice[]): AudioDevice[] {
  const unique = uniqueDevices(devices);
  const speaker = unique.find((device) => device.type === 'speaker');
  if (!speaker) return unique;
  return unique.filter((device) => !(device.type === 'other' && device.productName === speaker.productName));
}

export function outputLabel(
  device: AudioDevice | null | undefined,
  outputs: AudioDevice[],
  t: (key: string) => string,
): string {
  const speaker = outputs.find((item) => item.type === 'speaker');
  if (device?.type === 'other' && speaker && speaker.productName === device.productName)
    return t('common.coach.phoneSpeaker');
  return deviceLabel(device, 'output', t);
}
