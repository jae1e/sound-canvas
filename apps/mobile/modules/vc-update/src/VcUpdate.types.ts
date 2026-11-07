// Contract between the Kotlin module (VcUpdate) and the app's TypeScript code.
// Server side: docs/products/voice-life-companion/coach-server-api.md section 2.
// Ported from apps/field-log/modules/fl-native (Updates.kt, core/DownloadRules.kt); keep the behaviour identical.

export interface AppInfo {
  packageName: string;
  versionName: string;
  /** PackageInfo.longVersionCode. */
  versionCode: number;
}

/** Progress of downloadFile(), at most about 5 Hz, plus a final event. */
export interface DownloadEvent {
  id: string;
  state: 'running' | 'done' | 'error' | 'cancelled';
  bytes: number;
  totalBytes: number;
  error?: string;
}

export type VcUpdateModuleEvents = {
  onDownload: (e: DownloadEvent) => void;
};
