import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { bootstrap } from '../src/bootstrap';
import { useT } from '../src/i18n';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    bootstrap().then(
      (c) => {
        if (cancelled) c();
        else {
          cleanup = c;
          setReady(true);
        }
      },
      (e: Error) => setFailure(e.message),
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  if (failure) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, color: colors.danger }}>{failure}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="index" options={{ title: t('appName') }} />
        <Stack.Screen name="new" options={{ title: t('chooserTitle') }} />
        <Stack.Screen name="memo/[id]" options={{ title: t('appName') }} />
        <Stack.Screen name="settings" options={{ title: t('settings') }} />
      </Stack>
    </>
  );
}
