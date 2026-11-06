export interface ClockExchange {
  sendWallMs: number;
  sendElapsedUs: number;
  recvWallMs: number;
  recvElapsedUs: number;
  serverRecvMs: number;
  serverSendMs: number;
}

export interface ClockResult {
  /** Server time minus device time, in ms (positive = device clock is behind). */
  offsetMs: number;
  rttMs: number;
  serverMs: number;
}

/** api-v0 /v1/clock: offset = ((server_recv - send) + (server_send - recv)) / 2. */
export function computeClock(x: ClockExchange): ClockResult {
  const offset = (x.serverRecvMs - x.sendWallMs + (x.serverSendMs - x.recvWallMs)) / 2;
  // Round trip from the monotonic clock, minus the server's processing time.
  const rtt = (x.recvElapsedUs - x.sendElapsedUs) / 1000 - (x.serverSendMs - x.serverRecvMs);
  return {
    offsetMs: Math.round(offset),
    rttMs: Math.max(0, Math.round(rtt)),
    serverMs: x.serverSendMs,
  };
}
