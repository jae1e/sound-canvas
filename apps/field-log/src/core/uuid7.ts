/** UUIDv7 generator. Monotonic within one process: a 12-bit counter orders ids made in one millisecond. */
export function createUuid7Generator(
  randomBytes: (n: number) => Uint8Array,
  now: () => number = Date.now,
): () => string {
  let lastMs = -1;
  let counter = 0;
  return () => {
    let ms = now();
    if (ms <= lastMs) {
      counter += 1;
      if (counter > 0xfff) {
        ms = lastMs + 1;
        counter = 0;
      } else {
        ms = lastMs;
      }
    } else {
      counter = randomBytes(2)[0] & 0x7f; // leave headroom for increments
    }
    lastMs = ms;
    const b = new Uint8Array(16);
    const hi = Math.floor(ms / 0x10000);
    b[0] = Math.floor(hi / 0x1000000) & 0xff;
    b[1] = Math.floor(hi / 0x10000) & 0xff;
    b[2] = Math.floor(hi / 0x100) & 0xff;
    b[3] = hi & 0xff;
    b[4] = Math.floor(ms / 0x100) & 0xff;
    b[5] = ms & 0xff;
    b[6] = 0x70 | (counter >> 8);
    b[7] = counter & 0xff;
    const rnd = randomBytes(8);
    for (let i = 0; i < 8; i++) b[8 + i] = rnd[i];
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}
