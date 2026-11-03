import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { getDb } from '../../src/db/client';
import { loadBlocks } from '../../src/db/repos/coach';
import { useEffectiveLang } from '../../src/session/language';
import { ModeSessionBar } from '../../src/session/ModeSessionBar';
import { speakThroughSession } from '../../src/session/speech';
import { VoiceCoachScreen, type PracticeBlock } from '../../src/voice-coach';
import {
  flushPendingNotes,
  loadCoachNotes,
  persistBlocks,
  persistTakeAnalyzed,
  persistTakeDeleted,
  persistTakeNote,
  persistTakeRecorded,
  setCoachControls,
  useCoachNotes,
} from '../../src/voice-coach/service';

/**
 * Voice Coach. Feedback is spoken through the running native session (and always shown on screen). Practice blocks, takes,
 * take metrics and take notes are stored in SQLite; WAV files live in the module's `filesDir/vlc-takes/`.
 */
export default function VoiceCoachRoute() {
  const lang = useEffectiveLang();
  const notes = useCoachNotes((s) => s.notes);
  const initialBlocks = useMemo(() => loadBlocks(getDb()) as PracticeBlock[], []);

  useEffect(() => {
    loadCoachNotes();
    return () => flushPendingNotes();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ModeSessionBar mode="coach" />
      <VoiceCoachScreen
        lang={lang}
        initialBlocks={initialBlocks}
        onBlocksChange={persistBlocks}
        takeNotes={notes}
        onTakeNotesChange={persistTakeNote}
        onTakeRecorded={persistTakeRecorded}
        onTakeAnalyzed={persistTakeAnalyzed}
        onTakeDeleted={persistTakeDeleted}
        onFeedback={(text, l) => void speakThroughSession(text, l)}
        onControls={setCoachControls}
      />
    </View>
  );
}
