import { create } from 'zustand';
import type { AppVersionManifest } from '../services/appUpdate';

type UpdateStatus = 'idle' | 'downloading' | 'installing' | 'error';

interface UpdateState {
  /** Latest published manifest, or null until checked. */
  manifest: AppVersionManifest | null;
  /** True when manifest advertises a newer versionCode than the running APK. */
  available: boolean;
  status: UpdateStatus;
  /** Download progress 0..1 while status === 'downloading'. */
  progress: number;
  /** User dismissed the banner this session; don't show again until next launch. */
  dismissed: boolean;
  setAvailable: (manifest: AppVersionManifest) => void;
  setStatus: (status: UpdateStatus) => void;
  setProgress: (progress: number) => void;
  dismiss: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  manifest: null,
  available: false,
  status: 'idle',
  progress: 0,
  dismissed: false,
  setAvailable: (manifest) => set({ manifest, available: true }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  dismiss: () => set({ dismissed: true }),
}));
