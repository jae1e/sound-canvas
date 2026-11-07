/** Fixed-capacity FIFO; writes never allocate or cause a React update. */
export class RingBuffer<T> {
  private data: (T | undefined)[];
  private next = 0;
  private count = 0;
  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Invalid capacity');
    this.data = new Array<T | undefined>(capacity);
  }
  push(value: T): void {
    this.data[this.next] = value;
    this.next = (this.next + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }
  values(): T[] {
    return Array.from(
      { length: this.count },
      (_, i) => this.data[(this.next - this.count + i + this.capacity) % this.capacity] as T,
    );
  }
  clear(): void {
    this.next = 0;
    this.count = 0;
    this.data.fill(undefined);
  }
}
