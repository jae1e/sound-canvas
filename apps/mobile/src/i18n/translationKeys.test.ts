import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resources } from './index';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('translation keys used by the app', () => {
  it('defines every literal t() key in English and Korean', () => {
    const files = [...sourceFiles(join(process.cwd(), 'app')), ...sourceFiles(join(process.cwd(), 'src'))];
    const missing: string[] = [];
    const matcher = /\bt\(\s*(?:'([^']+)'|"([^"]+)"|`([^`$]+)`)(?:\s*,|\s*\))/g;

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      // Voice Coach and Travel screens use their own typed dictionaries; only
      // validate calls that use this module's i18next hook against these resources.
      if (!/import\s*\{[^}]*\buseTranslation\b[^}]*\}\s*from\s*['"][^'"]*\/i18n['"]/.test(source)) continue;
      for (const match of source.matchAll(matcher)) {
        const key = match[1] ?? match[2] ?? match[3];
        if (key.includes('${')) continue;
        for (const language of ['en', 'ko'] as const) {
          if (!(key in resources[language].translation)) missing.push(`${language}: ${key} (${file})`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

// Dynamic prefixes are intentionally not expanded by the literal-key scanner:
// settings.voice.engine.* is keyed by TTS_ENGINES; settings.nudge.* by NUDGE_LEVELS;
// settings.earcon.vibration.* and settings.earcon.name.* by their schema enums;
// common.mode.* by persisted session modes; journal.source.* by persisted journal sources.
