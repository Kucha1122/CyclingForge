import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AuthResultDto } from '@cyclingforge/shared';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  rememberMe: boolean;
  isAuthenticated: boolean;
  login: (result: AuthResultDto, rememberMe: boolean) => void;
  /** Replace tokens after a silent refresh (persisted only for remember-me sessions). */
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

const DURABLE_KEYS = ['token', 'refreshToken', 'userId', 'email', 'rememberMe'];

function clearDurable() {
  DURABLE_KEYS.forEach((k) => SecureStore.deleteItemAsync(k));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  userId: null,
  email: null,
  rememberMe: true,
  isAuthenticated: false,

  login: (result, rememberMe) => {
    if (rememberMe) {
      SecureStore.setItem('token', result.token);
      SecureStore.setItem('refreshToken', result.refreshToken);
      SecureStore.setItem('userId', result.userId);
      SecureStore.setItem('email', result.email);
      SecureStore.setItem('rememberMe', 'true');
    } else {
      // Session-only: keep tokens in memory; ensure no stale durable session lingers.
      clearDurable();
    }
    set({
      token: result.token,
      refreshToken: result.refreshToken,
      userId: result.userId,
      email: result.email,
      rememberMe,
      isAuthenticated: true,
    });
  },

  setTokens: (token, refreshToken) => {
    if (get().rememberMe) {
      SecureStore.setItem('token', token);
      SecureStore.setItem('refreshToken', refreshToken);
    }
    set({ token, refreshToken });
  },

  logout: () => {
    clearDurable();
    set({ token: null, refreshToken: null, userId: null, email: null, isAuthenticated: false });
  },

  hydrate: () => {
    // Only remember-me sessions are persisted; session-only logins require re-auth after restart.
    const token = SecureStore.getItem('token');
    const refreshToken = SecureStore.getItem('refreshToken');
    const userId = SecureStore.getItem('userId');
    const email = SecureStore.getItem('email');
    if (token && refreshToken && userId) {
      set({ token, refreshToken, userId, email: email ?? null, rememberMe: true, isAuthenticated: true });
    }
  },
}));
