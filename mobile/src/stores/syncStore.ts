import { create } from 'zustand';

interface SyncState {
  /** Increments on every completed sync. Add it to a screen's data-fetching
   *  useEffect deps to auto-refresh when a sync happens elsewhere. */
  syncVersion: number;
  /** Transient message shown by <SyncToast/>; null when nothing to show. */
  toastMessage: string | null;
  /** Bump syncVersion so subscribed screens refetch. */
  notifySynced: () => void;
  /** Show an in-app toast message. */
  showToast: (message: string) => void;
  /** Clear the current toast. */
  clearToast: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncVersion: 0,
  toastMessage: null,
  notifySynced: () => set((s) => ({ syncVersion: s.syncVersion + 1 })),
  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
}));
