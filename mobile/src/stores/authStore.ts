import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AuthResultDto } from '@cyclingforge/shared';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (result: AuthResultDto) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  isAuthenticated: false,

  login: (result) => {
    SecureStore.setItem('token', result.token);
    SecureStore.setItem('userId', result.userId);
    SecureStore.setItem('email', result.email);
    set({
      token: result.token,
      userId: result.userId,
      email: result.email,
      isAuthenticated: true,
    });
  },

  logout: () => {
    SecureStore.deleteItemAsync('token');
    SecureStore.deleteItemAsync('userId');
    SecureStore.deleteItemAsync('email');
    set({
      token: null,
      userId: null,
      email: null,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    const token = SecureStore.getItem('token');
    const userId = SecureStore.getItem('userId');
    const email = SecureStore.getItem('email');
    if (token && userId) {
      set({ token, userId, email: email ?? null, isAuthenticated: true });
    }
  },
}));
