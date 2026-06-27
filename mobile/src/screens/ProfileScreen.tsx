import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { UserProfile } from '@cyclingforge/shared';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { usersApi } from '../services/api';
import i18n from '../i18n';

export function ProfileScreen() {
  const { t } = useTranslation('profile');
  const tCommon = useTranslation('common').t;
  const tNav = useTranslation('nav').t;
  const { userId, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (userId) {
      usersApi.getProfile(userId).then(({ data }) => setProfile(data)).catch(() => {});
    }
  }, [userId]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl');
  };

  const ftp = profile?.functionalThresholdPower;
  const weight = profile?.weightKg;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-6">{t('title')}</Text>

        {profile && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">{profile.firstName} {profile.lastName}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</Text>

            <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-4 mb-1">{t('trainingMetrics')}</Text>
            <Field label={t('ftpLabel')} value={ftp != null ? `${ftp} ${t('watts')}` : '–'} />
            <Field label={t('weightLabel')} value={weight != null ? `${weight} ${t('kg')}` : '–'} />
            {ftp != null && weight != null && (
              <Field label={t('powerToWeight')} value={`${(ftp / weight).toFixed(2)} W/${t('kg')}`} />
            )}
            <Field label={t('maxHrLabel')} value={profile.maxHeartRate != null ? `${profile.maxHeartRate} ${t('bpm')}` : '–'} />
            <Field label={t('lthrLabel')} value={profile.lactateThresholdHeartRate != null ? `${profile.lactateThresholdHeartRate} ${t('bpm')}` : '–'} />
            <Field label={t('restingHrLabel')} value={profile.restingHeartRate != null ? `${profile.restingHeartRate} ${t('bpm')}` : '–'} />
          </View>
        )}

        {/* Settings */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{tCommon('settings')}</Text>
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-slate-700 dark:text-slate-300">{tCommon('themeDark')}</Text>
            <Switch value={theme === 'dark'} onValueChange={toggleTheme} />
          </View>
          <TouchableOpacity className="flex-row justify-between items-center py-3" onPress={toggleLanguage}>
            <Text className="text-sm text-slate-700 dark:text-slate-300">{tNav('language')}</Text>
            <Text className="text-sm font-medium text-blue-600">{i18n.language === 'pl' ? tNav('polish') : tNav('english')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-8 items-center" onPress={logout}>
          <Text className="text-red-600 dark:text-red-400 font-semibold">{tCommon('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-700">
      <Text className="text-sm text-slate-600 dark:text-slate-400 flex-1 mr-2">{label}</Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}
