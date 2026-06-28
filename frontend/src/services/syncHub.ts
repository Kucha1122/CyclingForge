import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';

/** Payload pushed by the backend's SyncHub when a sync completes. */
export interface SyncCompletedEvent {
  kind: 'activity' | 'garmin';
  count?: number | null;
}

let connection: HubConnection | null = null;

/**
 * Opens (or reuses) the SignalR connection to the backend SyncHub and invokes `onSync` for every
 * "SyncCompleted" event. The connection authenticates with the current JWT from localStorage and
 * reconnects automatically. Safe to call repeatedly — only one connection is kept.
 */
export async function startSyncHub(onSync: (event: SyncCompletedEvent) => void): Promise<void> {
  if (connection) return;

  connection = new HubConnectionBuilder()
    // Same-origin path proxied to the backend (Vite forwards /api in dev).
    // Skip negotiation and connect straight over WebSockets so the JWT rides as the
    // access_token query param (the backend reads it for /api/hubs/*), matching mobile.
    .withUrl('/api/hubs/sync', {
      accessTokenFactory: () => localStorage.getItem('token') ?? '',
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on('SyncCompleted', (event: SyncCompletedEvent) => onSync(event));

  try {
    await connection.start();
  } catch (err) {
    // Don't let a failed real-time connection break the app; manual refresh still works.
    console.warn('SyncHub connection failed', err);
  }
}

/** Closes the SignalR connection (e.g. on logout). */
export async function stopSyncHub(): Promise<void> {
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
