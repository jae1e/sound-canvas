import { learnBaseline, type PaceBand, type SpeechReport } from '@vlc/voice-analysis';
import type { takes } from '../db/schema';

type Row = typeof takes.$inferSelect;
/** Use only earlier comparable takes; rates in Korean and English have different units. */
export function speechBaseline(rows: Row[], lang: 'ko' | 'en', before = Infinity): PaceBand | null {
  const rates: number[] = [];
  for (const row of rows
    .filter((r) => r.kind === 'speech' && r.createdAt < before)
    .sort((a, b) => b.createdAt - a.createdAt)) {
    try {
      const saved = JSON.parse(row.beatJson ?? '{}');
      const transcript = JSON.parse(row.transcriptJson ?? '{}');
      const rowLang =
        saved.speechPlan?.lang === 'en'
          ? 'en'
          : saved.speechPlan?.lang === 'ko'
            ? 'ko'
            : (transcript.language ?? 'ko');
      const report = JSON.parse(row.reportJson ?? 'null') as SpeechReport | null;
      if (rowLang === lang && report?.tiles.pace.value != null && Number.isFinite(report.tiles.pace.value))
        rates.push(report.tiles.pace.value);
      if (rates.length >= 10) break;
    } catch {
      /* Ignore invalid legacy rows. */
    }
  }
  return learnBaseline(rates, lang);
}
