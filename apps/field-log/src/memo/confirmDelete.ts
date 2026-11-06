import { Alert } from 'react-native';
import type { Key } from '../i18n';
import { deleteMemo } from './actions';

/** Asks for confirmation, then deletes. `t` is the translator from useT(). */
export function confirmDeleteMemo(t: (k: Key) => string, memoId: string, onDeleted?: () => void): void {
  Alert.alert(t('deleteTitle'), t('deleteBody'), [
    { text: t('cancel'), style: 'cancel' },
    {
      text: t('deleteMemo'),
      style: 'destructive',
      onPress: () => {
        deleteMemo(memoId).then(
          () => onDeleted?.(),
          (e: Error) => Alert.alert(t('error'), e.message === 'RECORDING' ? t('deleteRefuse') : e.message),
        );
      },
    },
  ]);
}
