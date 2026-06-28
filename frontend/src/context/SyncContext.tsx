import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { startSyncHub, stopSyncHub, type SyncCompletedEvent } from '../services/syncHub';

interface SyncContextType {
  /** Increments on every completed synchronization. Add it to a data-fetching
   *  useEffect dependency array to auto-refresh after a sync done elsewhere. */
  syncVersion: number;
  /** Call after a sync completes to notify all pages that data changed. */
  notifySynced: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncVersion, setSyncVersion] = useState(0);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { t } = useTranslation('common');

  const notifySynced = useCallback(() => {
    setSyncVersion((prev) => prev + 1);
  }, []);

  // Connect to the backend SignalR hub while authenticated. On a real-time "SyncCompleted" event
  // (Strava webhook / Garmin scheduled sync), bump syncVersion so open pages refetch and show a toast.
  useEffect(() => {
    if (!isAuthenticated) return;

    const onSync = (event: SyncCompletedEvent) => {
      notifySynced();
      if (event.kind === 'activity') {
        toast.info(
          event.count && event.count > 0
            ? t('toastNewActivityCount', { count: event.count })
            : t('toastNewActivity'),
        );
      } else if (event.kind === 'garmin') {
        toast.info(t('toastGarminSynced'));
      }
    };

    void startSyncHub(onSync);
    return () => {
      void stopSyncHub();
    };
  }, [isAuthenticated, notifySynced, toast, t]);

  return (
    <SyncContext.Provider value={{ syncVersion, notifySynced }}>
      {children}
    </SyncContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally exported from same file as provider
export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (ctx === undefined) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
