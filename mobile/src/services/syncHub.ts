import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

/** Payload pushed by the backend's SyncHub when a sync completes. */
export interface SyncCompletedEvent {
  kind: 'activity' | 'garmin';
  count?: number | null;
}

let connection: HubConnection | null = null;

/**
 * Opens (or reuses) the SignalR connection to the backend SyncHub and invokes `onSync` for every
 * "SyncCompleted" event. Authenticates with the JWT from SecureStore and reconnects automatically.
 * React Native has no native WebSocket header support, so the JWT goes via the access_token query
 * param (the backend reads it for /api/hubs/* requests).
 */
export async function startSyncHub(onSync: (event: SyncCompletedEvent) => void): Promise<void> {
  if (connection) return;

  connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/sync`, {
      accessTokenFactory: () => SecureStore.getItem('token') ?? '',
      // Prefer WebSockets but allow LongPolling fallback (RN has no EventSource for SSE).
      // Negotiation runs so the transport can degrade gracefully if WS is blocked upstream.
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on('SyncCompleted', (event: SyncCompletedEvent) => onSync(event));

  try {
    await connection.start();
  } catch (err) {
    // Real-time is best-effort; pull-to-refresh and foreground refetch still work.
    console.warn('SyncHub connection failed', err);
  }
}

/** True when the hub is currently connected. */
export function isSyncHubConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
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
