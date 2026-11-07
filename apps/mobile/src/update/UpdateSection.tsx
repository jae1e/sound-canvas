import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button, Card } from '../components/ui';
import { useTranslation } from '../i18n';
import { colors, shared } from '../theme';
import { downloadPercent, formatMb } from './core';
import { cancelUpdate, checkForUpdate, startUpdate, useUpdater } from './updater';

export function UpdateBanner({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const build = useUpdater((state) => state.build);
  if (!build?.newer) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: `${colors.primary}24` }}
      style={({ pressed }) => (pressed ? { opacity: 0.7, transform: [{ scale: 0.97 }] } : null)}
    >
      <Text style={shared.body}>⬆ {t('common.update.available')}</Text>
    </Pressable>
  );
}

export function UpdateSettingsSection({ paired }: { paired: boolean }) {
  const { t } = useTranslation();
  const updater = useUpdater();
  const build = updater.build;
  const percent = downloadPercent(updater.bytes, updater.totalBytes);
  const error =
    updater.error === 'RECORDING'
      ? t('common.update.stopRecording')
      : updater.error === 'TIMEOUT'
        ? t('common.update.timeout')
        : updater.error === 'NETWORK'
          ? t('common.update.networkError')
          : updater.error === 'NO_BUILD'
            ? t('common.update.noBuild')
            : updater.error?.startsWith('HTTP ')
              ? t('common.update.httpError', { code: updater.error.slice(5) })
              : updater.error;
  const checkBusy = updater.phase === 'checking';
  const installBusy = ['preparing', 'downloading', 'installing'].includes(updater.phase);

  return (
    <View>
      <Text style={shared.h2}>{t('common.update.section')}</Text>
      <Card>
        <Text style={shared.body}>
          {t('common.update.current')}: {updater.versionName} ({updater.versionCode})
        </Text>
        {updater.phase === 'upToDate' ? (
          <Text
            style={shared.body}
          >{`✓ ${t('common.update.latestBuild', { version: updater.build?.version_code ?? updater.versionCode })}`}</Text>
        ) : null}
        {build?.newer ? (
          <View>
            <Text style={shared.body}>
              {t('common.update.newBuild', { version: `${build.version_name} (${build.version_code})` })}
            </Text>
            <Text style={shared.body}>
              {t('common.update.size')}: {formatMb(build.bytes)} MB
            </Text>
            {build.notes ? (
              <Text style={shared.body}>
                {t('common.update.notes')}: {build.notes}
              </Text>
            ) : null}
          </View>
        ) : null}
        {updater.phase === 'needsPermission' ? (
          <Text style={shared.body}>{t('common.update.permission')}</Text>
        ) : null}
        {updater.phase === 'downloading' ? (
          <View style={{ marginTop: 8 }}>
            <View
              style={{
                height: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.primary }} />
            </View>
            <Text style={shared.body}>
              {formatMb(updater.bytes)} / {formatMb(updater.totalBytes)} MB · {percent}% ·{' '}
              {formatMb(updater.speedBps)} MB/s
            </Text>
          </View>
        ) : null}
        {!paired ? <Text style={shared.body}>{t('common.update.pairFirst')}</Text> : null}
        {updater.phase === 'error' && error ? (
          <Text style={[shared.body, { color: colors.danger }]}>
            {t('common.error')}: {error}
          </Text>
        ) : null}
        {updater.phase === 'downloading' ? (
          <Button label={t('common.update.cancel')} onPress={() => void cancelUpdate()} />
        ) : null}
        {['available', 'needsPermission'].includes(updater.phase) ? (
          <Button
            label={t('common.update.install')}
            kind="primary"
            busy={installBusy}
            onPress={() => void startUpdate()}
          />
        ) : null}
        {installBusy ? (
          <View style={[shared.row, { justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={shared.body}>
              {updater.phase === 'preparing'
                ? t('common.update.preparing')
                : updater.phase === 'installing'
                  ? t('common.update.installing')
                  : t('common.update.downloading')}
            </Text>
          </View>
        ) : null}
        {updater.phase === 'error' && build?.newer ? (
          <Button label={t('common.update.retry')} onPress={() => void startUpdate()} />
        ) : null}
        {paired &&
        updater.phase !== 'unpaired' &&
        updater.phase !== 'preparing' &&
        updater.phase !== 'downloading' &&
        updater.phase !== 'installing' ? (
          <Button
            label={checkBusy ? t('common.update.checking') : t('common.update.check')}
            busy={checkBusy}
            disabled={checkBusy}
            onPress={() => void checkForUpdate(false)}
          />
        ) : null}
      </Card>
    </View>
  );
}
