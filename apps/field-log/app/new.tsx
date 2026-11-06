import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useT } from '../src/i18n';
import { createMemo } from '../src/memo/actions';
import { fastLocation } from '../src/memo/location';
import { newPhotoMemo } from '../src/memo/pickers';
import { useSettings } from '../src/state/settings';
import { BigButton } from '../src/ui/components';
import { colors, s } from '../src/ui/theme';

export default function NewMemo() {
  const t = useT();
  const router = useRouter();
  const enrolled = useSettings((st) => !!st.deviceId);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    const m = (e as Error).message;
    Alert.alert(
      t('error'),
      m === 'NOT_ENROLLED' ? t('enrolFirst') : m === 'CAMERA_DENIED' ? t('cameraDenied') : m,
    );
  };

  const photo = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const id = await newPhotoMemo(source);
      if (id) router.replace(`/memo/${id}`);
      else router.back();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const voice = async () => {
    setBusy(true);
    try {
      const id = await createMemo('voice', await fastLocation(400));
      router.replace({ pathname: '/memo/[id]', params: { id, autostart: '1' } });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.screen, s.pad]}>
      {!enrolled && <Text style={{ fontSize: 18, color: colors.danger, marginBottom: 8 }}>{t('enrolFirst')}</Text>}
      <BigButton label={t('takePhoto')} onPress={() => photo('camera')} disabled={busy || !enrolled} style={{ minHeight: 110 }} />
      <BigButton label={t('pickImage')} onPress={() => photo('library')} disabled={busy || !enrolled} style={{ minHeight: 110 }} />
      <BigButton label={t('voiceOnly')} onPress={voice} disabled={busy || !enrolled} style={{ minHeight: 110 }} />
      <BigButton label={t('cancel')} variant="outline" onPress={() => router.back()} disabled={busy} />
      {busy && <ActivityIndicator size="large" style={{ marginTop: 12 }} />}
    </View>
  );
}
