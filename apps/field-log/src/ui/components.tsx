import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatElapsed } from './format';
import { useRecorder } from '../state/recorder';
import { useSyncStatus } from '../state/syncStatus';
import { type MemoStatus, type ProgressStep, type StatusKind, routeIcon, routeKind, routeLabel, type RouteNames } from '../core';
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

const TONE_STYLE = {
  red: { bg: '#FDECEA', fg: '#B00020', border: '#B00020' },
  amber: { bg: '#FFF3CD', fg: '#7A5200', border: '#B27B00' },
  blue: { bg: '#E8F0FE', fg: '#0B3D91', border: '#0B3D91' },
  green: { bg: '#E6F4EA', fg: '#0B6B2E', border: '#0B6B2E' },
  muted: { bg: '#F1F3F5', fg: '#4A5260', border: '#8A93A0' },
} as const;

const STATUS_KEY: Record<StatusKind, Key> = {
  recording: 'statusRecording',
  paused: 'statusPaused',
  deleted: 'statusSaved',
  uploadWaiting: 'statusUploadWaiting',
  uploading: 'statusUploading',
  transcribing: 'statusTranscribing',
  failed: 'statusFailed',
  noSpeech: 'statusNoSpeech',
  done: 'statusDone',
  saved: 'statusSaved',
};

/** The one status of a memo: glyph, text and colour (never colour alone). */
export function StatusPill({ status }: { status: MemoStatus }) {
  const t = useT();
  const c = TONE_STYLE[status.tone];
  let text = `${status.glyph} ${t(STATUS_KEY[status.kind])}`;
  if (status.kind === 'recording') text += ` ${formatElapsed(status.recordedMs)}`;
  if ((status.kind === 'uploading' || status.kind === 'uploadWaiting') && status.total > 0) text += ` (${status.uploaded}/${status.total})`;
  return (
    <View accessible accessibilityLabel={text} style={{ alignSelf: 'flex-start', borderWidth: 2, borderColor: c.border, backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.fg }}>{text}</Text>
    </View>
  );
}

/** Detailed progress: Recorded / Saved on phone / Synced / Transcribed, current step in bold. */
export function ProgressLine({ steps }: { steps: ProgressStep[] }) {
  const t = useT();
  const label = (st: ProgressStep): string => {
    if (st.key === 'recorded') return st.inProgress ? t('stRecording') : t('stepRecorded');
    return t(({ saved: 'stepSaved', synced: 'stepSynced', transcribed: 'stepTranscribed' } as const)[st.key]);
  };
  return (
    <Text style={{ fontSize: 15, marginVertical: 6 }}>
      {steps.map((st, i) => (
        <Text key={st.key} style={{ color: st.done ? colors.text : colors.muted, fontWeight: st.current ? '700' : '400' }}>
          {`${i > 0 ? ' · ' : ''}${label(st)} ${st.done ? '✓' : '○'}`}
        </Text>
      ))}
    </Text>
  );
}

/** Live facts that come from the native recorder cache and the sync state, not from the database. */
export function useLiveFacts(memoId: string): { isRecording: boolean; paused: boolean; recordedMs: number; offline: boolean } {
  const isRecording = useRecorder((r) => r.recording && r.memoId === memoId);
  const paused = useRecorder((r) => r.paused);
  const recordedMs = useRecorder((r) => (r.recording && r.memoId === memoId ? r.recordedMs : 0));
  const offline = useSyncStatus((x) => x.connection === 'offline' || x.connection === 'error');
  return { isRecording, paused: isRecording && paused, recordedMs, offline };
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
