import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, ToastAndroid, View } from 'react-native';
import { inputChipText, samePref, type InputPref } from '../core';
import { useT } from '../i18n';
import { chooseInput, useInputs } from '../state/inputs';
import { useRecorder } from '../state/recorder';
import { useSettings } from '../state/settings';
import { BigButton, useRouteNames, useRouteText } from './components';
import { colors, s } from './theme';

/** Chip text: the actual route while recording, else what the preference resolves to right now. */
export function useInputChipText(): string {
  const t = useT();
  const names = useRouteNames();
  const pref = useSettings((x) => x.inputPref);
  const selected = useInputs((x) => x.selected);
  const route = useRecorder((r) => (r.recording ? r.route : null));
  return inputChipText({
    pref,
    selected,
    recordingRoute: route,
    names,
    labels: { auto: t('inputAutoWord'), notConnected: (n) => t('inputNotConnected').replace('{name}', n) },
  });
}

/** Auto, Phone microphone, then each connected headset. Disabled during a session (the input is locked per recording). */
export function InputOptions({ onChosen }: { onChosen?: () => void }) {
  const t = useT();
  const locked = useRecorder((r) => r.recording);
  const routeText = useRouteText();
  const pref = useSettings((x) => x.inputPref);
  const inputs = useInputs((x) => x.inputs);
  const pick = (p: InputPref) => {
    chooseInput(p).then(
      () => onChosen?.(),
      (e: Error) => Alert.alert(t('error'), e.message),
    );
  };
  const options: { label: string; pref: InputPref }[] = [
    { label: t('inputOptAuto'), pref: { mode: 'auto' } },
    { label: t('inputOptPhone'), pref: { mode: 'phone' } },
    ...inputs
      .filter((i) => i.type !== 'builtin_mic')
      .map((i) => ({
        label: routeText(i),
        pref: { mode: 'device', type: i.type, productName: i.productName, ...(i.addressHash ? { addressHash: i.addressHash } : {}) } as InputPref,
      })),
  ];
  return (
    <View>
      {locked && <Text style={[s.small, { marginBottom: 4 }]}>{`${t('inputLocked')} · ${t('inputLockedNote')}`}</Text>}
      {options.map((o) => {
        const on = samePref(pref, o.pref);
        return (
          <BigButton
            key={o.label}
            label={`${on ? '◉' : '○'} ${o.label}`}
            variant={on ? 'solid' : 'outline'}
            style={{ minHeight: 56 }}
            disabled={locked}
            onPress={() => pick(o.pref)}
          />
        );
      })}
    </View>
  );
}

/** Large tappable chip that always shows the input in use, with a picker. */
export function InputChip() {
  const t = useT();
  const text = useInputChipText();
  const locked = useRecorder((r) => r.recording);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 8 }}>
      <Text style={s.small}>{t('inputWillUse')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('chooseInput')}: ${text}`}
        onPress={() => (locked ? Alert.alert(t('inputLocked'), t('inputLockedNote')) : setOpen(true))}
        style={{ minHeight: 64, borderWidth: 2, borderColor: colors.primary, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.surface }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{locked ? `🔒 ${text}` : text}</Text>
      </Pressable>
      {locked && <Text style={[s.small, { marginTop: 4 }]}>{t('inputLocked')}</Text>}
      <Text style={[s.small, { marginTop: 4 }]}>{t('inputBtNote')}</Text>
      <RouteNotice />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 16 }}>
            <Text style={s.h1}>{t('chooseInput')}</Text>
            <InputOptions onChosen={() => setOpen(false)} />
            <BigButton label={t('cancel')} variant="outline" style={{ minHeight: 52 }} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Toast plus a line when the input switched live during a recording. */
export function RouteNotice() {
  const t = useT();
  const routeText = useRouteText();
  const notice = useRecorder((r) => r.routeNotice);
  const recording = useRecorder((r) => r.recording);
  const text = notice ? noticeText(t, notice.reason, routeText(notice.route)) : null;
  React.useEffect(() => {
    if (text && notice && Date.now() - notice.atMs < 3000) ToastAndroid.show(text, ToastAndroid.SHORT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.atMs]);
  if (!recording || !text) return null;
  return <Text style={[s.small, { marginTop: 4, fontWeight: '700' }]}>{text}</Text>;
}

import { switchNoticeKey, type RouteReason } from '../core';
function noticeText(t: ReturnType<typeof useT>, reason: RouteReason, routeName: string): string {
  return t(switchNoticeKey(reason)).replace('{name}', routeName.replace(/^\S+\s/, ''));
}
