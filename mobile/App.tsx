import './global.css';
import React, { useEffect } from 'react';
import { StatusBar, AppState } from 'react-native';
import i18n from './src/i18n';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/stores/authStore';
import { useThemeStore } from './src/stores/themeStore';
import { useSyncStore } from './src/stores/syncStore';
import { startSyncHub, stopSyncHub, isSyncHubConnected, type SyncCompletedEvent } from './src/services/syncHub';
import { SyncToast } from './src/components/SyncToast';
import { UpdateBanner } from './src/components/UpdateBanner';
import { fetchLatest, isUpdateAvailable } from './src/services/appUpdate';
import { useUpdateStore } from './src/stores/updateStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { installGlobalErrorLogging } from './src/services/clientLogger';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

installGlobalErrorLogging();

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

  // Drive NativeWind's `dark:` variant from the in-app theme toggle (otherwise it
  // follows the OS appearance and the toggle wouldn't switch Tailwind classes).
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  // Brand wordmark font (used by the <Logo/> lockup).
  const [fontsLoaded] = useFonts({ SpaceGrotesk_500Medium, SpaceGrotesk_700Bold, SpaceMono_400Regular });

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  // On launch, check whether a newer signed APK has been published. If so, flag the
  // bottom <UpdateBanner/> so the user can install it in place. No-op on iOS.
  useEffect(() => {
    void (async () => {
      const manifest = await fetchLatest();
      if (manifest && isUpdateAvailable(manifest)) {
        useUpdateStore.getState().setAvailable(manifest);
      }
    })();
  }, []);

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
            ? i18n.t('toastNewActivityCount', { count: event.count })
            : i18n.t('toastNewActivity'),
        );
      } else if (event.kind === 'garmin') {
        showToast(i18n.t('toastGarminSynced'));
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
  }, [isAuthenticated]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer theme={isDark ? CyclingDarkTheme : LightTheme}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <RootNavigator />
            <SyncToast />
            <UpdateBanner />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
