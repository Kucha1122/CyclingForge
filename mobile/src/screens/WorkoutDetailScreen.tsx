import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { WorkoutDto } from '@cyclingforge/shared';
import { workoutsApi, usersApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { IntervalChart } from '../components/workoutViz';
import { CATEGORY_HEX, CATEGORY_I18N, workoutTitle } from '../components/workoutCard';
import { formatDuration } from '../utils/format';
import type { WorkoutDetailScreenProps } from '../navigation/types';

const STEP_TYPE_I18N: Record<string, string> = {
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

function powerLabel(low: number, high: number): string {
  return low === high ? `${Math.round(high * 100)}%` : `${Math.round(low * 100)}–${Math.round(high * 100)}%`;
}
function wattLabel(low: number, high: number, ftp: number): string {
  return low === high ? `${Math.round(high * ftp)}W` : `${Math.round(low * ftp)}–${Math.round(high * ftp)}W`;
}

export function WorkoutDetailScreen({ navigation, route }: WorkoutDetailScreenProps) {
  const { id } = route.params;
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;
  const userId = useAuthStore((s) => s.userId);

  const [workout, setWorkout] = useState<WorkoutDto | null>(null);
  const [ftp, setFtp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 64);
  const onChartLayout = useCallback((e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width), []);

  useEffect(() => {
    workoutsApi.getById(id).then(({ data }) => setWorkout(data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    usersApi.getProfile(userId).then((r) => setFtp(r.data.functionalThresholdPower)).catch(() => {});
  }, [userId]);

  const isUserWorkout = workout?.source === 'UserCreated' || workout?.source === 'Imported';
  const canDelete = workout && (isUserWorkout || workout.source === 'System' || workout.source === 'Generated');

  useLayoutEffect(() => {
    navigation.setOptions({ title: workout ? workoutTitle(workout.name, t) : '' });
  }, [navigation, workout, t]);

  const handleCopy = async () => {
    setCopying(true);
    try {
      const { data: newId } = await workoutsApi.copy(id);
      navigation.replace('WorkoutCreator', { id: newId });
    } catch { /* ignore */ } finally { setCopying(false); }
  };

  const handleDelete = () => {
    if (!workout) return;
    Alert.alert(t('deleteWorkout'), t('deleteWorkoutConfirm', { name: workout.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => { try { await workoutsApi.delete(id); navigation.goBack(); } catch { /* ignore */ } },
      },
    ]);
  };

  if (loading) {
    return <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center"><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }
  if (!workout) {
    return <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center"><Text className="text-slate-400">{t('workoutNotFound')}</Text></View>;
  }

  const color = CATEGORY_HEX[workout.category] ?? '#64748b';
  const sortedSteps = [...workout.steps].sort((a, b) => a.order - b.order);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Title row + action icons in top-right corner */}
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-2xl font-bold text-slate-900 dark:text-white pr-3">{workoutTitle(workout.name, t)}</Text>
          <View className="flex-row items-center gap-2">
            {isUserWorkout && (
              <TouchableOpacity
                onPress={() => navigation.navigate('WorkoutCreator', { id })}
                accessibilityLabel={t('edit')}
                className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-700"
              >
                <Ionicons name="create-outline" size={18} color="#475569" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleCopy}
              disabled={copying}
              accessibilityLabel={t('copyWorkout')}
              className="w-10 h-10 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-900/40"
              style={{ opacity: copying ? 0.5 : 1 }}
            >
              <Ionicons name="copy-outline" size={18} color="#059669" />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                accessibilityLabel={t('delete')}
                className="w-10 h-10 rounded-full items-center justify-center bg-red-50 dark:bg-red-900/40"
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Badges */}
        <View className="flex-row flex-wrap gap-2 mt-2">
          <View style={{ backgroundColor: color + '22' }} className="rounded-full px-3 py-1">
            <Text style={{ color }} className="text-sm font-medium">{t(CATEGORY_I18N[workout.category] ?? 'categoryMixed')}</Text>
          </View>
          <View className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1">
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{workout.targetZone}</Text>
          </View>
          <View className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1">
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {workout.source === 'Imported' ? t('imported') : workout.source === 'UserCreated' ? t('custom') : workout.source === 'System' ? t('sourceSystem') : workout.source}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mt-5">
          {[
            { value: `${workout.durationMinutes} ${tCommon('min')}`, label: t('duration') },
            { value: `${workout.estimatedTSS}`, label: t('estimatedTSS') },
            { value: `${workout.steps.length}`, label: t('steps') },
          ].map((s) => (
            <View key={s.label} className="flex-1 items-center rounded-2xl bg-white dark:bg-slate-800 py-4 shadow-sm">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        {workout.description ? (
          <View className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">{t('description')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">{workout.description}</Text>
          </View>
        ) : null}

        {/* Profile chart */}
        <View className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{t('workoutProfile')}</Text>
          <View onLayout={onChartLayout}>
            <IntervalChart steps={workout.steps} width={chartWidth} height={200} ftp={ftp ?? undefined} />
          </View>
        </View>

        {/* Steps list */}
        <View className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">{t('steps')}</Text>
            {ftp && ftp > 0 ? (
              <View className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1">
                <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">FTP: {ftp}W</Text>
              </View>
            ) : null}
          </View>
          {sortedSteps.map((step) => (
            <View key={step.id} className="flex-row items-center py-2.5 border-b border-slate-100 dark:border-slate-700">
              <Text className="w-6 text-xs text-slate-400">{step.order}</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-900 dark:text-white">{t(STEP_TYPE_I18N[step.type] ?? step.type)}</Text>
                {step.type === 'Intervals' && step.repeat ? (
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {step.repeat}× ({formatDuration(step.onDurationSeconds ?? 0)} / {formatDuration(step.offDurationSeconds ?? 0)})
                  </Text>
                ) : (
                  <Text className="text-xs text-slate-400 mt-0.5">{formatDuration(step.durationSeconds)}</Text>
                )}
              </View>
              <View className="items-end">
                <Text className="text-sm text-slate-600 dark:text-slate-300">{powerLabel(step.powerLow, step.powerHigh)}</Text>
                {ftp && ftp > 0 ? (
                  <Text className="text-xs font-medium text-blue-500">{wattLabel(step.powerLow, step.powerHigh, ftp)}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
