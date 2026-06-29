import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/authStore';

/** Payload pushed by the backend's SyncHub when a sync completes. */
export interface SyncCompletedEvent {
  kind: 'activity' | 'garmin';
  count?: number | null;
}

let connection: HubConnection | null = null;
// Tracks an in-flight start() so stopSyncHub can wait for it to settle. Calling stop()
// while start() is still pending throws "Failed to start the HttpConnection before stop()
// was called" — serializing the two avoids that race (e.g. on rapid auth/effect churn).
let starting: Promise<void> | null = null;

/**
 * Opens (or reuses) the SignalR connection to the backend SyncHub and invokes `onSync` for every
 * "SyncCompleted" event. Authenticates with the JWT from the auth store and reconnects automatically.
 * React Native has no native WebSocket header support, so the JWT goes via the access_token query
 * param (the backend reads it for /api/hubs/* requests).
 */
export async function startSyncHub(onSync: (event: SyncCompletedEvent) => void): Promise<void> {
  if (connection || starting) return;

  const conn = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/sync`, {
      accessTokenFactory: () => useAuthStore.getState().token ?? '',
      // Skip negotiation and connect straight over WebSockets: the JWT then rides as the
      // access_token query param (which the backend reads for /api/hubs/*). This avoids the
      // negotiate POST, whose header-based auth was returning 401 in React Native.
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  conn.on('SyncCompleted', (event: SyncCompletedEvent) => onSync(event));

  starting = conn.start()
    .then(() => {
      connection = conn;
    })
    .catch((err) => {
      // Real-time is best-effort; pull-to-refresh and foreground refetch still work.
      console.warn('SyncHub connection failed', err);
    })
    .finally(() => {
      starting = null;
    });

  await starting;
}

/** True when the hub is currently connected. */
export function isSyncHubConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
}

/** Closes the SignalR connection (e.g. on logout). Waits for any in-flight start first. */
export async function stopSyncHub(): Promise<void> {
  if (starting) {
    try { await starting; } catch { /* ignore */ }
  }
  if (!connection) return;
  const conn = connection;
  connection = null;
  if (conn.state !== HubConnectionState.Disconnected) {
    try {
      await conn.stop();
    } catch {
      // ignore stop errors
    }
  }
}
