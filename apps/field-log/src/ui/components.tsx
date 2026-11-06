import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { deriveMemoState, routeIcon, routeKind, routeLabel, type RouteNames } from '../core';
import { useT, type Key } from '../i18n';
import { colors, s } from './theme';

export function BigButton(props: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { variant = 'solid' } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        s.bigButton,
        variant === 'outline' && s.outlineButton,
        variant === 'danger' && { backgroundColor: colors.danger },
        props.disabled && { opacity: 0.4 },
        props.style,
      ]}
    >
      <Text style={[s.bigButtonText, variant === 'outline' && s.outlineText]}>{props.label}</Text>
    </Pressable>
  );
}

/** Chip with a shape glyph and text, so state never depends on colour alone. */
export function Chip({ glyph, label, active }: { glyph: string; label: string; active: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${active ? 'yes' : 'no'}`}
      style={[s.chip, active && { backgroundColor: colors.text, borderColor: colors.text }]}
    >
      <Text style={[s.chipText, active && { color: colors.bg, fontWeight: '700' }]}>{`${glyph} ${label}`}</Text>
    </View>
  );
}

export function TrustChips(props: Parameters<typeof deriveMemoState>[0]) {
  const t = useT();
  const st = deriveMemoState(props);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <Chip glyph={st.recording ? '●' : '○'} label={t('stRecording')} active={st.recording} />
      <Chip glyph={st.savedOnPhone ? '■' : '□'} label={t('stSaved')} active={st.savedOnPhone} />
      <Chip glyph={st.synced ? '▲' : '△'} label={t('stSynced')} active={st.synced} />
      <Chip glyph={st.transcribed ? '◆' : '◇'} label={t('stTranscribed')} active={st.transcribed} />
      {st.failed && <Chip glyph="✕" label={t('stFailed')} active />}
    </View>
  );
}

export const labelKey = (k: string): Key | null =>
  ({ voice: 'kindVoice', photo: 'kindPhoto', image: 'kindImage' } as Record<string, Key>)[k] ?? null;

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginVertical: 4 }}>
      <Text style={s.small}>{label}</Text>
      <Text style={s.body}>{value}</Text>
    </View>
  );
}


export function useRouteNames(): RouteNames {
  const t = useT();
  return {
    builtin_mic: t('routeBuiltin'),
    bluetooth_sco: t('routeSco'),
    ble_headset: t('routeBle'),
    wired_headset: t('routeWired'),
    usb: t('routeUsb'),
    other: t('routeOther'),
  };
}

/** Full label with icon and text, e.g. "🎙 Phone microphone (SM-S931N)". */
export function useRouteText(): (r: { type: string; productName?: string }) => string {
  const names = useRouteNames();
  return (r) => `${routeIcon(r.type)} ${routeLabel(r, names)}`;
}

export function RouteBadge({ type }: { type: string | null }) {
  const t = useT();
  if (!type) return null;
  const kind = routeKind(type);
  const label = kind === 'phone' ? t('badgePhone') : kind === 'headset' ? t('badgeHeadset') : t('badgeOther');
  return <Chip glyph={kind === 'phone' ? '🎙' : '🎧'} label={label} active={false} />;
}
