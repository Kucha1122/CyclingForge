import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '../stores/updateStore';
import { downloadAndInstall } from '../services/appUpdate';

/**
 * Persistent bottom banner shown when a newer APK has been published. Tapping "Install"
 * downloads the APK and hands it to the Android package installer (in-place update). Reads
 * state from updateStore; rendered once at the app root next to <SyncToast/>.
 */
export const UpdateBanner = () => {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const available = useUpdateStore((s) => s.available);
  const dismissed = useUpdateStore((s) => s.dismissed);
  const manifest = useUpdateStore((s) => s.manifest);
  const status = useUpdateStore((s) => s.status);
  const progress = useUpdateStore((s) => s.progress);

  if (!available || dismissed || !manifest) return null;

  const onInstall = async () => {
    const { setStatus, setProgress } = useUpdateStore.getState();
    try {
      setStatus('downloading');
      await downloadAndInstall(manifest, setProgress);
      setStatus('installing');
    } catch {
      setStatus('error');
    }
  };

  const downloading = status === 'downloading';
  const label =
    status === 'error'
      ? t('updateError')
      : downloading
        ? `${t('updateDownloading')} ${Math.round(progress * 100)}%`
        : t('updateAvailable');

  return (
    <View style={[styles.container, { bottom: insets.bottom + 8 }]}>
      <Text style={styles.text} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.actions}>
        {!downloading && (
          <Pressable onPress={() => useUpdateStore.getState().dismiss()} hitSlop={8}>
            <Text style={styles.later}>{t('updateLater')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onInstall}
          disabled={downloading}
          style={styles.installBtn}
          hitSlop={8}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#f1f5f9" />
          ) : (
            <Text style={styles.installText}>{t('updateInstall')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  later: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  installBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  installText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
});
