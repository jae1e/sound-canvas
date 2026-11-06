import { displayTitle, previewLine } from './titles';

/** True when the trimmed text differs from the saved note (a missing note counts as empty). */
export function noteChanged(saved: string | null, text: string): boolean {
  return text.trim() !== (saved ?? '').trim();
}

export type NoteButton = { label: 'save' | 'saving' | 'saved'; enabled: boolean };

/** Save button: enabled only while the text differs from the saved note and nothing is in flight. */
export function noteButtonState(saved: string | null, text: string, saving: boolean): NoteButton {
  if (saving) return { label: 'saving', enabled: false };
  return noteChanged(saved, text) && text.trim() !== '' ? { label: 'save', enabled: true } : { label: 'saved', enabled: false };
}

/** The sync line under the note field. */
export function noteSyncState(noteSaved: boolean, synced: boolean | null): 'none' | 'syncing' | 'synced' {
  if (!noteSaved) return 'none';
  return synced ? 'synced' : 'syncing';
}

/** List row text lines: title, optional note line, optional transcript preview. */
export function composeRowLines(args: { userTitle: string | null; auto: string; note: string | null; transcript: string | null }): {
  line1: string;
  noteLine: string | null;
  preview: string | null;
} {
  const line1 = displayTitle(args.userTitle, args.auto);
  const n = (args.note ?? '').replace(/\s+/g, ' ').trim();
  return { line1, noteLine: n ? `📝 ${n}` : null, preview: previewLine(line1, args.transcript) };
}
