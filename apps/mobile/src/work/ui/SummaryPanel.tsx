import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { stepsOf, type Session } from '@vlc/session-engine';

import { Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { shared } from '../../theme';
import { workController } from '../instance';

/** Shown after a session ended: the generated summary is already in the Journal. */
export function SummaryPanel({ session }: { session: Session }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const steps = stepsOf(session);
  const done = steps.filter((s) => s.status === 'completed').length;
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={shared.h1}>{t('work.summary.title')}</Text>
        {steps.length > 0 ? <Text style={shared.body}>{t('work.summary.steps', { done, total: steps.length })}</Text> : null}
        <Text style={shared.muted}>{t('work.summary.saved')}</Text>
      </Card>
      <Button label={saved ? t('work.summary.transcriptSaved') : t('work.summary.saveTranscript')} disabled={saved} onPress={() => setSaved(workController.saveTranscript())} />
      <Button label={t('work.summary.openJournal')} onPress={() => router.push('/journal')} />
      <Button label={t('work.summary.new')} kind="primary" big onPress={() => workController.dismiss()} />
    </View>
  );
}
