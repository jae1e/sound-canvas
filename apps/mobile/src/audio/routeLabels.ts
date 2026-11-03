import type { AudioDevice } from '../../modules/vlc-session-service';

export const PHONE_MIC_LABEL = 'Phone microphone';

export interface InputRoute {
  label: string;
  bluetooth: boolean;
}

const BLUETOOTH_TYPE = /bluetooth|^ble_/i;

export function isBluetoothDevice(d: AudioDevice | null | undefined): d is AudioDevice {
  return !!d && BLUETOOTH_TYPE.test(d.typeName);
}

/** Picks the input route from the candidate devices (first Bluetooth device wins; otherwise the phone microphone). */
export function describeInput(candidates: (AudioDevice | null | undefined)[]): InputRoute {
  const bt = candidates.find(isBluetoothDevice);
  if (!bt) return { label: PHONE_MIC_LABEL, bluetooth: false };
  return { label: bt.productName?.trim() || bt.typeName, bluetooth: true };
}

/** Formats a size in bytes as megabytes, for example "145 MB". */
export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
