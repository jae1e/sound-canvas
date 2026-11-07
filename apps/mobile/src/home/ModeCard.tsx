import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, shared, space } from '../theme';

/** A large tappable card for one app mode. */
export function ModeCard({
  title,
  description,
  onPress,
  testID,
  activeLabel,
  icon,
}: {
  title: string;
  description: string;
  onPress: () => void;
  testID?: string;
  /** Set while this mode owns the voice session (or has an unfinished session): shows a badge and a filled border. */
  activeLabel?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}${activeLabel ? `, ${activeLabel}` : ''}. ${description}`}
      accessibilityState={{ disabled: false }}
      android_ripple={{ color: `${colors.primary}20` }}
      style={({ pressed }) => [styles.card, activeLabel ? styles.cardActive : null, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
    >
      <View style={shared.row}>
        {icon ? <Ionicons name={icon} size={28} color={colors.primary} /> : null}
        <Text style={[styles.title, { flex: 1 }]}>{title}</Text>
        {activeLabel ? (
          <View style={styles.badge} testID={testID ? `${testID}-active` : undefined}>
            <Text style={styles.badgeText}>{activeLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text style={shared.muted}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 22,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  cardActive: { backgroundColor: colors.okBg, borderColor: colors.okText },
  badge: { backgroundColor: colors.okText, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
});
