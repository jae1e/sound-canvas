import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shared, space } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[shared.card, style]}>{children}</View>;
}

type ButtonKind = 'primary' | 'secondary' | 'danger';

/** A large, thumb-friendly button. `big` is for the in-session controls. */
export function Button({
  label,
  onPress,
  kind = 'secondary',
  disabled,
  big,
  active,
  testID,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  big?: boolean;
  active?: boolean;
  testID?: string;
}) {
  const filled = kind === 'primary' || kind === 'danger' || active;
  const tint = kind === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        big && styles.big,
        { borderColor: tint, backgroundColor: filled ? tint : colors.card },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.buttonText, big && styles.bigText, { color: filled ? colors.onPrimary : tint }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ text, kind = 'ok' }: { text: string; kind?: 'ok' | 'warn' }) {
  return (
    <View style={[styles.banner, kind === 'warn' ? { backgroundColor: colors.warnBg } : { backgroundColor: colors.okBg }]}>
      <Text style={{ color: kind === 'warn' ? colors.warnText : colors.okText, fontSize: 15, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1.5, borderRadius: 10, paddingVertical: space.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  big: { paddingVertical: 20, minWidth: 140, flexGrow: 1 },
  bigText: { fontSize: 20 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.card },
  banner: { borderRadius: 8, padding: space.md },
});
