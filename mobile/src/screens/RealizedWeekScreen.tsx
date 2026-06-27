import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { RealizedWeekDto, RealizedDayDto, RealizedActivityDto } from '@cyclingforge/shared';
import { activitiesApi, trainingPreferenceApi } from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { formatDate, formatDuration } from '../utils/format';
import { ZoneBar } from '../components/charts';
import { HR_ZONE_COLORS } from '../components/dashboardCards';
import type { RealizedWeekScreenProps } from '../navigation/types';

const DAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'] as const;

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ISO date for the start of the week containing `date`, given the first weekday
// (0 = Monday .. 6 = Sunday).
function getWeekStart(date: Date, weekStartDay: number): string {
  const d = new Date(date);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  const diff = (dayIndex - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toIsoDate(d);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-slate-50 dark:bg-slate-700/40 rounded-xl py-3 items-center">
        <Text className="text-xl font-bold text-slate-900 dark:text-white">{value}</Text>
        <Text className="text-xs text-slate-400 mt-0.5">{label}</Text>
      </View>
    </View>
  );
}

function ZoneLegend({ zoneSeconds }: { zoneSeconds: number[] }) {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-3">
      {zoneSeconds.map((s, i) =>
        s > 0 ? (
          <View key={i} className="flex-row items-center gap-1.5">
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }} />
            <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">Z{i + 1}</Text>
            <Text className="text-xs text-slate-400">{formatDuration(s)}</Text>
          </View>
        ) : null
      )}
    </View>
  );
}

function ActivityRow({ activity, onPress, tCommon }: { activity: RealizedActivityDto; onPress: () => void; tCommon: (k: string) => string }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-center bg-slate-50 dark:bg-slate-700/40 rounded-xl px-3 py-2.5 mb-2">
      <View className="flex-1 mr-2">
        <Text className="text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>{activity.name}</Text>
        <Text className="text-xs text-slate-400 mt-0.5">
          {formatDuration(activity.durationSeconds)} · {activity.distanceKm.toFixed(1)} km
          {activity.trainingStressScore != null ? ` · ${tCommon('tssLabel')} ${Math.round(activity.trainingStressScore)}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function DayCard({ day, zoneCount, barWidth, onActivityPress, tCommon }: {
  day: RealizedDayDto; zoneCount: number; barWidth: number;
  onActivityPress: (id: string) => void; tCommon: (k: string) => string;
}) {
  const isToday = day.date === toIsoDate(new Date());
  const dayKey = DAY_KEYS[new Date(day.date + 'T00:00:00').getDay()];
  const hasActivities = day.activities.length > 0;
  const hasZones = zoneCount > 0 && day.dailyHrZoneSeconds.some((s) => s > 0);

  // Rest days collapse to a slim muted row to keep the vertical list compact.
  if (!hasActivities) {
    return (
      <View className={`flex-row items-center justify-between rounded-2xl px-4 py-3 mb-3 bg-white dark:bg-slate-800 ${isToday ? 'border-2 border-blue-500' : ''}`}>
        <Text className={`text-sm font-semibold ${isToday ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {tCommon(dayKey)} <Text className="text-xs font-normal text-slate-400">{formatDate(day.date, { day: 'numeric', month: 'short' })}</Text>
        </Text>
        <Text className="text-xs text-slate-400">{tCommon('noActivities')}</Text>
      </View>
    );
  }

  return (
    <View className={`rounded-2xl p-4 mb-3 bg-white dark:bg-slate-800 shadow-sm ${isToday ? 'border-2 border-blue-500' : ''}`}>
      <View className="flex-row items-baseline justify-between mb-2.5">
        <Text className={`text-sm font-bold ${isToday ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>{tCommon(dayKey)}</Text>
        <Text className="text-xs text-slate-400">{formatDate(day.date, { day: 'numeric', month: 'short' })}</Text>
      </View>
      {day.activities.map((a) => (
        <ActivityRow key={a.id} activity={a} onPress={() => onActivityPress(a.id)} tCommon={tCommon} />
      ))}
      {hasZones && (
        <View className="mt-1">
          <View className="rounded-full overflow-hidden">
            <ZoneBar zoneSeconds={day.dailyHrZoneSeconds} width={barWidth} colors={HR_ZONE_COLORS} height={8} />
          </View>
          <ZoneLegend zoneSeconds={day.dailyHrZoneSeconds} />
        </View>
      )}
    </View>
  );
}

export function RealizedWeekScreen({ navigation }: RealizedWeekScreenProps) {
  const { t: tCommon } = useTranslation('common');
  const screenWidth = Dimensions.get('window').width;
  const cardBarWidth = screenWidth - 64; // px-4 (32) + card p-4 (32)

  const [week, setWeek] = useState<RealizedWeekDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStartDay, setWeekStartDay] = useState(0);

  useEffect(() => {
    trainingPreferenceApi.get()
      .then(({ data }) => setWeekStartDay(data.weekStartDay ?? 0))
      .catch(() => {});
  }, []);

  const fetchWeek = useCallback(async (offset: number, startDay: number) => {
    const current = new Date();
    current.setDate(current.getDate() + offset * 7);
    const weekStart = getWeekStart(current, startDay);
    try {
      const { data } = await activitiesApi.getRealizedWeek(weekStart);
      setWeek(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchWeek(weekOffset, weekStartDay).finally(() => setLoading(false));
  }, [weekOffset, weekStartDay, fetchWeek]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWeek(weekOffset, weekStartDay);
    setRefreshing(false);
  }, [fetchWeek, weekOffset, weekStartDay]);

  const goToActivity = useCallback((id: string) => {
    navigation.navigate('ActivityDetails', { id });
  }, [navigation]);

  const totals = useMemo(() => {
    if (!week) return { activities: 0, seconds: 0, tss: 0, zoneSeconds: 0 };
    let activities = 0, seconds = 0, tss = 0;
    for (const d of week.days) {
      for (const a of d.activities) {
        activities += 1;
        seconds += a.durationSeconds;
        tss += a.trainingStressScore ?? 0;
      }
    }
    return { activities, seconds, tss, zoneSeconds: week.weeklyHrZoneSeconds.reduce((a, b) => a + b, 0) };
  }, [week]);

  const zoneCount = week?.weeklyHrZoneSeconds.length ?? 0;

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Week navigation */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)} hitSlop={10} className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
            <Ionicons name="chevron-back" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(0)} disabled={weekOffset === 0} activeOpacity={0.7} className="items-center">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">
              {week ? `${formatDate(week.weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(week.weekEnd, { day: 'numeric', month: 'short' })}` : ''}
            </Text>
            {weekOffset !== 0 && <Text className="text-xs text-blue-500 mt-0.5">{tCommon('thisWeekLabel')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} hitSlop={10} className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Weekly summary — surfaced up top for glanceability on mobile. */}
          {week && (
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{tCommon('weekSummary')}</Text>
              <View className="flex-row flex-wrap -mx-1">
                <Stat label={tCommon('totalActivities')} value={String(totals.activities)} />
                <Stat label={tCommon('totalTime')} value={formatDuration(totals.seconds)} />
                <Stat label={tCommon('totalTssLabel')} value={String(Math.round(totals.tss))} />
                <Stat label={tCommon('timeInZones')} value={formatDuration(totals.zoneSeconds)} />
              </View>
              {zoneCount > 0 && totals.zoneSeconds > 0 ? (
                <View className="mt-2">
                  <View className="rounded-full overflow-hidden">
                    <ZoneBar zoneSeconds={week.weeklyHrZoneSeconds} width={cardBarWidth} colors={HR_ZONE_COLORS} height={10} />
                  </View>
                  <ZoneLegend zoneSeconds={week.weeklyHrZoneSeconds} />
                </View>
              ) : (
                <Text className="text-sm text-slate-400 mt-1">{tCommon('noHrZonesHint')}</Text>
              )}
            </View>
          )}

          {/* Day-by-day */}
          {week?.days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              zoneCount={zoneCount}
              barWidth={cardBarWidth}
              onActivityPress={goToActivity}
              tCommon={tCommon}
            />
          ))}
      </ScrollView>
    </View>
  );
}
