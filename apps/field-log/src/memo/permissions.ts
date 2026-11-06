import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { kvGet, kvSet } from '../db/kv';
import type { InputPref } from '../core';

/**
 * Asks once for BLUETOOTH_CONNECT (needed to use a Bluetooth microphone) with a short rationale.
 * Denial is not an error: the app then records from the phone microphone.
 */
export async function ensureBluetoothPermission(
  pref: InputPref,
  rationale: { title: string; body: string; ok: string; later: string },
): Promise<void> {
  if (Platform.OS !== 'android' || pref.mode === 'phone') return;
  const perm = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (await PermissionsAndroid.check(perm)) return;
  if ((await kvGet('bt_permission_asked')) === '1') return;
  await kvSet('bt_permission_asked', '1');
  const go = await new Promise<boolean>((resolve) =>
    Alert.alert(rationale.title, rationale.body, [
      { text: rationale.later, style: 'cancel', onPress: () => resolve(false) },
      { text: rationale.ok, onPress: () => resolve(true) },
    ], { cancelable: false }),
  );
  if (go) await PermissionsAndroid.request(perm).catch(() => undefined);
}
