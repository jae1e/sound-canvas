import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { downloadPercent, formatMb, versionLabel } from '../core';
import { useT } from '../i18n';
import { cancelUpdate, checkForUpdate, startUpdate, useUpdater } from '../update/updater';
import { BigButton } from './components';
import { colors, s } from './theme';

export function useUpdateAvailable(): boolean {
  return useUpdater((u) => (['available', 'needsPermission', 'downloading', 'installing'] as string[]).includes(u.phase) || (u.phase === 'error' && !!u.build?.newer));
}

/** Small banner on Home; tapping it opens Settings. */
export function UpdateBanner({ onPress }: { onPress: () => void }) {
  const t = useT();
  const show = useUpdateAvailable();
  if (!show) return null;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: colors.primary, borderRadius: 10, padding: 10, marginVertical: 6 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{`⬆ ${t('updateAvailable')}  ›`}</Text>
    </Pressable>
  );
}

export function UpdateSection() {
  const t = useT();
  const u = useUpdater();
  const b = u.build;
  const current = u.versionCode ? versionLabel(u.versionName, u.versionCode, u.gitSha) : '…';
  const busy = u.phase === 'checking' || u.phase === 'downloading' || u.phase === 'installing';
  const errorText = u.error === 'RECORDING' ? t('updateRecording') : u.error;
  const pct = downloadPercent(u.bytes, u.totalBytes);
  return (
    <View>
      <Text style={s.h2}>{t('appUpdate')}</Text>
      <View style={s.card}>
        <Text style={s.small}>{t('currentVersion')}</Text>
        <Text style={s.body}>{current}</Text>
        {u.phase === 'upToDate' && <Text style={[s.body, { marginTop: 8 }]}>{`✓ ${t('upToDate')}`}</Text>}
        {b?.newer && u.phase !== 'upToDate' && (
          <Text style={[s.body, { marginTop: 8 }]}>
            {`${t('newBuild')}: ${versionLabel(b.version_name, b.version_code, b.git_sha)}, ${formatMb(b.bytes)} MB${b.notes ? ` — ${b.notes}` : ''}`}
          </Text>
        )}
        {u.phase === 'needsPermission' && <Text style={[s.body, { marginTop: 8 }]}>{t('installPermission')}</Text>}
        {u.phase === 'downloading' && (
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.primary }} />
            </View>
            <Text style={s.small}>{`${formatMb(u.bytes)} / ${formatMb(u.totalBytes)} MB · ${pct}% · ${formatMb(u.speedBps)} MB/s`}</Text>
          </View>
        )}
        {u.phase === 'installing' && <Text style={[s.body, { marginTop: 8 }]}>{t('installing')}</Text>}
        {u.phase === 'error' && errorText ? <Text style={{ color: colors.danger, fontSize: 16, marginTop: 8 }}>{`${t('error')}: ${errorText}`}</Text> : null}
      </View>

      {u.phase === 'downloading' && <BigButton label={t('cancel')} variant="outline" onPress={() => void cancelUpdate()} />}
      {(u.phase === 'available' || u.phase === 'needsPermission') && (
        <BigButton label={u.phase === 'needsPermission' ? t('openSettings') : t('updateNow')} onPress={() => void startUpdate().catch((e: Error) => Alert.alert(t('error'), e.message))} />
      )}
      {u.phase === 'error' && b?.newer && <BigButton label={t('tryAgain')} onPress={() => void startUpdate().catch((e: Error) => Alert.alert(t('error'), e.message))} />}
      <BigButton label={u.phase === 'checking' ? t('checking') : t('checkUpdates')} variant="outline" disabled={busy} onPress={() => void checkForUpdate(false)} />
    </View>
  );
}
