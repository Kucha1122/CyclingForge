import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const login = useAuthStore((s) => s.login);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) return;
    setLoading(true);
    setError('');
    try {
      await authApi.register({ firstName, lastName, email, password });
      const { data } = await authApi.login(email, password, true);
      login(data, true);
    } catch {
      setError(t('registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-slate-900"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-8">
        <Text className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-8">
          {t('signUp')}
        </Text>

        {error ? (
          <View className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mb-4">
            <Text className="text-red-600 dark:text-red-400 text-center">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('firstName')}</Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={firstName}
          onChangeText={setFirstName}
          autoCorrect={false}
        />

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('lastName')}</Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={lastName}
          onChangeText={setLastName}
          autoCorrect={false}
        />

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('email')}</Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('password')}</Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-6 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-3.5 items-center"
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">{t('signUp')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="mt-6 mb-8 items-center" onPress={() => navigation.goBack()}>
          <Text className="text-blue-600 dark:text-blue-400">{t('alreadyHaveAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
