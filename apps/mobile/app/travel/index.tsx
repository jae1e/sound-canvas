import { View } from 'react-native';

import { useEffectiveLang } from '../../src/session/language';
import { ModeSessionBar } from '../../src/session/ModeSessionBar';
import { useModeSession } from '../../src/session/instance';
import { speakThroughSession } from '../../src/session/speech';
import { TravelGuideScreen } from '../../src/travel';
import { savePlaceFromResult, travelController } from '../../src/travel/service';

/**
 * Travel Guide. Spoken output goes through the running native session (Supertonic or platform TTS, user output routing);
 * without a session the text is only shown. While the session runs, GPS fixes come from the service events (wired in
 * `src/session/wire.ts`), so the screen does not feed them a second time.
 */
export default function TravelRoute() {
  const lang = useEffectiveLang();
  const sessionRunning = useModeSession((s) => s.mode === 'travel' && s.status === 'running');
  return (
    <View style={{ flex: 1 }}>
      <ModeSessionBar mode="travel" />
      <TravelGuideScreen
        controller={travelController}
        lang={lang}
        onSpeak={(text, l) => void speakThroughSession(text, l)}
        feedLocation={!sessionRunning}
        onSavePlace={savePlaceFromResult}
      />
    </View>
  );
}
