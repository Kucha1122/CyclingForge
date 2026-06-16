import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

  const notifySynced = useCallback(() => {
    setSyncVersion((prev) => prev + 1);
  }, []);

  return (
    <SyncContext.Provider value={{ syncVersion, notifySynced }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (ctx === undefined) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
