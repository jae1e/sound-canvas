import { getCalendars } from 'expo-localization';
import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import { exifToWallMs, initialLevelMonitor, objectsToSkip, type LocationPayload } from '../core';
import { writeTx } from '../db/db';
import { appendEvent, newId } from '../db/events';
import FlNative, { type LiveLanguage } from '../native';
import { applyStatus, setRoute, useRecorder } from '../state/recorder';
import { useSettings } from '../state/settings';
import { liveUrl } from '../sync/api';
import { triggerSync } from '../sync/engine';
import { fastLocation } from './location';

export type MemoKind = 'photo' | 'image' | 'voice';

const timeZone = () => getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

export function requireEnrolled(): void {
  if (!useSettings.getState().deviceId) throw new Error('NOT_ENROLLED');
}

export async function createMemo(kind: MemoKind, location?: LocationPayload): Promise<string> {
  requireEnrolled();
  const memoId = newId();
  const now = FlNative.clock();
  await writeTx(async (q) => {
    const tz = timeZone();
    await q.runAsync(
      'INSERT INTO memos (memo_id, kind, created_wall_ms, created_elapsed_us, boot_count, tz, location_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
      memoId,
      kind,
      now.wallMs,
      now.elapsedUs,
      now.bootCount,
      tz,
      location ? JSON.stringify(location) : null,
    );
    await appendEvent(q, {
      type: 'memo_created',
      memoId,
      wallMs: now.wallMs,
      elapsedUs: now.elapsedUs,
      bootCount: now.bootCount,
      payload: { memo_id: memoId, kind, tz, retention_class: 'standard', languages: useSettings.getState().languages, location },
    });
  });
  triggerSync();
  return memoId;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heic',
  webp: 'image/webp',
};
const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

function imageTypeOf(asset: ImagePickerAsset): { ext: string; mime: string } {
  const name = asset.fileName ?? asset.uri;
  const ext = (/\.([A-Za-z0-9]+)(?:\?.*)?$/.exec(name)?.[1] ?? '').toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? (asset.mimeType && ALLOWED_MIME.has(asset.mimeType) ? asset.mimeType : undefined);
  if (!mime) throw new Error(`Unsupported image type: ${ext || asset.mimeType || 'unknown'}`);
  return { ext: MIME_BY_EXT[ext] ? ext : mime.split('/')[1], mime };
}

/** Copies the original bytes into app storage, hashes them and records photo_added. */
export async function addPhoto(
  memoId: string,
  asset: ImagePickerAsset,
  source: 'camera' | 'library',
  location?: LocationPayload,
): Promise<void> {
  const { ext, mime } = imageTypeOf(asset);
  const photoId = newId();
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${photoId}.${ext}`);
  new File(asset.uri).copy(dest);
  const sha256 = await FlNative.sha256File(dest.uri);
  const bytes = dest.size;
  const takenWallMs = exifToWallMs(asset.exif?.DateTimeOriginal, asset.exif?.OffsetTimeOriginal);
  const now = FlNative.clock();
  const path = dest.uri.replace(/^file:\/\//, '');
  await writeTx(async (q) => {
    await q.runAsync(
      `INSERT INTO photos (photo_id, memo_id, path, sha256, mime, bytes, width, height, source, taken_wall_ms, created_wall_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      photoId,
      memoId,
      dest.uri,
      sha256,
      mime,
      bytes,
      asset.width || null,
      asset.height || null,
      source,
      takenWallMs ?? null,
      now.wallMs,
    );
    await q.runAsync(
      'INSERT OR IGNORE INTO objects (sha256, path, mime, bytes, memo_id, uploaded) VALUES (?, ?, ?, ?, ?, 0)',
      sha256,
      path,
      mime,
      bytes,
      memoId,
    );
    await appendEvent(q, {
      type: 'photo_added',
      memoId,
      wallMs: now.wallMs,
      elapsedUs: now.elapsedUs,
      bootCount: now.bootCount,
      payload: {
        memo_id: memoId,
        photo_id: photoId,
        object_sha256: sha256,
        mime,
        bytes,
        width: asset.width > 0 ? asset.width : undefined,
        height: asset.height > 0 ? asset.height : undefined,
        source,
        taken_wall_ms: takenWallMs,
        location,
      },
    });
  });
  triggerSync();
}

export async function saveNote(memoId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const now = FlNative.clock();
  await writeTx(async (q) => {
    await q.runAsync('UPDATE memos SET note = ? WHERE memo_id = ?', trimmed, memoId);
    await appendEvent(q, {
      type: 'memo_note',
      memoId,
      wallMs: now.wallMs,
      elapsedUs: now.elapsedUs,
      bootCount: now.bootCount,
      payload: { memo_id: memoId, text: trimmed },
    });
  });
  triggerSync();
}

async function ensureAudioPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const wanted: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (Number(Platform.Version) >= 33) wanted.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  // A chosen (non-default) input may be a Bluetooth headset; routing to it needs BLUETOOTH_CONNECT (API 31+).
  if (useSettings.getState().inputId != null) wanted.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  const res = await PermissionsAndroid.requestMultiple(wanted);
  if (res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('MIC_DENIED');
  }
}

export async function startMemoRecording(memoId: string): Promise<void> {
  const s = useSettings.getState();
  await ensureAudioPermissions();
  await FlNative.stopPlayback().catch(() => undefined);
  // A cached fix only, with a short cap: tap-to-recording must stay within about 2 s (A1).
  const location = await fastLocation(400);
  const recordingId = newId();
  const started = await FlNative.startRecording({
    memoId,
    recordingId,
    preferredInputId: s.inputId ?? undefined,
    source: s.source === 'AUTO' ? undefined : s.source,
    location,
    live:
      s.liveEnabled && s.token
        ? { url: liveUrl(s.serverUrl), token: s.token, language: (s.languages[0] ?? 'ko') as LiveLanguage }
        : undefined,
  });
  applyStatus(await FlNative.getStatus());
  setRoute(started.route);
  useRecorder.setState({ monitor: initialLevelMonitor() });
}

export async function stopMemoRecording(): Promise<void> {
  // Stop at once: waiting for a fresh GPS fix would keep the microphone open after the user tapped Stop.
  const location = await fastLocation(400);
  await FlNative.stopRecording(location);
  applyStatus(await FlNative.getStatus());
}

const toUri = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);

/** Deletes a memo (api-v0 section 8). Throws 'RECORDING' while the memo is being recorded. */
export async function deleteMemo(memoId: string): Promise<void> {
  const rec = useRecorder.getState();
  if (rec.recording && rec.memoId === memoId) throw new Error('RECORDING');
  const status = await FlNative.getStatus();
  if (status.recording && status.memoId === memoId) throw new Error('RECORDING');

  const now = FlNative.clock();
  let files: string[] = [];
  await writeTx(async (q) => {
    const segs = await q.getAllAsync<{ path: string }>('SELECT path FROM segments WHERE memo_id = ?', memoId);
    const photos = await q.getAllAsync<{ path: string }>('SELECT path FROM photos WHERE memo_id = ?', memoId);
    files = [...segs, ...photos].map((r) => r.path);
    await appendEvent(q, {
      type: 'memo_deleted',
      memoId,
      wallMs: now.wallMs,
      elapsedUs: now.elapsedUs,
      bootCount: now.bootCount,
      payload: { memo_id: memoId },
    });
    const others = await q.getAllAsync<{ sha256: string }>(
      `SELECT sha256 FROM photos WHERE memo_id <> ? AND memo_id NOT IN (SELECT memo_id FROM memos WHERE deleted = 1)
       UNION SELECT sha256 FROM segments WHERE memo_id <> ? AND memo_id NOT IN (SELECT memo_id FROM memos WHERE deleted = 1)`,
      memoId,
      memoId,
    );
    const shared = new Set(others.map((o) => o.sha256));
    const pending = await q.getAllAsync<{ sha256: string; memo_id: string | null; uploaded: number }>(
      'SELECT sha256, memo_id, uploaded FROM objects WHERE memo_id = ?',
      memoId,
    );
    const skip = objectsToSkip(
      pending.map((o) => ({ sha256: o.sha256, memoId: o.memo_id, uploaded: o.uploaded === 1 })),
      memoId,
      shared,
    );
    for (const o of skip) await q.runAsync('UPDATE objects SET skipped = 1 WHERE sha256 = ?', o.sha256);
    await q.runAsync('UPDATE memos SET deleted = 1, note = NULL WHERE memo_id = ?', memoId);
    await q.runAsync(
      "UPDATE segments SET t_text = '', t_error = NULL, t_language = NULL WHERE memo_id = ?",
      memoId,
    );
  });
  for (const p of files) {
    try {
      const f = new File(toUri(p));
      if (f.exists) f.delete();
    } catch {
      // already missing or not deletable: nothing more to do
    }
  }
  triggerSync();
}

export async function pauseMemoRecording(): Promise<void> {
  await FlNative.pauseRecording();
  useRecorder.setState({ monitor: initialLevelMonitor() });
  applyStatus(await FlNative.getStatus());
}

export async function resumeMemoRecording(): Promise<void> {
  await FlNative.resumeRecording();
  useRecorder.setState({ monitor: initialLevelMonitor() });
  applyStatus(await FlNative.getStatus());
}
