import { ScrollView } from 'react-native';

import { useRoutine } from '../../src/routine/instance';
import { ActiveRoutine } from '../../src/routine/ui/ActiveRoutine';
import { RoutineHome } from '../../src/routine/ui/RoutineHome';
import { RoutineSummary } from '../../src/routine/ui/RoutineSummary';
import { shared } from '../../src/theme';
import { Redirect } from 'expo-router';
import { useSettings } from '../../src/settings/store';

/** Work Partner routines: workout, stretching and poomsae with voice pacing. Lives next to the generic task copilot. */
export default function RoutineScreen() {
  const showHiddenModes = useSettings((s) => s.settings.showHiddenModes);
  const phase = useRoutine((s) => s.phase);
  if (!showHiddenModes) return <Redirect href="/(tabs)" />;
  if (phase === 'ended') return <RoutineSummary />;
  if (phase !== 'idle') return <ActiveRoutine />;
  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
      <RoutineHome />
    </ScrollView>
  );
}
