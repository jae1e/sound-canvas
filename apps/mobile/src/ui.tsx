import { useRef } from 'react';
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
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: active ? '#ffffff40' : '#2a5db024' }}
      style={({ pressed }) => [styles.btn, active && styles.btnActive, disabled && styles.btnDisabled, pressed && !disabled && { backgroundColor: active ? '#214b8d' : '#e8eef8', transform: [{ scale: 0.97 }] }]}
    >
      <Text style={[styles.btnText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Minimal 0-100 slider (no extra native dependency). Calls onChange while dragging and on release. */
export function PercentSlider({ value, onChange }: { value: number; onChange: (percent: number) => void }) {
  const width = useRef(1);
  const at = (x: number) => Math.max(0, Math.min(100, Math.round((x / width.current) * 100)));
  return (
    <View
      style={styles.sliderTrack}
      onLayout={(e) => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => onChange(at(e.nativeEvent.locationX))}
      onResponderMove={(e) => onChange(at(e.nativeEvent.locationX))}
    >
      <View style={[styles.sliderFill, { width: `${value}%` }]} />
      <View style={[styles.sliderThumb, { left: `${value}%` }]} />
    </View>
  );
}

export const styles = StyleSheet.create({
  sliderTrack: { height: 36, flex: 1, minWidth: 160, justifyContent: 'center', backgroundColor: '#e3e8f0', borderRadius: 18, overflow: 'hidden' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#9db8e3' },
  sliderThumb: { position: 'absolute', top: 4, width: 8, height: 28, marginLeft: -4, borderRadius: 4, backgroundColor: '#2a5db0' },
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
