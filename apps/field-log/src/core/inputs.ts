import { routeIcon, routeLabel, type RouteLike, type RouteNames, type RouteTypeName } from './route';

const ROUTE_TYPES: string[] = ['builtin_mic', 'bluetooth_sco', 'ble_headset', 'wired_headset', 'usb', 'other'];

export type InputPref =
  | { mode: 'auto' }
  | { mode: 'phone' }
  | { mode: 'device'; type: RouteTypeName; productName: string; addressHash?: string };

export const AUTO_PREF: InputPref = { mode: 'auto' };

/** Parses the stored preference JSON. Anything invalid, or a legacy numeric input_id, becomes auto. */
export function parseInputPref(stored: string | null): InputPref {
  if (!stored) return AUTO_PREF;
  try {
    const v = JSON.parse(stored) as Record<string, unknown>;
    if (v.mode === 'phone') return { mode: 'phone' };
    if (v.mode === 'device' && typeof v.type === 'string' && ROUTE_TYPES.includes(v.type) && typeof v.productName === 'string') {
      return {
        mode: 'device',
        type: v.type as RouteTypeName,
        productName: v.productName,
        ...(typeof v.addressHash === 'string' ? { addressHash: v.addressHash } : {}),
      };
    }
  } catch {
    // fall through
  }
  return AUTO_PREF;
}

export function samePref(a: InputPref, b: InputPref): boolean {
  if (a.mode !== b.mode) return false;
  if (a.mode !== 'device' || b.mode !== 'device') return true;
  return a.type === b.type && a.productName === b.productName && (a.addressHash ?? '') === (b.addressHash ?? '');
}

export interface ChipLabels {
  auto: string;
  /** For a chosen headset that is not connected: "{name} is not connected, using the phone microphone". */
  notConnected: (productName: string) => string;
}

/**
 * Text of the input chip. While recording the actual route wins; idle shows what the preference
 * resolves to right now ("Auto · 🎧 Bluetooth headset: Buds" or "Auto · 🎙 Phone microphone").
 */
export function inputChipText(args: {
  pref: InputPref;
  selected: RouteLike | null;
  recordingRoute: RouteLike | null;
  names: RouteNames;
  labels: ChipLabels;
}): string {
  const { pref, selected, recordingRoute, names, labels } = args;
  const show = (r: RouteLike) => `${routeIcon(r.type)} ${routeLabel(r, names)}`;
  if (recordingRoute) return pref.mode === 'auto' ? `${labels.auto} · ${show(recordingRoute)}` : show(recordingRoute);
  const target = selected ?? { type: 'builtin_mic' };
  if (pref.mode === 'auto') return `${labels.auto} · ${show(target)}`;
  if (pref.mode === 'device' && (!selected || selected.type === 'builtin_mic')) {
    return `🎙 ${labels.notConnected(pref.productName)}`;
  }
  return show(target);
}

/** Live draft language: automatic when the user speaks several languages, else that language. */
export function liveLanguageFor(languages: string[]): string {
  return languages.length > 1 ? 'auto' : (languages[0] ?? 'auto');
}

export type RouteReason = 'device_connected' | 'device_disconnected' | 'user' | 'system';

export type SwitchNoticeKey = 'switchConnected' | 'switchDisconnected' | 'switchUser' | 'switchSystem';

/** Which short message to show when the capture moved to another input during a recording. */
export function switchNoticeKey(reason: RouteReason | undefined): SwitchNoticeKey {
  switch (reason) {
    case 'device_connected':
      return 'switchConnected';
    case 'device_disconnected':
      return 'switchDisconnected';
    case 'user':
      return 'switchUser';
    default:
      return 'switchSystem';
  }
}
