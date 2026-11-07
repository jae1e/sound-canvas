import { Pressable, StyleSheet, Text } from 'react-native';

import { useTranslation } from '../i18n';
import { useModeSession } from '../session/instance';
import { colors, shared, space } from '../theme';

/** Shown at the top of Home while a Travel Guide or Voice Coach voice session is running. Renders nothing otherwise. */
export function ModeResumeCard({ onPress }: { onPress: (mode: 'travel' | 'coach') => void }) {
  const { t } = useTranslation();
  const s = useModeSession();
  if (!s.mode || s.status !== 'running') return null;
  const name = t(`common.mode.${s.mode}`);
  return (
    <Pressable onPress={() => onPress(s.mode!)} accessibilityRole="button" testID="resume-mode" android_ripple={{ color: '#ffffff40' }} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
      <Text style={styles.title}>{t('home.resumeMode.title', { mode: name })}</Text>
      <Text style={styles.line}>{s.holds.length > 0 ? t('session.micPaused') : t('session.listening')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primary, borderRadius: 14, padding: space.lg, gap: space.xs },
  title: { ...shared.h2, color: colors.onPrimary },
  line: { fontSize: 15, color: colors.onPrimary },
});
