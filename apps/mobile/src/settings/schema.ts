import { z } from 'zod';

import type { NudgeLevel } from '@vlc/session-engine';

export const LANGUAGE_SETTINGS = ['auto', 'ko', 'en'] as const;
export const TTS_ENGINES = ['auto', 'platform', 'supertonic'] as const;
export const OUTPUT_ROUTES = ['auto', 'speaker'] as const;
export const PACING_LEVELS = ['full', 'short', 'count'] as const;
export const EARCON_VIBRATION = ['navigation', 'all', 'off'] as const;
export const NUDGE_LEVELS = ['quiet', 'normal', 'chatty'] as const satisfies readonly NudgeLevel[];

export const settingsSchema = z.object({
  /** UI and speech language. `auto` follows the device locale (Korean or English). */
  language: z.enum(LANGUAGE_SETTINGS).default('auto'),
  /** `auto`: Supertonic once its model is downloaded, otherwise the platform TTS. */
  ttsEngine: z.enum(TTS_ENGINES).default('auto'),
  /** Supertonic voice index: F1-F5 are 0-4, M1-M5 are 5-9. */
  ttsVoice: z.number().int().min(0).max(9).default(0),
  /** Supertonic denoising steps: more is slower and cleaner. */
  ttsSteps: z.number().int().min(1).max(32).default(8),
  /** `auto` follows the system route (Bluetooth earbuds when connected). `speaker` forces the phone speaker; only on explicit choice. */
  outputRoute: z.enum(OUTPUT_ROUTES).default('auto'),
  nudgeLevel: z.enum(NUDGE_LEVELS).default('normal'),
  /** Suggest a break after a long focus block (Work Partner). Off by default. */
  focusBreakEnabled: z.boolean().default(false),
  focusBreakMinutes: z.number().int().min(5).max(240).default(50),
  /** Earcon loudness relative to speech, percent. */
  earconVolume: z.number().int().min(10).max(100).default(70),
  /** Vibrate with earcons: only in Travel Guide navigation (default), in every mode, or never. */
  earconVibration: z.enum(EARCON_VIBRATION).default('navigation'),
  /** Routine voice pacing: `full` (name + count), `short`, or `count` only. */
  pacingLevel: z.enum(PACING_LEVELS).default('full'),
  showHiddenModes: z.boolean().default(false),
  learnSpeechBaseline: z.boolean().default(false),
  hideSpeechPace: z.boolean().default(false),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({});

/** Reads stored JSON, keeping every valid field and defaulting the rest (a bad field never wipes the others). */
export function parseSettings(json: unknown): AppSettings {
  const whole = settingsSchema.safeParse(json);
  if (whole.success) return whole.data;
  const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(settingsSchema.shape)) {
    const r = field.safeParse(obj[key]);
    out[key] = r.success ? r.data : (DEFAULT_SETTINGS as Record<string, unknown>)[key];
  }
  return settingsSchema.parse(out);
}

/** Resolves the `language` setting to a concrete language; `deviceLocale` is a BCP-47 tag such as "ko-KR". */
export function resolveLanguage(setting: AppSettings['language'], deviceLocale: string | undefined): 'ko' | 'en' {
  if (setting === 'ko' || setting === 'en') return setting;
  return deviceLocale?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
