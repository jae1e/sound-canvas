import type { JournalRecord, Route } from '../../modules/fl-native/src/FlNative.types';
import type { EventType } from './events';

export interface MappedEvent {
  type: EventType;
  payload: Record<string, unknown>;
  wallMs: number;
  elapsedUs: number;
  bootCount: number;
  memoId: string;
}

export interface MappedObject {
  sha256: string;
  path: string;
  mime: string;
  bytes: number;
}

export function routeToWire(r: Route): Record<string, unknown> {
  return {
    type: r.type,
    product_name: r.productName,
    address_hash: r.addressHash,
    device_id: r.deviceId,
  };
}

/** Journal record (camelCase, native) to an api-v0 event (snake_case). */
export function journalRecordToEvent(r: JournalRecord): MappedEvent {
  const base = { wallMs: r.wallMs, elapsedUs: r.elapsedUs, bootCount: r.bootCount, memoId: r.memoId };
  switch (r.kind) {
    case 'recording_started':
      return {
        ...base,
        type: 'recording_started',
        payload: {
          memo_id: r.memoId,
          recording_id: r.recordingId,
          route: routeToWire(r.route),
          source: r.source,
          sample_rate: r.sampleRate,
          effects: { ns: r.effects.ns, agc: r.effects.agc, aec: r.effects.aec },
          location: r.location,
        },
      };
    case 'segment_closed':
      return {
        ...base,
        type: 'segment_closed',
        payload: {
          memo_id: r.memoId,
          recording_id: r.recordingId,
          segment_id: r.segmentId,
          index: r.index,
          object_sha256: r.sha256,
          bytes: r.bytes,
          format: 'wav_pcm16_16k_mono',
          start_elapsed_us: r.startElapsedUs,
          end_elapsed_us: r.endElapsedUs,
          start_wall_ms: r.startWallMs,
          duration_ms: r.durationMs,
          peak_dbfs_x100: r.peakDbfsX100,
          clipped_samples: r.clippedSamples,
          hf_ratio_4k_ppm: r.hfRatio4kPpm,
          flags: r.flags,
          recovered: r.recovered,
        },
      };
    case 'route_changed':
      return {
        ...base,
        type: 'route_changed',
        payload: { memo_id: r.memoId, recording_id: r.recordingId, route: routeToWire(r.route) },
      };
    case 'recording_stopped':
      return {
        ...base,
        type: 'recording_stopped',
        payload: { memo_id: r.memoId, recording_id: r.recordingId, reason: r.reason, location: r.location },
      };
  }
}

export function journalRecordObject(r: JournalRecord): MappedObject | null {
  if (r.kind !== 'segment_closed') return null;
  return { sha256: r.sha256, path: r.path, mime: 'audio/wav', bytes: r.bytes };
}
