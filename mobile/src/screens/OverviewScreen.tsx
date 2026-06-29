import React, { useEffect, useState, useCallback } from 'react';
import { useSyncStore } from '../stores/syncStore';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { PmcSummary, DailyRecommendationDto, SleepDataDto, WellnessDataDto, HrvDataDto } from '@cyclingforge/shared';
import { metricsApi, recommendationsApi, garminApi, activitiesApi } from '../services/api';
import { SleepCard, TrainingReadinessCard, WellnessRow, WeeklyZonesCard } from '../components/dashboardCards';

const FORM_STATUS_KEYS: Record<string, string> = {
  Ryzykowna: 'tsbFormStatusRisky', Optymalna: 'tsbFormStatusOptimal',
  Przejściowa: 'tsbFormStatusTransition', Świeża: 'tsbFormStatusFresh',
  'Bardzo świeża': 'tsbFormStatusVeryFresh',
};

function tsbIcon(tsb: number): string {
  if (tsb < -35) return '😫';
  if (tsb < -10) return '💪';
  if (tsb < 5) return '😐';
  if (tsb < 25) return '✨';
  return '⚡';
}
function tsbColor(tsb: number): string {
  if (tsb < -35) return '#ef4444';
  if (tsb < -10) return '#22c55e';
  if (tsb < 5) return '#64748b';
  if (tsb < 25) return '#3b82f6';
  return '#a855f7';
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      {title ? <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{title}</Text> : null}
      {children}
    </View>
  );
}

/** Wellness / "today" snapshot: sleep, readiness, wellness, HR zones, today's workout, TSB. */
export function OverviewScreen() {
  const { t } = useTranslation('charts');
  const td = useTranslation('dashboard').t;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pmc, setPmc] = useState<PmcSummary | null>(null);
  const [today, setToday] = useState<DailyRecommendationDto | null>(null);
  const [sleep, setSleep] = useState<SleepDataDto | null>(null);
  const [wellness, setWellness] = useState<WellnessDataDto | null>(null);
  const [hrv, setHrv] = useState<HrvDataDto | null>(null);
  const [weeklyZones, setWeeklyZones] = useState<number[] | null>(null);
  const syncVersion = useSyncStore((s) => s.syncVersion);

  const fetchData = useCallback(async () => {
    const today10 = new Date().toISOString().slice(0, 10);
    const sleepFrom = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const hrvFrom = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    const [pmcR, todayR, zonesR, garminR, sleepR, wellnessR, hrvR] = await Promise.allSettled([
      // Use the same 365-day history window as the web dashboard so CTL/ATL seeding
      // — and therefore the current TSB/form value — match across platforms.
      metricsApi.getPmcSummary(undefined, undefined, 365),
      recommendationsApi.getToday(),
      activitiesApi.getRealizedWeek(),
      garminApi.getStatus(),
      garminApi.getSleepData(sleepFrom, today10),
      garminApi.getLatestWellness(),
      garminApi.getHrvData(hrvFrom, today10),
    ]);
    if (pmcR.status === 'fulfilled') setPmc(pmcR.value.data);
    if (todayR.status === 'fulfilled') setToday(todayR.value.data);
    if (zonesR.status === 'fulfilled') setWeeklyZones(zonesR.value.data.weeklyHrZoneSeconds);
    const connected = garminR.status === 'fulfilled' && garminR.value.data.isConnected;
    if (connected) {
      if (sleepR.status === 'fulfilled' && sleepR.value.data.length > 0) setSleep(sleepR.value.data[0]);
      if (wellnessR.status === 'fulfilled') setWellness(wellnessR.value.data);
      if (hrvR.status === 'fulfilled' && hrvR.value.data.length) {
        const latest = [...hrvR.value.data].sort((a, b) => b.date.localeCompare(a.date)).find((h) => h.lastNightAvgMs != null) ?? null;
        setHrv(latest);
      }
    }
  }, []);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData, syncVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const tsb = pmc?.currentTSB ?? 0;
  const formStatusKey = pmc ? FORM_STATUS_KEYS[pmc.formStatus] : undefined;
  const formStatusLabel = formStatusKey ? t(formStatusKey) : pmc?.formStatus ?? '';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-5">{td('title')}</Text>

        {/* Garmin wellness */}
        {sleep && <SleepCard sleep={sleep} />}
        {wellness && <TrainingReadinessCard wellness={wellness} />}
        {wellness && <WellnessRow wellness={wellness} hrv={hrv} />}
        {weeklyZones && weeklyZones.some((s) => s > 0) && <WeeklyZonesCard weeklyHrZoneSeconds={weeklyZones} />}

        {/* Today's workout */}
        {today?.recommendedWorkout && (
          <Card title={td('todaysWorkout')}>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">{today.recommendedWorkout.name}</Text>
            <View className="flex-row items-center gap-3 mt-2">
              <View className="bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 rounded">
                <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">{today.recommendedWorkout.category}</Text>
              </View>
              <Text className="text-sm text-slate-600 dark:text-slate-400">{today.recommendedWorkout.durationMinutes} min · TSS {today.recommendedWorkout.estimatedTSS}</Text>
            </View>
          </Card>
        )}

        {/* Readiness */}
        {pmc && (
          <Card title={t('readinessScore')}>
            <View className="items-center mb-3">
              <Text className="text-5xl mb-2">{tsbIcon(tsb)}</Text>
              <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: tsbColor(tsb) }}>
                <Text className="text-2xl font-bold text-white">{tsb.toFixed(1)}</Text>
                <Text className="text-white text-sm ml-1">TSB</Text>
              </View>
              <Text className="text-lg font-semibold text-slate-900 dark:text-white mt-2">{formStatusLabel}</Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
              <Text className="text-sm font-medium text-slate-900 dark:text-white">{t('recommendationTitle')}</Text>
              <Text className="text-sm text-slate-600 dark:text-slate-300 mt-1">{pmc.recommendation}</Text>
            </View>
          </Card>
        )}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
