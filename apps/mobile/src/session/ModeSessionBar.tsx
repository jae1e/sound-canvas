import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button } from '../components/ui';
import { useTranslation } from '../i18n';
import { colors, shared, space } from '../theme';
import { endModeSession, startModeSession, useActiveMode, useModeSession } from './instance';
import type { ManagedMode, ModeKey } from './modeSession';

const ROUTE: Record<ModeKey, '/work' | '/travel' | '/voice-coach'> = { work: '/work', travel: '/travel', coach: '/voice-coach' };

/**
 * Start/end control for the native voice session of Travel Guide or Voice Coach, shown above the mode screen. Starting is
 * always an explicit tap. Only one mode can own the session: while another mode is active this shows how to get back to it.
 */
export function ModeSessionBar({ mode }: { mode: ManagedMode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const state = useModeSession();
  const active = useActiveMode();
  const [error, setError] = useState<string | null>(null);
  const mine = state.mode === mode;
  const blocker = active && active !== mode ? active : null;

  const start = async () => {
    setError(null);
    const r = await startModeSession(mode);
    if (!r.ok && r.reason === 'native_failed') setError(r.message);
  };

  if (blocker) {
    return (
      <View style={styles.bar}>
        <Banner kind="warn" text={t('session.blocked', { mode: t(`common.mode.${blocker}`) })} />
        <Button label={t('session.open', { mode: t(`common.mode.${blocker}`) })} onPress={() => router.push(ROUTE[blocker])} />
      </View>
    );
  }
  if (mine && state.status === 'running') {
    return (
      <View style={styles.bar}>
        <View style={shared.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.status}>{t('session.running')}</Text>
            <Text style={shared.muted}>{state.holds.length > 0 ? t('session.micPaused') : t('session.listening')}</Text>
          </View>
          <Button label={t('session.end')} kind="danger" onPress={() => void endModeSession()} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      <Button label={mine && state.status === 'starting' ? t('session.starting') : t('session.start')} kind="primary" disabled={state.status === 'starting'} onPress={() => void start()} />
      <Text style={shared.muted}>{t(`session.hint.${mode}`)}</Text>
      {error ?? state.error ? <Banner kind="warn" text={`${t('session.error')}: ${error ?? state.error}`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { padding: space.md, gap: space.sm, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  status: { fontSize: 16, fontWeight: '700', color: colors.text },
});
