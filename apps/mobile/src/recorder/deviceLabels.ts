import type { AudioDevice } from '../../modules/vc-audio/src/VcAudio.types';

export function deviceLabel(
  device: AudioDevice | null | undefined,
  direction: 'input' | 'output',
  t: (key: string) => string,
): string {
  if (!device) return '—';
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
