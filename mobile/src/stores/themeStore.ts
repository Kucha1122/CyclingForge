import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { CHART_COLORS_LIGHT, CHART_COLORS_DARK } from '@cyclingforge/shared';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  chartColors: string[];
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  chartColors: CHART_COLORS_LIGHT,

  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('theme', next);
      return { theme: next, chartColors: next === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT };
    }),

  setTheme: (theme) => {
    AsyncStorage.setItem('theme', theme);
    set({ theme, chartColors: theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT });
  },

  hydrate: () => {
    AsyncStorage.getItem('theme').then((stored) => {
      const theme: Theme = (stored as Theme) ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
      set({ theme, chartColors: theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT });
    });
  },
}));
