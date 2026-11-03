import { Pressable, StyleSheet, Text } from 'react-native';

import { useTranslation } from '../i18n';
import { colors, shared, space } from '../theme';
import { useWorkSummary } from '../work/summary';

/** Shown at the top of Home while a Work Partner session exists. Renders nothing otherwise. */
export function ResumeCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const s = useWorkSummary();
  if (!s.active) return null;
  const stepLine =
    s.stepTotal > 0 ? t('home.resume.step', { index: s.stepIndex, total: s.stepTotal, label: s.stepLabel ?? '' }) : t('home.resume.noStep');
  const state = [
    s.status === 'paused' ? t('home.resume.paused') : null,
    s.listening ? t('home.resume.listening') : t('home.resume.notListening'),
    s.timersRunning > 0 ? t('home.resume.timers', { count: s.timersRunning }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <Text style={styles.title}>{t('home.resume.title')}</Text>
      <Text style={styles.line}>{stepLine}</Text>
      <Text style={styles.line}>{state}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primary, borderRadius: 14, padding: space.lg, gap: space.xs },
  title: { ...shared.h2, color: colors.onPrimary },
  line: { fontSize: 15, color: colors.onPrimary },
});
