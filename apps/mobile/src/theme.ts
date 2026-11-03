import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#f6f6f4',
  card: '#ffffff',
  text: '#1b1d21',
  muted: '#5d6470',
  border: '#d9dce1',
  primary: '#2a5db0',
  onPrimary: '#ffffff',
  danger: '#b3261e',
  warnBg: '#fde3d0',
  warnText: '#a83a0c',
  okBg: '#e6f2e6',
  okText: '#1d5b1d',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: space.lg, gap: space.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16, color: colors.text, backgroundColor: colors.card },
});
