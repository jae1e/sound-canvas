import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';

import { useDatabaseMigrations } from '../src/db/client';
import { useTranslation } from '../src/i18n';
import { configureLlm } from '../src/llm/setup';
import { useSettings } from '../src/settings/store';
import { colors, shared } from '../src/theme';
import { restoreWorkSession } from '../src/work/bootstrap';
import { startUpdater } from '../src/update/updater';
import { reconcileTakes } from '../src/recorder/reconcile';
import VcAudio from '../modules/vc-audio/src/VcAudioModule';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const { t } = useTranslation();
  const { success, error } = useDatabaseMigrations();
  const [recoveryError, setRecoveryError] = useState(false);
  const loaded = useSettings((s) => s.loaded);
  const showHiddenModes = useSettings((s) => s.settings.showHiddenModes);

  useEffect(() => {
    if (!success) return;
    useSettings.getState().load();
    configureLlm();
    restoreWorkSession(useSettings.getState().settings.showHiddenModes);
    return startUpdater();
  }, [success]);

  useEffect(() => {
    if (!success) return;
    const reconcile = () => {
      void reconcileTakes().then(
        () => setRecoveryError(false),
        () => setRecoveryError(true),
      );
    };
    reconcile();
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconcile();
    });
    const stopped = VcAudio.addListener('onTakeStopped', reconcile);
    return () => {
      state.remove();
      stopped.remove();
    };
  }, [success]);

  if (error) {
    return (
      <View style={[shared.screen, { justifyContent: 'center', padding: 24 }]}>
        <Text style={shared.h2}>Database error</Text>
        <Text style={shared.muted}>{error.message}</Text>
      </View>
    );
  }
  if (!success || !loaded) {
    return (
      <View style={[shared.screen, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {recoveryError ? (
        <Text accessibilityRole="alert" style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: 12 }}>
          {t('common.takes.recoveryError')}
        </Text>
      ) : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {showHiddenModes ? (
          <Stack.Screen name="work/index" options={{ title: t('common.mode.work') }} />
        ) : null}
        {showHiddenModes ? (
          <Stack.Screen name="work/routine" options={{ title: t('routine.entry.title') }} />
        ) : null}
        {showHiddenModes ? (
          <Stack.Screen name="travel/index" options={{ title: t('common.mode.travel') }} />
        ) : null}
        <Stack.Screen name="voice-coach/index" options={{ title: t('common.mode.coach') }} />
        <Stack.Screen name="journal/index" options={{ title: t('common.journal') }} />
        <Stack.Screen name="journal/[id]" options={{ title: t('common.journal') }} />
        <Stack.Screen name="settings/index" options={{ title: t('common.settings') }} />
        <Stack.Screen name="settings/diagnostics" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
