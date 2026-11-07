import { ScrollView, Text, View } from 'react-native';

import { Button, Card } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { shared } from '../../src/theme';
import { workController, useWork } from '../../src/work/instance';
import { ActiveSession } from '../../src/work/ui/ActiveSession';
import { PlanEditor } from '../../src/work/ui/PlanEditor';
import { StartPanel } from '../../src/work/ui/StartPanel';
import { SummaryPanel } from '../../src/work/ui/SummaryPanel';
import { deriveView } from '../../src/work/view';
import { useSettings } from '../../src/settings/store';
import { Redirect } from 'expo-router';

/** Work Partner: start a session, edit the plan, run it hands-free, review it. */
export default function WorkScreen() {
  const { t } = useTranslation();
  const session = useWork((s) => s.session);
  const title = useWork((s) => s.title);
  const level = useSettings((s) => s.settings.nudgeLevel);
  const showHiddenModes = useSettings((s) => s.settings.showHiddenModes);

  if (!showHiddenModes) return <Redirect href="/(tabs)" />;

  if (!session) {
    return (
      <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
        <StartPanel />
      </ScrollView>
    );
  }
  if (session.status === 'ended') {
    return (
      <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
        <SummaryPanel session={session} />
      </ScrollView>
    );
  }
  if (session.status === 'ready' || session.status === 'draft') {
    const view = deriveView(session, Date.now(), session.lang, level);
    return (
      <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
        <Text style={shared.h1}>{title ?? t('work.draft.title')}</Text>
        <Text style={shared.muted}>{t('work.draft.hint')}</Text>
        {view.steps.length === 0 ? <Text style={shared.muted}>{t('work.draft.noSteps')}</Text> : null}
        <PlanEditor steps={view.steps} />
        <Card>
          <View style={{ gap: 8 }}>
            <Button
              big
              kind="primary"
              label={t('work.draft.begin')}
              onPress={() => {
                workController.begin();
                void workController.startListening();
              }}
            />
            <Button label={t('work.draft.discard')} kind="danger" onPress={() => workController.discard()} />
          </View>
        </Card>
      </ScrollView>
    );
  }
  return <ActiveSession session={session} />;
}
