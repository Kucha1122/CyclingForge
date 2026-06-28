import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncStore } from '../stores/syncStore';

const VISIBLE_MS = 4000;

/**
 * Lightweight top banner shown when a real-time sync arrives. Reads the transient message from
 * syncStore, fades in, auto-dismisses, and clears the store. Rendered once at the app root.
 */
export const SyncToast = () => {
  const message = useSyncStore((s) => s.toastMessage);
  const clearToast = useSyncStore((s) => s.clearToast);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => clearToast(),
      );
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [message, opacity, clearToast]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 8, opacity }]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    // Static shadow only — never toggled conditionally (mobile NativeWind crash workaround).
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
