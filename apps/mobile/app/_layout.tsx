import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useDatabaseMigrations } from '../src/db/client';
import { useTranslation } from '../src/i18n';
import { configureLlm } from '../src/llm/setup';
import { useSettings } from '../src/settings/store';
import { colors, shared } from '../src/theme';
import { restoreWorkSession } from '../src/work/bootstrap';

export default function RootLayout() {
  const { t } = useTranslation();
  const { success, error } = useDatabaseMigrations();
  const loaded = useSettings((s) => s.loaded);

  useEffect(() => {
    if (!success) return;
    useSettings.getState().load();
    configureLlm();
    restoreWorkSession();
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
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ title: 'Voice Life Companion' }} />
        <Stack.Screen name="work/index" options={{ title: t('common.mode.work') }} />
        <Stack.Screen name="work/routine" options={{ title: t('routine.entry.title') }} />
        <Stack.Screen name="travel/index" options={{ title: t('common.mode.travel') }} />
        <Stack.Screen name="voice-coach/index" options={{ title: t('common.mode.coach') }} />
        <Stack.Screen name="journal/index" options={{ title: t('common.journal') }} />
        <Stack.Screen name="journal/[id]" options={{ title: t('common.journal') }} />
        <Stack.Screen name="settings/index" options={{ title: t('common.settings') }} />
        <Stack.Screen name="settings/diagnostics" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
