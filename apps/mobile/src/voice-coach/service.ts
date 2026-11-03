import type { TakeSummary } from '@vlc/voice-analysis';
import type { Lang, Session } from '@vlc/session-engine';
import { create } from 'zustand';

import { getDb } from '../db/client';
import { deleteTakeRow, getTake, insertTake, listStoredTakes, saveBlocks, setTakeMetrics, setTakeNote, type StoredBlock } from '../db/repos/coach';
import { modeSessions, newId } from '../session/instance';
import type { ModeHandler } from '../session/modeSession';
import { speakThroughSession } from '../session/speech';
import { parseCoachCommand } from './commands';
import { setCaptureGate } from './gate';
import type { PracticeBlock, VoiceCoachControls } from './types';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Time for the platform recognizer to release the microphone before the recorder opens its AudioRecord. */
const MIC_SETTLE_MS = 350;

/** Take notes by take id, shared by the screen's text fields, voice notes and the database. */
export const useCoachNotes = create<{ notes: Record<string, string> }>(() => ({ notes: {} }));

let controls: VoiceCoachControls | null = null;
export function setCoachControls(c: VoiceCoachControls | null): void {
  controls = c;
}

export function loadCoachNotes(): void {
  const notes: Record<string, string> = {};
  for (const t of listStoredTakes(getDb())) if (t.note) notes[t.id] = t.note;
  useCoachNotes.setState({ notes });
}

// ---------------------------------------------------------------- persistence

export function persistBlocks(blocks: PracticeBlock[]): void {
  saveBlocks(getDb(), blocks as StoredBlock[], Date.now());
}

export function persistTakeRecorded(t: { id: string; path: string; durationS: number; createdAtMs: number; blockId?: string }): void {
  insertTake(getDb(), {
    id: t.id,
    sessionId: modeSessions.getState().mode === 'coach' ? modeSessions.getState().sessionId : null,
    fileUri: t.path,
    blockId: t.blockId ?? null,
    durationMs: Math.round(t.durationS * 1000),
    createdAt: t.createdAtMs,
  });
}

export function persistTakeAnalyzed(t: { id: string; summary: TakeSummary }): void {
  setTakeMetrics(getDb(), t.id, { mode: t.summary.mode, metrics: t.summary.metrics, speech: t.summary.speech, lines: t.summary.lines });
}

export function persistTakeDeleted(id: string): void {
  deleteTakeRow(getDb(), id);
  const { [id]: _removed, ...rest } = useCoachNotes.getState().notes;
  useCoachNotes.setState({ notes: rest });
}

/** Sets a take note (typed or spoken). Updates the store at once and writes the take row and its Journal entry. */
export function persistTakeNote(takeId: string, text: string): void {
  useCoachNotes.setState({ notes: { ...useCoachNotes.getState().notes, [takeId]: text } });
  scheduleNoteWrite(takeId);
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleNoteWrite(takeId: string, delayMs = 700): void {
  const old = pending.get(takeId);
  if (old) clearTimeout(old);
  pending.set(
    takeId,
    setTimeout(() => {
      pending.delete(takeId);
      writeNote(takeId);
    }, delayMs),
  );
}

function writeNote(takeId: string): void {
  const text = useCoachNotes.getState().notes[takeId] ?? '';
  const db = getDb();
  const take = getTake(db, takeId);
  if (!take) return; // not recorded through the app (no row to link to)
  setTakeNote(db, { takeId, text, sessionId: take.sessionId, now: Date.now(), newId });
}

/** Writes any note edits that are still waiting for their debounce (call when leaving the screen). */
export function flushPendingNotes(): void {
  for (const [id, timer] of pending) {
    clearTimeout(timer);
    pending.delete(id);
    writeNote(id);
  }
}

// ------------------------------------------------------------------ voice

const say = (ko: string, en: string, lang: Lang) => void speakThroughSession(lang === 'ko' ? ko : en, lang);

/** Appends a spoken note to the latest take. Returns false when there is no take to attach it to. */
function noteLastTake(text: string): boolean {
  const id = controls?.lastTakeId() ?? listStoredTakes(getDb(), 1)[0]?.id ?? null;
  if (!id) return false;
  const old = useCoachNotes.getState().notes[id];
  persistTakeNote(id, old ? `${old}\n${text}` : text);
  flushPendingNotes();
  return true;
}

export const coachHandler: ModeHandler = {
  async handle(hypotheses, lang) {
    for (const h of hypotheses.slice(0, 3)) {
      const cmd = parseCoachCommand(h);
      if (!cmd) continue;
      if (cmd.kind === 'take_note') {
        if (noteLastTake(cmd.text)) say('테이크 메모를 저장했어요.', 'Saved the take note.', lang);
        else say('아직 녹음한 테이크가 없어요.', 'There is no take yet.', lang);
        return true;
      }
      if (!controls) {
        say('보이스 코치 화면을 열어 주세요.', 'Please open the Voice Coach screen.', lang);
        return true;
      }
      // No spoken acknowledgement for start: speech would be recorded into the take.
      const ok =
        cmd.kind === 'start_take'
          ? await controls.startTake()
          : cmd.kind === 'stop_take'
            ? await controls.stopTake()
            : cmd.kind === 'play_back'
              ? await controls.playLast()
              : await controls.sameBlockAgain();
      if (!ok) {
        if (cmd.kind === 'play_back') say('들려줄 테이크가 없어요.', 'There is no take to play.', lang);
        else if (cmd.kind === 'stop_take') say('녹음 중이 아니에요.', 'Nothing is recording.', lang);
      }
      return true;
    }
    return false;
  },
  saveNote(text, _session: Session, lang) {
    return noteLastTake(text) ? (lang === 'ko' ? '테이크 메모를 저장했어요.' : 'Saved the take note.') : lang === 'ko' ? '아직 녹음한 테이크가 없어요.' : 'There is no take yet.';
  },
};

/** Installs the mic gate so takes, live pitch and playback pause the session STT. */
export function installCoachMicGate(): void {
  setCaptureGate({
    acquire: async (kind) => {
      const hadHold = modeSessions.getState().holds.length > 0;
      const running = modeSessions.getState().status === 'running';
      modeSessions.holdMic(kind);
      if (running && !hadHold) await sleep(MIC_SETTLE_MS);
    },
    release: (kind) => modeSessions.releaseMic(kind),
  });
}
