import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appDirectory = resolve(process.cwd(), 'app');

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(fullPath);
    if (!/\.(tsx?|jsx?)$/.test(entry.name) || entry.name.startsWith('_')) return [];
    return [fullPath];
  });
}

function routePath(filePath: string): string {
  const segments = relative(appDirectory, filePath)
    .replace(/\.(tsx?|jsx?)$/, '')
    .split(/[\\/]/)
    .filter((segment) => !/^\(.*\)$/.test(segment) && segment !== 'index');
  return segments.length ? `/${segments.join('/')}` : '/';
}

describe('Expo Router route paths', () => {
  it('has no duplicate paths after removing groups and index segments', () => {
    const routes = new Map<string, string[]>();
    for (const filePath of routeFiles(appDirectory)) {
      const path = routePath(filePath);
      routes.set(path, [...(routes.get(path) ?? []), relative(appDirectory, filePath)]);
    }

    const conflicts = [...routes.entries()].filter(([, files]) => files.length > 1);
    expect(conflicts).toEqual([]);
  });
});
