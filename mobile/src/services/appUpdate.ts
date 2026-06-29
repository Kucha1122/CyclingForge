import { Platform } from 'react-native';
import * as Application from 'expo-application';
// SDK 54 moved getContentUriAsync + progress downloads out of the new API; both still
// live in the legacy import. See AGENTS.md ("Expo HAS CHANGED").
import * as FileSystem from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import { API_BASE_URL } from '../config';

export interface AppVersionManifest {
  /** Human-readable semver shown in UI, e.g. "1.2.0". */
  version: string;
  /** Android versionCode baked into the APK; the integer we compare against. */
  versionCode: number;
  /** Absolute URL the APK is downloaded from. */
  apkUrl: string;
  /** Optional release notes. */
  notes?: string;
  /** ISO timestamp of when the build was published. */
  releasedAt?: string;
}

/** Fetch the published manifest. Returns null when nothing has been published or on error. */
export async function fetchLatest(): Promise<AppVersionManifest | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/mobile/version`);
    if (!res.ok) return null;
    return (await res.json()) as AppVersionManifest;
  } catch {
    return null;
  }
}

/** True when the manifest advertises a higher versionCode than the running APK (Android only). */
export function isUpdateAvailable(manifest: AppVersionManifest): boolean {
  if (Platform.OS !== 'android') return false;
  const current = Number(Application.nativeBuildVersion ?? 0);
  return Number.isFinite(current) && manifest.versionCode > current;
}

/**
 * Download the APK to cache and hand it to the Android package installer. Same signing key
 * means Android updates in place. `onProgress` receives 0..1. Throws on failure.
 */
export async function downloadAndInstall(
  manifest: AppVersionManifest,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  const target = `${FileSystem.cacheDirectory}cyclingforge-${manifest.versionCode}.apk`;

  const download = FileSystem.createDownloadResumable(
    manifest.apkUrl,
    target,
    {},
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) {
        onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    },
  );

  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error('APK download failed');

  // The installer needs a content:// URI it can read across the app boundary.
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
