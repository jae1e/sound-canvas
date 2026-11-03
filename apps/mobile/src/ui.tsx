import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Btn({ label, onPress, disabled, active, testID }: { label: string; onPress: () => void; disabled?: boolean; active?: boolean; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={testID}
      style={[styles.btn, active && styles.btnActive, disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f6f4' },
  content: { padding: 14, paddingTop: 48, paddingBottom: 80, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 10, gap: 6 },
  sectionTitle: { fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btn: { borderWidth: 1, borderColor: '#2a5db0', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  btnActive: { backgroundColor: '#2a5db0' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#2a5db0' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  small: { fontSize: 11, color: '#555' },
  partial: { fontSize: 16, color: '#888', minHeight: 22 },
  transcript: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', paddingTop: 4 },
  transcriptText: { fontSize: 16 },
  banner: { borderRadius: 6, padding: 8, backgroundColor: '#e6f2e6', gap: 2 },
  bannerWarn: { backgroundColor: '#fde3d0', borderWidth: 1, borderColor: '#d9541e' },
  bannerText: { fontSize: 16, fontWeight: '700', color: '#1d5b1d' },
  bannerWarnText: { fontSize: 14, fontWeight: '700', color: '#a83a0c' },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 56 },
});
