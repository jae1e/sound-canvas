import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import VlcSessionService from '../../../modules/vlc-session-service';
import { formatMegabytes } from '../../audio/routeLabels';
import { Button } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { shared } from '../../theme';

const SET_ID = 'tts-supertonic';

/** Supertonic model status with download, progress, cancel and delete. */
export function ModelSection() {
  const { t } = useTranslation();
  const [ready, setReady] = useState<boolean | null>(null);
  const [totalBytes, setTotalBytes] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      VlcSessionService.getModelStatus()
        .then((list) => {
          const m = list.find((x) => x.id === SET_ID);
          setReady(m ? m.ready : null);
          setTotalBytes(m?.totalBytes ?? 0);
        })
        .catch(() => setReady(null));
    } catch {
      setReady(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    try {
      const sub = VlcSessionService.addListener('modelDownloadProgress', (e) => {
        if (e.setId === SET_ID) setProgress(e.overallFraction);
      });
      return () => sub.remove();
    } catch {
      return undefined;
    }
  }, [refresh]);

  const download = () => {
    setError(null);
    setProgress(0);
    try {
      VlcSessionService.downloadModels([SET_ID])
        .catch(() => setError(t('settings.voice.model.error')))
        .finally(() => {
          setProgress(null);
          refresh();
        });
    } catch {
      setProgress(null);
      setError(t('settings.voice.model.error'));
    }
  };

  const cancel = () => {
    try {
      VlcSessionService.cancelModelDownload();
    } catch {
      // Ignore.
    }
  };

  const remove = () => {
    Alert.alert(t('settings.voice.model.delete'), t('settings.voice.model.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            VlcSessionService.deleteModelSet(SET_ID)
              .catch(() => setError(t('settings.voice.model.error')))
              .finally(refresh);
          } catch {
            setError(t('settings.voice.model.error'));
          }
        },
      },
    ]);
  };

  const size = formatMegabytes(totalBytes || 145 * 1024 * 1024);
  return (
    <View style={{ gap: 8 }}>
      <Text style={shared.body}>{t('settings.voice.model')}</Text>
      {ready === null ? <Text style={shared.muted}>{t('settings.voice.model.unavailable')}</Text> : null}
      {ready === true ? <Text style={shared.muted}>{t('settings.voice.model.ready', { size })}</Text> : null}
      {ready === false && progress === null ? (
        <>
          <Text style={shared.muted}>{t('settings.voice.model.notReady')}</Text>
          <Text style={shared.muted}>{t('settings.voice.model.size', { size })}</Text>
        </>
      ) : null}
      {progress !== null ? <Text style={shared.muted}>{t('settings.voice.model.downloading', { percent: Math.round(progress * 100) })}</Text> : null}
      {error ? <Text style={{ color: '#b3261e' }}>{error}</Text> : null}
      {ready === false && progress === null ? <Button kind="primary" label={t('settings.voice.model.download')} onPress={download} /> : null}
      {progress !== null ? <Button label={t('settings.voice.model.cancel')} onPress={cancel} /> : null}
      {ready === true && progress === null ? <Button kind="danger" label={t('settings.voice.model.delete')} onPress={remove} /> : null}
    </View>
  );
}
