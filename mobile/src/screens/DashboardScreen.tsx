import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PmcSummary, WeeklySummary, MonthlySummary, DailyTssPoint, DailyRecommendationDto, SleepDataDto, WellnessDataDto, HrvDataDto } from '@cyclingforge/shared';
import { metricsApi, recommendationsApi, garminApi, activitiesApi } from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { formatNumber, formatDate } from '../utils/format';
import { LineChartMulti, TsbZoneChart, BarChartSimple, ChartLegend } from '../components/charts';
import { SleepCard, TrainingReadinessCard, WellnessRow, WeeklyZonesCard } from '../components/dashboardCards';

const FORM_STATUS_KEYS: Record<string, string> = {
  Ryzykowna: 'tsbFormStatusRisky', Optymalna: 'tsbFormStatusOptimal',
  Przejściowa: 'tsbFormStatusTransition', Świeża: 'tsbFormStatusFresh',
  'Bardzo świeża': 'tsbFormStatusVeryFresh',
};

const TSB_ZONE_LEGEND = [
  { key: 'tsbZoneRisky', color: '#ef4444' },
  { key: 'tsbZoneOptimal', color: '#10b981' },
  { key: 'tsbZoneTransition', color: '#64748b' },
  { key: 'tsbZoneFresh', color: '#3b82f6' },
  { key: 'tsbZoneVeryFresh', color: '#8b5cf6' },
];

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

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekStartForOffset(offset: number): string {
  const ws = startOfWeek(new Date());
  ws.setDate(ws.getDate() + offset * 7);
  return ws.toISOString().slice(0, 10);
}
function yearMonthForOffset(offset: number): { year: number; month: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      {title ? <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{title}</Text> : null}
      {children}
    </View>
  );
}

function NavHeader({ title, onPrev, onNext, canNext }: { title: string; onPrev: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <TouchableOpacity onPress={onPrev} hitSlop={10} className="p-1">
        <Ionicons name="chevron-back" size={20} color="#3b82f6" />
      </TouchableOpacity>
      <Text className="text-base font-semibold text-slate-900 dark:text-white">{title}</Text>
      <TouchableOpacity onPress={onNext} disabled={!canNext} hitSlop={10} className="p-1">
        <Ionicons name="chevron-forward" size={20} color={canNext ? '#3b82f6' : '#cbd5e1'} />
      </TouchableOpacity>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 mb-3">
      <Text className="text-xl font-bold text-slate-900 dark:text-white">{value}</Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { t } = useTranslation('charts');
  const td = useTranslation('dashboard').t;
  const theme = useThemeStore((s) => s.theme);
  const chartColors = useThemeStore((s) => s.chartColors);
  const isDark = theme === 'dark';
  const chartWidth = Dimensions.get('window').width - 64;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pmc, setPmc] = useState<PmcSummary | null>(null);
  const [dailyTss, setDailyTss] = useState<DailyTssPoint[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [today, setToday] = useState<DailyRecommendationDto | null>(null);
  const [sleep, setSleep] = useState<SleepDataDto | null>(null);
  const [wellness, setWellness] = useState<WellnessDataDto | null>(null);
  const [hrv, setHrv] = useState<HrvDataDto | null>(null);
  const [weeklyZones, setWeeklyZones] = useState<number[] | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const fetchSummaries = useCallback(async (wOff: number, mOff: number) => {
    const { year, month } = yearMonthForOffset(mOff);
    const [w, m] = await Promise.allSettled([
      metricsApi.getWeeklySummary(weekStartForOffset(wOff)),
      metricsApi.getMonthlySummary(year, month),
    ]);
    if (w.status === 'fulfilled') setWeekly(w.value.data);
    if (m.status === 'fulfilled') setMonthly(m.value.data);
  }, []);

  const fetchData = useCallback(async () => {
    const today10 = new Date().toISOString().slice(0, 10);
    const sleepFrom = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const hrvFrom = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    const [pmcR, tssR, todayR, zonesR, garminR, sleepR, wellnessR, hrvR] = await Promise.allSettled([
      metricsApi.getPmcSummary(),
      metricsApi.getDailyTss(30),
      recommendationsApi.getToday(),
      activitiesApi.getRealizedWeek(),
      garminApi.getStatus(),
      garminApi.getSleepData(sleepFrom, today10),
      garminApi.getLatestWellness(),
      garminApi.getHrvData(hrvFrom, today10),
    ]);
    if (pmcR.status === 'fulfilled') setPmc(pmcR.value.data);
    if (tssR.status === 'fulfilled') setDailyTss(tssR.value.data);
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
    await fetchSummaries(0, 0);
  }, [fetchSummaries]);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);
  useEffect(() => { fetchSummaries(weekOffset, monthOffset); }, [weekOffset, monthOffset, fetchSummaries]);

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
  const ctlValues = pmc?.history.map((h) => h.ctl) ?? [];
  const atlValues = pmc?.history.map((h) => h.atl) ?? [];
  const tsbValues = pmc?.history.map((h) => h.tsb) ?? [];
  const tssLabels = dailyTss.map((d) => formatDate(d.date, { month: 'short', day: 'numeric' }));

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

        {/* Trends */}
        {pmc && (
          <Card title={t('formTrendsTitle')}>
            <View className="flex-row gap-2">
              <View className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                <Text className="text-xs text-slate-500 dark:text-slate-400">{t('ctl')}</Text>
                <Text className="text-2xl font-bold" style={{ color: chartColors[0] }}>{pmc.currentCTL.toFixed(1)}</Text>
              </View>
              <View className="flex-1 bg-slate-100 dark:bg-slate-700/40 rounded-xl p-3">
                <Text className="text-xs text-slate-500 dark:text-slate-400">{t('atl')}</Text>
                <Text className="text-2xl font-bold" style={{ color: chartColors[1] }}>{pmc.currentATL.toFixed(1)}</Text>
              </View>
              <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3">
                <Text className="text-xs text-slate-500 dark:text-slate-400">{t('tsb')}</Text>
                <Text className="text-2xl font-bold" style={{ color: tsb >= 0 ? '#16a34a' : '#dc2626' }}>{tsb.toFixed(1)}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* PMC chart with descriptions */}
        {pmc && pmc.history.length > 1 && (
          <Card title={t('pmcTitle')}>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('trainingLoadTitle')}</Text>
            <LineChartMulti
              width={chartWidth}
              series={[{ values: ctlValues, color: chartColors[0] }, { values: atlValues, color: chartColors[1] }]}
              isDark={isDark}
            />
            <ChartLegend items={[{ label: t('ctl'), color: chartColors[0] }, { label: t('atl'), color: chartColors[1] }]} />

            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-1 mt-4">{t('tsb')}</Text>
            <TsbZoneChart width={chartWidth} values={tsbValues} isDark={isDark} />

            {/* TSB zone legend */}
            <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
              {TSB_ZONE_LEGEND.map((z) => (
                <View key={z.key} className="flex-row items-center gap-1">
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: z.color, opacity: 0.85 }} />
                  <Text className="text-[10px] text-slate-500 dark:text-slate-400">{t(z.key)}</Text>
                </View>
              ))}
            </View>

            {/* CTL / ATL / TSB explanations */}
            <View className="flex-row mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <View className="flex-1 items-center">
                <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">CTL</Text>
                <Text className="text-[10px] text-slate-400 text-center">{t('ctlDaysAverage', { days: 42 })}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">ATL</Text>
                <Text className="text-[10px] text-slate-400 text-center">{t('atlDaysAverage', { days: 7 })}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">TSB</Text>
                <Text className="text-[10px] text-slate-400 text-center">{t('tsbFormula')}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Daily TSS */}
        {dailyTss.length > 0 && (
          <Card title={t('dailyTss')}>
            <BarChartSimple width={chartWidth} values={dailyTss.map((d) => d.tss)} labels={tssLabels} color={chartColors[0]} isDark={isDark} />
            <Text className="text-center text-xs text-slate-400 mt-2">{t('lastDays', { days: 30 })}</Text>
          </Card>
        )}

        {/* Weekly summary with nav */}
        {weekly && (
          <Card>
            <NavHeader
              title={weekOffset === 0 ? td('thisWeek') : `${formatDate(weekly.weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(weekly.weekEnd, { day: 'numeric', month: 'short' })}`}
              onPrev={() => setWeekOffset((o) => o - 1)}
              onNext={() => setWeekOffset((o) => Math.min(0, o + 1))}
              canNext={weekOffset < 0}
            />
            <View className="flex-row flex-wrap">
              <Stat label={td('totalActivities')} value={String(weekly.totalActivities)} />
              <Stat label={td('distance')} value={`${formatNumber(Math.round(weekly.totalDistance))} km`} />
              <Stat label="TSS" value={weekly.totalTSS != null ? String(Math.round(weekly.totalTSS)) : '–'} />
              <Stat label={td('elevationGain')} value={`${Math.round(weekly.totalElevationGain)} m`} />
            </View>
          </Card>
        )}

        {/* Monthly summary with nav */}
        {monthly && (
          <Card>
            <NavHeader
              title={monthOffset === 0 ? td('monthSummary') : `${monthly.month}/${monthly.year}`}
              onPrev={() => setMonthOffset((o) => o - 1)}
              onNext={() => setMonthOffset((o) => Math.min(0, o + 1))}
              canNext={monthOffset < 0}
            />
            <View className="flex-row flex-wrap">
              <Stat label={td('totalActivities')} value={String(monthly.totalActivities)} />
              <Stat label={td('distance')} value={`${formatNumber(Math.round(monthly.totalDistance))} km`} />
              <Stat label={td('elevationGain')} value={`${Math.round(monthly.totalElevationGain)} m`} />
              <Stat label={td('avgFitnessCtl')} value={monthly.averageCTL != null ? monthly.averageCTL.toFixed(0) : '–'} />
            </View>
          </Card>
        )}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
