import { NativeModule, requireNativeModule } from 'expo';

import type { AppInfo, VcUpdateModuleEvents } from './VcUpdate.types';

declare class VcUpdateModule extends NativeModule<VcUpdateModuleEvents> {
  /** This app's package, versionName and versionCode. */
  getAppInfo(): Promise<AppInfo>;
  /**
   * Downloads url (OkHttp, with the given headers) into the app cache as `updates/<fileName>`, resuming with
   * `Range` when a partial file exists, emitting onDownload. Verifies sha256 (lowercase hex) at the end;
   * on mismatch it deletes the file and rejects with ERR_HASH. Resolves with the absolute path.
   * Rejects with ERR_BUSY while another download runs, ERR_CANCELLED after cancelDownload.
   */
  downloadFile(id: string, url: string, headers: Record<string, string>, fileName: string, sha256: string): Promise<string>;
  cancelDownload(id: string): Promise<void>;
  /** PackageManager.canRequestPackageInstalls(). */
  canInstallPackages(): Promise<boolean>;
  /** Opens Settings → Install unknown apps for this app. */
  openInstallPermissionSettings(): Promise<void>;
  /** Starts the system installer for an APK under cacheDir/updates (FileProvider URI). Resolves once launched. */
  installApk(path: string): Promise<void>;
  /** Deletes downloaded APKs whose versionCode <= this app's (or all when all = true) and stale .part files. */
  cleanupUpdates(all?: boolean): Promise<number>;
}

export default requireNativeModule<VcUpdateModule>('VcUpdate');
