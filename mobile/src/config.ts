// The CyclingForge backend is deployed (with real TLS) behind the Tailscale
// hostname that also serves the web app, with the API mounted under /api.
// The mobile app talks to it directly — no local backend, no LAN IP, no
// self-signed cert handling. Works on any device that can reach the tailnet
// (a physical phone needs the Tailscale app + same tailnet; emulators need
// Tailscale running on the host or a tailnet route).
//
// To test against a locally running backend instead, set LOCAL_DEV = true:
//   - Android emulator reaches the host via the 10.0.2.2 alias on port 5080.
const LOCAL_DEV = false;
const LOCAL_API_URL = 'http://10.0.2.2:5080/api';

const DEPLOYED_API_URL = 'https://k3s-server.tail11891a.ts.net/api';

export const API_BASE_URL = LOCAL_DEV ? LOCAL_API_URL : DEPLOYED_API_URL;
