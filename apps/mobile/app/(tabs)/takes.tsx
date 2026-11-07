import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { getDb } from '../../src/db/client';
import { listStoredTakes, type StoredTake } from '../../src/db/repos/coach';
import { useTranslation } from '../../src/i18n';
import { shared } from '../../src/theme';

export default function TakesTab() {
  const { t } = useTranslation();
  const [takes, setTakes] = useState<StoredTake[]>([]);

  useEffect(() => {
    try {
      setTakes(listStoredTakes(getDb()));
    } catch {
      setTakes([]);
    }
  }, []);

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      {takes.length ? (
        takes.map((take) => (
          <Text key={take.id} style={shared.body}>
            {take.note || new Date(take.createdAt).toLocaleString()}
            {take.durationMs ? ` · ${Math.round(take.durationMs / 1000)}s` : ''}
          </Text>
        ))
      ) : (
        <Text style={shared.body}>{t('common.takes.coming')}</Text>
      )}
    </ScrollView>
  );
}
