import React from 'react';
import { Text, View } from 'react-native';
import { useT } from '../i18n';
import { useRecorder } from '../state/recorder';
import { BigButton } from './components';
import { colors } from './theme';

/** Shown after the app came back from a stop caused by leaving the app. */
export function LeftAppNotice() {
  const t = useT();
  const notice = useRecorder((r) => r.leftAppNotice);
  if (!notice) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: '#FFB300', borderRadius: 12, padding: 14, marginVertical: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{`△ ${t('leftAppNotice')}`}</Text>
      <BigButton label={t('dismiss')} variant="outline" style={{ minHeight: 48 }} onPress={() => useRecorder.setState({ leftAppNotice: null })} />
    </View>
  );
}
