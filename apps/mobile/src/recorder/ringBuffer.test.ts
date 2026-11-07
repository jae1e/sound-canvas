import { describe, expect, it } from 'vitest';
import { RingBuffer } from './ringBuffer';
describe('RingBuffer', () => {
  it('keeps the newest frames in order after wrapping and can be cleared', () => {
    const buffer = new RingBuffer<number>(3);
    [1, 2, 3, 4, 5].forEach((value) => buffer.push(value));
    expect(buffer.values()).toEqual([3, 4, 5]);
    buffer.clear();
    expect(buffer.values()).toEqual([]);
    buffer.push(6);
    expect(buffer.values()).toEqual([6]);
  });
  it('rejects invalid capacities', () => { expect(() => new RingBuffer(0)).toThrow(); });
});
