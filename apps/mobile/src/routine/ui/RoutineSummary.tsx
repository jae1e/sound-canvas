import { ScrollView, Text, View } from 'react-native';
import { summarizeRun, hasSavableChanges } from '@vlc/session-engine';

import { Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { shared, space } from '../../theme';
import { routineController, useRoutine } from '../instance';

/** End of a routine: what happened, the correction-cue line, pacing accuracy per set, and "save changes to the template?" (default no). */
export function RoutineSummary() {
  const { t } = useTranslation();
  const s = useRoutine();
  const run = s.run!;
  const sum = summarizeRun(run);
  const savable = s.offerSave && hasSavableChanges(run);
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <Text style={shared.h1}>{t('routine.summary.title')}</Text>
      <Card>
        <Text style={shared.h2}>{run.template.name}</Text>
        <Text style={shared.body}>{sum.endedEarly ? t('routine.summary.early') : t('routine.summary.done')}</Text>
        {sum.deviationCount > 0 ? <Text style={shared.muted}>{t('routine.summary.deviations', { count: sum.deviationCount })}</Text> : null}
        {s.summaryLine ? <Text style={shared.body}>{s.summaryLine}</Text> : null}
      </Card>
      {s.segments.length > 0 ? (
        <Card>
          <Text style={shared.h2}>{t('routine.summary.drift')}</Text>
          {s.segments
            .filter((g) => !g.cancelled && g.beats > 0)
            .map((g) => (
              <Text key={g.segmentId} style={shared.muted}>
                {t('routine.summary.driftRow', { label: g.label, mean: Math.round(g.meanDriftMs), p95: Math.round(g.p95DriftMs), max: Math.round(g.maxDriftMs), played: g.played, beats: g.beats, missing: g.missing })}
              </Text>
            ))}
        </Card>
      ) : null}
      {savable ? (
        <Card>
          <Text style={shared.h2}>{t('routine.summary.saveQ')}</Text>
          <Text style={shared.muted}>{t('routine.summary.saveHint')}</Text>
          <View style={{ gap: space.sm }}>
            <Button big kind="primary" label={t('routine.summary.saveNo')} onPress={() => void routineController.close(false)} />
            <Button label={t('routine.summary.saveYes')} onPress={() => void routineController.close(true)} />
          </View>
        </Card>
      ) : (
        <Button big kind="primary" label={t('routine.summary.close')} onPress={() => void routineController.close(false)} />
      )}
    </ScrollView>
  );
}
