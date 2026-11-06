export type RouteTypeName = 'builtin_mic' | 'bluetooth_sco' | 'ble_headset' | 'wired_headset' | 'usb' | 'other';

export interface RouteLike {
  type: string;
  productName?: string;
}

export type RouteNames = Record<RouteTypeName, string>;

export function routeIcon(type: string): string {
  return type === 'builtin_mic' ? '🎙' : type === 'other' ? '🎤' : '🎧';
}

/** 'phone' for the built-in microphone, 'headset' for any external input, 'other' otherwise. */
export function routeKind(type: string): 'phone' | 'headset' | 'other' {
  if (type === 'builtin_mic') return 'phone';
  if (['bluetooth_sco', 'ble_headset', 'wired_headset', 'usb'].includes(type)) return 'headset';
  return 'other';
}

/** "Phone microphone (SM-S931N)" for the built-in mic, "Bluetooth headset: Buds" for others. Icon excluded. */
export function routeLabel(route: RouteLike, names: RouteNames): string {
  const name = names[route.type as RouteTypeName] ?? names.other;
  if (!route.productName) return name;
  return route.type === 'builtin_mic' ? `${name} (${route.productName})` : `${name}: ${route.productName}`;
}

/** A segment peak at or below -90 dBFS means no audio was captured (digital zero). */
export const SILENT_PEAK_X100 = -9000;
export const isSilentPeak = (peakDbfsX100: number): boolean => peakDbfsX100 <= SILENT_PEAK_X100;
