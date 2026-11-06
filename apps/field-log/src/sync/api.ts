import type { EventEnvelope, PostResponse } from '../core';
import type { TranscriptSegmentWire } from '../db/transcripts';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ServerConfig {
  baseUrl: string;
  token?: string | null;
}

export const normaliseBaseUrl = (u: string) => u.trim().replace(/\/+$/, '');
export const liveUrl = (baseUrl: string) => normaliseBaseUrl(baseUrl).replace(/^http/i, 'ws') + '/v1/live';

async function request(cfg: ServerConfig, method: string, path: string, body?: unknown, timeoutMs = 8000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
    return await fetch(normaliseBaseUrl(cfg.baseUrl) + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch (e) {
    throw new HttpError(0, ctl.signal.aborted ? 'timeout' : `network: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface Health {
  server_time_ms: number;
  version: string;
  final_engine: string;
  streaming_engine: string;
  streaming_available: boolean;
}

export const apiHealth = async (c: ServerConfig) => json<Health>(await request(c, 'GET', '/v1/health', undefined, 4000));

export interface EnrolBody {
  pairing_code: string;
  device: { model: string; manufacturer: string; os_version: string; app_version: string; install_id: string };
}

export async function apiEnrol(c: ServerConfig, body: EnrolBody) {
  const res = await request(c, 'POST', '/v1/enroll', body);
  if (res.status === 403) throw new HttpError(403, 'Pairing code is unknown, expired or already used');
  return json<{ device_id: string; token: string; server_time_ms: number }>(res);
}

export interface ClockResponse {
  client_send_wall_ms: number;
  client_send_elapsed_us: number;
  server_recv_ms: number;
  server_send_ms: number;
}

export const apiClock = async (c: ServerConfig, sendWallMs: number, sendElapsedUs: number) =>
  json<ClockResponse>(await request(c, 'POST', '/v1/clock', { client_send_wall_ms: sendWallMs, client_send_elapsed_us: sendElapsedUs }, 4000));

export async function apiHasObject(c: ServerConfig, sha256: string): Promise<boolean> {
  const res = await request(c, 'HEAD', `/v1/objects/${sha256}`);
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  throw new HttpError(res.status, `HEAD object: HTTP ${res.status}`);
}

export const objectUrl = (c: ServerConfig, sha256: string) => `${normaliseBaseUrl(c.baseUrl)}/v1/objects/${sha256}`;

export const apiPostEvents = async (c: ServerConfig, events: EventEnvelope[]) =>
  json<PostResponse>(await request(c, 'POST', '/v1/events', { events }, 20000));

export const apiTranscriptsSince = async (c: ServerConfig, sinceServerMs: number, waitS?: number) =>
  json<{ segments: TranscriptSegmentWire[]; now_server_ms: number }>(
    await request(
      c,
      'GET',
      `/v1/transcripts?since_server_ms=${Math.max(0, Math.floor(sinceServerMs))}${waitS ? `&wait_s=${waitS}` : ''}`,
      undefined,
      waitS ? (waitS + 10) * 1000 : 8000,
    ),
  );
