import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { JournalEntry } from '../db/repos/journal';
import { buildExport, type ExportFormat, type ExportLang } from './export';

/** Writes the export into the cache directory and opens the share sheet. Returns false if sharing is unavailable. */
export async function shareJournal(entries: JournalEntry[], format: ExportFormat, lang: ExportLang, dialogTitle: string): Promise<boolean> {
  const { fileName, mimeType, content } = buildExport(entries, format, { lang, now: Date.now() });
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(content); // async since expo-file-system 58 (FT-32)
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  return true;
}
