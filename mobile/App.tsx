import './global.css';
import './src/i18n';
import React, { useEffect } from 'react';
import { StatusBar, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/stores/authStore';
import { useThemeStore } from './src/stores/themeStore';
import { useSyncStore } from './src/stores/syncStore';
import { startSyncHub, stopSyncHub, isSyncHubConnected, type SyncCompletedEvent } from './src/services/syncHub';
import { SyncToast } from './src/components/SyncToast';
import { RootNavigator } from './src/navigation/RootNavigator';

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
    primary: '#3b82f6',
  },
};

const CyclingDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    border: '#334155',
    primary: '#60a5fa',
  },
};

export default function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation('common');

  // Drive NativeWind's `dark:` variant from the in-app theme toggle (otherwise it
  // follows the OS appearance and the toggle wouldn't switch Tailwind classes).
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  // Real-time refresh: while authenticated, keep a SignalR connection open. On a "SyncCompleted"
  // event bump syncVersion (so screens refetch) and show an in-app toast. On returning to the
  // foreground, reconnect if needed and refetch once to catch syncs missed while backgrounded.
  useEffect(() => {
    if (!isAuthenticated) return;

    const onSync = (event: SyncCompletedEvent) => {
      const { notifySynced, showToast } = useSyncStore.getState();
      notifySynced();
      if (event.kind === 'activity') {
        showToast(
          event.count && event.count > 0
            ? t('toastNewActivityCount', { count: event.count })
            : t('toastNewActivity'),
        );
      } else if (event.kind === 'garmin') {
        showToast(t('toastGarminSynced'));
      }
    };

    void startSyncHub(onSync);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!isSyncHubConnected()) void startSyncHub(onSync);
        useSyncStore.getState().notifySynced();
      }
    });

    return () => {
      subscription.remove();
      void stopSyncHub();
    };
  }, [isAuthenticated, t]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={isDark ? CyclingDarkTheme : LightTheme}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <RootNavigator />
          <SyncToast />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
