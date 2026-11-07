import { describe, expect, it } from 'vitest';
import en from '../i18n/locales/en/speak';
import ko from '../i18n/locales/ko/speak';

describe('speech localization', () => {
  it('keeps all speech keys and interpolation variables aligned', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const variables = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();
      expect(variables(en[key]), key).toEqual(variables(ko[key]));
    }
  });
});
