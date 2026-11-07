import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Button({ label, onPress, disabled, active, danger }: { label: string; onPress: () => void; disabled?: boolean; active?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} android_ripple={{ color: active || danger ? '#ffffff40' : '#14202a24' }} style={({ pressed }) => [s.btn, active && s.btnActive, danger && s.btnDanger, disabled && s.btnDisabled, pressed && !disabled && { backgroundColor: active ? '#1558bd' : danger ? '#9e2f24' : '#d5e1eb', transform: [{ scale: 0.97 }] }]}>
      <Text style={[s.btnText, (active || danger) && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput {...props} style={[s.input, props.style]} placeholderTextColor="#8a949c" />
    </View>
  );
}

export const Row = ({ children }: { children: React.ReactNode }) => <View style={s.row}>{children}</View>;

export const colors = { a: '#4aa3ff', b: '#ffb84a', ok: '#2ecc71', warn: '#e67e22', bad: '#e74c3c' };

export const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#14202a' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  label: { fontSize: 12, color: '#52606b', marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#c9d1d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, color: '#14202a' },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e8eef3', minHeight: 44, justifyContent: 'center' },
  btnActive: { backgroundColor: '#1f6feb' },
  btnDanger: { backgroundColor: '#c0392b' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#14202a' },
  body: { fontSize: 15, color: '#14202a' },
  muted: { fontSize: 12, color: '#6b7782' },
});
