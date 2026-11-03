import { describe, expect, it } from 'vitest';

import { describeInput, formatMegabytes } from './routeLabels';

const dev = (typeName: string, productName: string | null) => ({ id: 1, type: 7, typeName, productName, isSource: true, isSink: false });

describe('describeInput', () => {
  it('falls back to the phone microphone', () => {
    expect(describeInput([null, undefined])).toEqual({ label: 'Phone microphone', bluetooth: false });
    expect(describeInput([dev('builtin_mic', 'Pixel')])).toEqual({ label: 'Phone microphone', bluetooth: false });
  });
  it('uses the Bluetooth product name', () => {
    expect(describeInput([null, dev('bluetooth_sco', 'Galaxy Buds3')])).toEqual({ label: 'Galaxy Buds3', bluetooth: true });
  });
  it('uses the type name when the product name is missing', () => {
    expect(describeInput([dev('bluetooth_sco', null)]).label).toBe('bluetooth_sco');
  });
});

describe('formatMegabytes', () => {
  it('rounds', () => expect(formatMegabytes(152_000_000)).toBe('145 MB'));
});
