import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { getDb } from '../../src/db/client';
import { loadBlocks } from '../../src/db/repos/coach';
import { useEffectiveLang } from '../../src/session/language';
import { VoiceCoachScreen, type PracticeBlock } from '../../src/voice-coach';
import { setUpdateRecording } from '../../src/update/updater';
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
export function VoiceCoachRoute({ defaultMode = 'practice' }: { defaultMode?: 'practice' | 'speech' }) {
  const lang = useEffectiveLang();
  const notes = useCoachNotes((s) => s.notes);
  const initialBlocks = useMemo(() => {
    const blocks = loadBlocks(getDb()) as PracticeBlock[];
    return blocks.length ? blocks.map((b, i) => i === 0 ? { ...b, mode: defaultMode } : b) : [{ id: `default-${defaultMode}`, name: defaultMode === 'speech' ? 'Free speech' : 'Practice', durationS: 60, repeats: 1, restS: 0, target: '', mode: defaultMode }];
  }, [defaultMode]);

  useEffect(() => {
    loadCoachNotes();
    return () => flushPendingNotes();
  }, []);


  return (
    <View style={{ flex: 1 }}>
      <VoiceCoachScreen
        lang={lang}
        initialBlocks={initialBlocks}
        onBlocksChange={persistBlocks}
        takeNotes={notes}
        onTakeNotesChange={persistTakeNote}
        onTakeRecorded={persistTakeRecorded}
        onTakeAnalyzed={persistTakeAnalyzed}
        onTakeDeleted={persistTakeDeleted}
        onControls={setCoachControls}
        onRecordingChange={setUpdateRecording}
      />
    </View>
  );
}

export default VoiceCoachRoute;
