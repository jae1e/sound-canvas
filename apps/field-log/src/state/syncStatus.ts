import { create } from 'zustand';

export type Connection = 'unenrolled' | 'connecting' | 'online' | 'offline' | 'error';

export interface SyncStatus {
  connection: Connection;
  syncing: boolean;
  error: string | null;
  /** Permanent rejection that stops event posting until "Sync now". */
  stuck: string | null;
  lastSyncMs: number | null;
  clock: { offsetMs: number; rttMs: number; atMs: number } | null;
  pendingEvents: number;
  pendingObjects: number;
  objectErrors: number;
  streamingAvailable: boolean | null;
  serverVersion: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  connection: 'unenrolled',
  syncing: false,
  error: null,
  stuck: null,
  lastSyncMs: null,
  clock: null,
  pendingEvents: 0,
  pendingObjects: 0,
  objectErrors: 0,
  streamingAvailable: null,
  serverVersion: null,
}));

export const setSyncStatus = (p: Partial<SyncStatus>) => useSyncStatus.setState(p);
