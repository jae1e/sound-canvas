import { create } from 'zustand';
import type { InputPref } from '../core';
import FlNative, { type InputDevice, type InputsEvent } from '../native';
import { tr } from '../i18n';
import { ensureBluetoothPermission } from '../memo/permissions';
import { updateSetting } from './settings';

export interface InputsState {
  inputs: InputDevice[];
  selected: InputDevice | null;
}

export const useInputs = create<InputsState>(() => ({ inputs: [], selected: null }));

export function applyInputs(e: InputsEvent): void {
  useInputs.setState({ inputs: e.inputs, selected: e.selected });
}

export async function refreshInputs(): Promise<void> {
  applyInputs(await FlNative.getInputs());
}

/** Saves the preference and pushes it to the native recorder (live switch when recording). */
export async function chooseInput(pref: InputPref): Promise<void> {
  await updateSetting('inputPref', pref);
  await ensureBluetoothPermission(pref, {
    title: tr('btRationaleTitle'),
    body: tr('btRationaleBody'),
    ok: tr('btAllow'),
    later: tr('btLater'),
  });
  applyInputs(await FlNative.setInputPreference(pref));
}
