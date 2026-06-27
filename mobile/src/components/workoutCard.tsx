import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { WorkoutSummaryDto } from '@cyclingforge/shared';

export const CATEGORY_I18N: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

export const CATEGORY_HEX: Record<string, string> = {
  Recovery: '#10b981', Endurance: '#3b82f6', Tempo: '#f59e0b', SweetSpot: '#f97316',
  Threshold: '#ef4444', VO2Max: '#a855f7', Anaerobic: '#ec4899', Sprint: '#6366f1', Mixed: '#64748b',
};

const WORKOUT_NAME_KEYS: Record<string, string> = {
  'Progressive endurance with ramp finish': 'nameProgressiveEnduranceRamp',
};

export function workoutTitle(name: string, tWorkouts: (k: string) => string): string {
  return WORKOUT_NAME_KEYS[name] ? tWorkouts(WORKOUT_NAME_KEYS[name]) : name;
}

interface Props {
  workout: WorkoutSummaryDto;
  onPress: () => void;
  onDelete?: () => void;
}

/** Library list card — mirrors the web WorkoutCard, tap to open, optional delete. */
export function WorkoutCard({ workout, onPress, onDelete }: Props) {
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;
  const color = CATEGORY_HEX[workout.category] ?? '#64748b';
  const isUserWorkout = workout.source === 'UserCreated' || workout.source === 'Imported';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 text-base font-semibold text-slate-900 dark:text-white pr-2" numberOfLines={2}>
          {workoutTitle(workout.name, t)}
        </Text>
        {onDelete && (isUserWorkout || workout.source === 'System' || workout.source === 'Generated') && (
          <TouchableOpacity onPress={onDelete} hitSlop={8} className="p-1 -mt-1 -mr-1">
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
        <View style={{ backgroundColor: color + '22' }} className="rounded-full px-2.5 py-0.5">
          <Text style={{ color }} className="text-xs font-medium">{t(CATEGORY_I18N[workout.category] ?? 'categoryMixed')}</Text>
        </View>
        <View className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5">
          <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{workout.targetZone}</Text>
        </View>
        {isUserWorkout && (
          <View className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5">
            <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">
              {workout.source === 'Imported' ? t('imported') : t('custom')}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-4 mt-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color="#94a3b8" />
          <Text className="text-sm text-slate-500 dark:text-slate-400">{workout.durationMinutes} {tCommon('min')}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="fitness-outline" size={14} color="#94a3b8" />
          <Text className="text-sm text-slate-500 dark:text-slate-400">{tCommon('tssLabel')} {workout.estimatedTSS}</Text>
        </View>
      </View>

      {workout.tags ? (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {workout.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
            <View key={tag} className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5">
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
