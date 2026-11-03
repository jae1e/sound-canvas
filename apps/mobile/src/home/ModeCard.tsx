import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, shared, space } from '../theme';

/** A large tappable card for one app mode. */
export function ModeCard({ title, description, onPress, testID }: { title: string; description: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.title}>{title}</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
});
