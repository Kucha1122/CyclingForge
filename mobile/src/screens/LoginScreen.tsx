import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(email, password);
      login(data);
    } catch {
      setError(t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-slate-900"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">
          CyclingForge
        </Text>
        <Text className="text-base text-center text-slate-500 dark:text-slate-400 mb-10">
          {t('enterDetailsLogin')}
        </Text>

        {error ? (
          <View className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mb-4">
            <Text className="text-red-600 dark:text-red-400 text-center">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('email')}
        </Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={email}
          onChangeText={setEmail}
          placeholder={t('placeholderEmail')}
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('password')}
        </Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-6 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={password}
          onChangeText={setPassword}
          placeholder={t('placeholderPassword')}
          placeholderTextColor="#94a3b8"
          secureTextEntry
        />

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-3.5 items-center"
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">{t('login')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() => navigation.navigate('Register')}
        >
          <Text className="text-blue-600 dark:text-blue-400">
            {t('dontHaveAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
