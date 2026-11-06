import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  backoffMs,
  buildEvent,
  canonicalJson,
  clockExchangeDue,
  computeClock,
  createUuid7Generator,
  deriveMemoState,
  exifToWallMs,
  fixToLocationPayload,
  hasFinalText,
  interpretResults,
  journalRecordToEvent,
  mergeTranscript,
  segmentStartsMs,
  selectUploadable,
  objectsToSkip,
  toggleLanguage,
  moveLanguage,
  migrateLegacyLanguage,
  normaliseLanguages,
  selectBatch,
  verifyChain,
  type FinalSeg,
} from './index';

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const vectors = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../services/field-log-server/tests/vectors/canonical.json'), 'utf8'),
);

describe('canonical json vectors', () => {
  for (const c of vectors.cases) {
    it(c.name, () => {
      expect(canonicalJson(c.input)).toBe(c.canonical);
      expect(sha(canonicalJson(c.input))).toBe(c.sha256);
    });
  }
  it('rejects floats, NaN, non-ASCII keys, unsafe integers', () => {
    expect(() => canonicalJson({ a: 1.5 })).toThrow();
    expect(() => canonicalJson({ a: NaN })).toThrow();
    expect(() => canonicalJson({ a: Infinity })).toThrow();
    expect(() => canonicalJson({ 키: 1 })).toThrow();
    expect(() => canonicalJson({ a: 2 ** 53 })).toThrow();
    expect(() => canonicalJson({ a: -(2 ** 53) })).toThrow();
    expect(canonicalJson({ a: 2 ** 53 - 1 })).toBe('{"a":9007199254740991}');
  });
  it('omits undefined object members', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe('event chain vectors', () => {
  it('reproduces canonical form and record hashes', async () => {
    const built = [];
    let prev = '';
    for (const c of vectors.chain) {
      const input = { ...c.envelope_without_record_hash, prev_hash: prev };
      expect(canonicalJson(input)).toBe(c.canonical);
      const ev = await buildEvent(input, sha);
      expect(ev.record_hash).toBe(c.record_hash);
      built.push(ev);
      prev = ev.record_hash;
    }
    expect(await verifyChain(built, sha)).toBe(true);
    built[0] = { ...built[0], wall_ms: 1 };
    expect(await verifyChain(built, sha)).toBe(false);
  });
});

describe('uuid7', () => {
  it('is well formed and monotonic within a millisecond', () => {
    const gen = createUuid7Generator((n) => new Uint8Array(randomBytes(n)), () => 1794000000000);
    const ids = Array.from({ length: 500 }, gen);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(500);
    expect(parseInt(ids[0].replace(/-/g, '').slice(0, 12), 16)).toBe(1794000000000);
  });
  it('stays monotonic when the clock goes backwards', () => {
    let t = 1000;
    const gen = createUuid7Generator((n) => new Uint8Array(randomBytes(n)), () => t);
    const a = gen();
    t = 900;
    expect(gen() > a).toBe(true);
  });
});

describe('location', () => {
  it('converts to integers', () => {
    const p = fixToLocationPayload(
      { latitude: 37.5665, longitude: 126.978, accuracy: 12, altitude: 30.4, timestamp: 1000 },
      3000,
      5_000_000,
    );
    expect(p).toEqual({
      lat_e7: 375665000,
      lon_e7: 1269780000,
      accuracy_cm: 1200,
      altitude_cm: 3040,
      provider: 'fused',
      fix_wall_ms: 1000,
      fix_elapsed_us: 3_000_000,
    });
    expect(canonicalJson(p)).toBeTruthy();
  });
  it('rejects invalid coordinates', () => {
    expect(fixToLocationPayload({ latitude: 91, longitude: 0, timestamp: 0 }, 0, 0)).toBeUndefined();
    expect(fixToLocationPayload({ latitude: NaN, longitude: 0, timestamp: 0 }, 0, 0)).toBeUndefined();
  });
});

describe('exif', () => {
  it('needs both date and offset', () => {
    expect(exifToWallMs('2026:11:06 09:30:00', '+09:00')).toBe(Date.UTC(2026, 10, 6, 0, 30, 0));
    expect(exifToWallMs('2026:11:06 09:30:00', '-05:00')).toBe(Date.UTC(2026, 10, 6, 14, 30, 0));
    expect(exifToWallMs('2026:11:06 09:30:00', undefined)).toBeUndefined();
    expect(exifToWallMs(undefined, '+09:00')).toBeUndefined();
    expect(exifToWallMs('garbage', '+09:00')).toBeUndefined();
  });
});

describe('clock', () => {
  it('computes offset and rtt', () => {
    const r = computeClock({
      sendWallMs: 1000,
      sendElapsedUs: 0,
      recvWallMs: 1100,
      recvElapsedUs: 100_000,
      serverRecvMs: 6040,
      serverSendMs: 6060,
    });
    expect(r.offsetMs).toBe(5000);
    expect(r.rttMs).toBe(80);
    expect(r.serverMs).toBe(6060);
  });
  it('schedules exchanges', () => {
    expect(clockExchangeDue(null, 0)).toBe(true);
    expect(clockExchangeDue(0, 599_999)).toBe(false);
    expect(clockExchangeDue(0, 600_000)).toBe(true);
  });
});

describe('journal mapping', () => {
  it('maps segment_closed', () => {
    const e = journalRecordToEvent({
      journalSeq: 3,
      kind: 'segment_closed',
      memoId: 'm',
      recordingId: 'r',
      wallMs: 10,
      elapsedUs: 20,
      bootCount: 4,
      segmentId: 's',
      index: 0,
      path: '/x.wav',
      sha256: 'ab',
      bytes: 100,
      startElapsedUs: 1,
      endElapsedUs: 2,
      startWallMs: 3,
      durationMs: 5,
      peakDbfsX100: -312,
      clippedSamples: 0,
      hfRatio4kPpm: 5000,
      flags: ['clipped'],
      recovered: false,
    });
    expect(e.type).toBe('segment_closed');
    expect(e.payload).toMatchObject({ object_sha256: 'ab', format: 'wav_pcm16_16k_mono', peak_dbfs_x100: -312, flags: ['clipped'] });
    expect(() => canonicalJson(e.payload)).not.toThrow();
  });
  it('maps route to snake_case and drops undefined', () => {
    const e = journalRecordToEvent({
      journalSeq: 1,
      kind: 'recording_started',
      memoId: 'm',
      recordingId: 'r',
      wallMs: 1,
      elapsedUs: 2,
      bootCount: 3,
      source: 'MIC',
      sampleRate: 16000,
      route: { type: 'bluetooth_sco', productName: 'Buds', addressHash: 'ff', deviceId: 7 },
      effects: { ns: 'on', agc: 'off', aec: 'unavailable' },
    });
    expect(canonicalJson(e.payload)).toBe(
      '{"effects":{"aec":"unavailable","agc":"off","ns":"on"},"memo_id":"m","recording_id":"r","route":{"address_hash":"ff","device_id":7,"product_name":"Buds","type":"bluetooth_sco"},"sample_rate":16000,"source":"MIC"}',
    );
  });
});

describe('memo state', () => {
  const base = { isRecording: false, segmentCount: 2, segmentsDone: 0, segmentsFailed: 0, pendingEvents: 0, pendingObjects: 0 };
  it('walks the four states', () => {
    expect(deriveMemoState({ ...base, isRecording: true }).current).toBe('recording');
    expect(deriveMemoState({ ...base, pendingEvents: 3 }).current).toBe('saved');
    expect(deriveMemoState({ ...base, pendingObjects: 1 }).synced).toBe(false);
    expect(deriveMemoState(base).current).toBe('synced');
    expect(deriveMemoState({ ...base, segmentsDone: 2 }).current).toBe('transcribed');
    expect(deriveMemoState({ ...base, segmentCount: 0 }).transcribed).toBe(false);
    expect(deriveMemoState({ ...base, segmentsFailed: 1 }).failed).toBe(true);
  });
});

describe('sync planner', () => {
  const ev = (seq: number) => ({ seq, eventId: `e${seq}` });
  it('selects contiguous batches up to the limit', () => {
    expect(selectBatch([ev(1), ev(2), ev(4)]).map((e) => e.seq)).toEqual([1, 2]);
    const many = Array.from({ length: 450 }, (_, i) => ev(i + 1));
    expect(selectBatch(many)).toHaveLength(200);
    expect(selectBatch([])).toEqual([]);
  });
  it('acks accepted and duplicate', () => {
    const o = interpretResults([ev(1), ev(2)], {
      last_seq: 2,
      results: [
        { event_id: 'e1', status: 'accepted' },
        { event_id: 'e2', status: 'duplicate' },
      ],
    });
    expect(o).toEqual({ ack: ['e1', 'e2'] });
  });
  it('handles a gap by asking for a resend from last_seq + 1', () => {
    const o = interpretResults([ev(5), ev(6)], {
      last_seq: 2,
      results: [
        { event_id: 'e5', status: 'rejected', reason: 'gap' },
        { event_id: 'e6', status: 'rejected', reason: 'gap' },
      ],
    });
    expect(o.ack).toEqual([]);
    expect(o.resendFromSeq).toBe(3);
    expect(o.stuck).toBeUndefined();
  });
  it('marks hash rejections as stuck while still acking earlier events', () => {
    const o = interpretResults([ev(1), ev(2), ev(3)], {
      last_seq: 1,
      results: [
        { event_id: 'e1', status: 'accepted' },
        { event_id: 'e2', status: 'rejected', reason: 'hash' },
        { event_id: 'e3', status: 'rejected', reason: 'gap' },
      ],
    });
    expect(o.ack).toEqual(['e1']);
    expect(o.stuck).toEqual({ eventId: 'e2', reason: 'hash' });
  });
  it('backs off exponentially with a cap', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => backoffMs(n))).toEqual([0, 5000, 10000, 20000, 40000, 60000, 60000]);
  });
});

describe('transcript merge', () => {
  const seg = (index: number, startMs: number, durationMs: number, text: string, status: FinalSeg['status'] = 'done', noSpeech = false): FinalSeg => ({
    segmentId: `s${index}`,
    index,
    startMs,
    durationMs,
    status,
    text,
    noSpeech,
  });
  const kinds = (items: ReturnType<typeof mergeTranscript>) =>
    items.map((i) => (i.kind === 'final' ? `F:${i.seg.text || i.seg.status}` : `D:${i.utt.text}`));

  it('hides finalised drafts covered by a final segment with text', () => {
    const items = mergeTranscript(
      [seg(0, 0, 10000, 'hello world'), seg(1, 10000, 10000, '', 'running')],
      [
        { utterance: 0, text: 'helo wurld', startMs: 500, endMs: 4000, partial: false },
        { utterance: 1, text: 'next draft', startMs: 11000, endMs: 15000, partial: false },
        { utterance: 2, text: 'typing', partial: true },
      ],
      true,
    );
    expect(kinds(items)).toEqual(['F:hello world', 'F:running', 'D:next draft', 'D:typing']);
  });
  it('keeps drafts when the covering segment is no_speech or empty', () => {
    const items = mergeTranscript([seg(0, 0, 10000, '', 'done', true)], [{ utterance: 0, text: 'x', startMs: 0, endMs: 2000, partial: false }], true);
    expect(kinds(items)).toEqual(['F:done', 'D:x']);
    expect(hasFinalText(seg(0, 0, 1, 'a', 'done', true))).toBe(false);
  });
  it('drops dangling partials after the recording ends', () => {
    expect(mergeTranscript([], [{ utterance: 0, text: 'x', partial: true }], false)).toEqual([]);
  });
  it('computes segment starts from elapsed times or durations', () => {
    expect(segmentStartsMs([{ index: 1, durationMs: 5000 }, { index: 0, durationMs: 20000 }])).toEqual([20000, 0]);
    expect(
      segmentStartsMs(
        [{ index: 0, durationMs: 1000, startElapsedUs: 5_000_000 }, { index: 1, durationMs: 1000, startElapsedUs: 6_100_000 }],
        4_900_000,
      ),
    ).toEqual([100, 1200]);
  });
});

describe('deletion', () => {
  it('upload planner skips objects of deleted memos and skipped objects', () => {
    const objs = [
      { sha256: 'a' },
      { sha256: 'b', skipped: true },
      { sha256: 'c', memoDeleted: true },
      { sha256: 'd', skipped: false, memoDeleted: false },
    ];
    expect(selectUploadable(objs).map((o) => o.sha256)).toEqual(['a', 'd']);
  });
  it('skips only pending, unshared objects of the memo', () => {
    const objs = [
      { sha256: 'a', memoId: 'm', uploaded: false },
      { sha256: 'b', memoId: 'm', uploaded: true },
      { sha256: 'c', memoId: 'm', uploaded: false },
      { sha256: 'd', memoId: 'x', uploaded: false },
    ];
    expect(objectsToSkip(objs, 'm', new Set(['c'])).map((o) => o.sha256)).toEqual(['a']);
  });
  it('derives a deleted state with no chips', () => {
    const st = deriveMemoState({ isRecording: false, segmentCount: 2, segmentsDone: 2, segmentsFailed: 1, pendingEvents: 0, pendingObjects: 0, deleted: true });
    expect(st).toEqual({ recording: false, savedOnPhone: false, synced: false, transcribed: false, failed: false, current: 'deleted' });
  });
});

describe('languages', () => {
  it('toggles, keeping at least one', () => {
    expect(toggleLanguage(['ko', 'en'], 'ko')).toEqual(['en']);
    expect(toggleLanguage(['en'], 'en')).toEqual(['en']);
    expect(toggleLanguage(['en'], 'ko')).toEqual(['en', 'ko']);
  });
  it('moves within bounds', () => {
    expect(moveLanguage(['ko', 'en'], 'en', -1)).toEqual(['en', 'ko']);
    expect(moveLanguage(['ko', 'en'], 'ko', -1)).toEqual(['ko', 'en']);
    expect(moveLanguage(['ko', 'en'], 'en', 1)).toEqual(['ko', 'en']);
  });
  it('migrates and normalises', () => {
    expect(migrateLegacyLanguage('en')).toEqual(['en', 'ko']);
    expect(migrateLegacyLanguage('auto')).toEqual(['ko', 'en']);
    expect(migrateLegacyLanguage(null)).toEqual(['ko', 'en']);
    expect(normaliseLanguages(['en', 'en', 'xx1', 5, 'ja'])).toEqual(['en', 'ja']);
    expect(normaliseLanguages('bad')).toEqual(['ko', 'en']);
  });
  it('memo_created languages stay canonical-safe', () => {
    expect(canonicalJson({ languages: ['ko', 'en'] })).toBe('{"languages":["ko","en"]}');
  });
});
