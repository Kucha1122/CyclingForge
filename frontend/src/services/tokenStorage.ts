import type { AuthResultDto } from '../types/auth';

// Persisted auth state. "Remember me" sessions live in localStorage (survive restart);
// non-remembered sessions live in sessionStorage (cleared when the tab/browser closes).
const KEYS = ['token', 'refreshToken', 'user', 'rememberMe'] as const;

function storageFor(durable: boolean): Storage {
  return durable ? localStorage : sessionStorage;
}

function read(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export const tokenStorage = {
  getToken: (): string | null => read('token'),
  getRefreshToken: (): string | null => read('refreshToken'),

  getUser: (): AuthResultDto | null => {
    const raw = read('user');
    return raw ? (JSON.parse(raw) as AuthResultDto) : null;
  },

  isRemembered: (): boolean => read('rememberMe') === 'true',

  /** Stores a freshly-issued session in the storage matching the rememberMe choice. */
  setSession: (result: AuthResultDto, rememberMe: boolean): void => {
    const store = storageFor(rememberMe);
    const other = storageFor(!rememberMe);
    KEYS.forEach((k) => other.removeItem(k));
    store.setItem('token', result.token);
    store.setItem('refreshToken', result.refreshToken);
    store.setItem('user', JSON.stringify(result));
    store.setItem('rememberMe', String(rememberMe));
  },

  /** Updates only the rotated tokens after a silent refresh, keeping the same storage. */
  updateTokens: (token: string, refreshToken: string): void => {
    const store = storageFor(tokenStorage.isRemembered());
    store.setItem('token', token);
    store.setItem('refreshToken', refreshToken);
  },

  clear: (): void => {
    KEYS.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },
};
