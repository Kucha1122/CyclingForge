import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSyncStore } from '../stores/syncStore';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PmcSummary, WeeklySummary, MonthlySummary, DailyTssPoint, HrvDataDto, PowerCurveDto } from '@cyclingforge/shared';
import { metricsApi, activitiesApi, garminApi } from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { formatNumber, formatDate } from '../utils/format';
import {
  PmcCharts, BarChartSimple, ChartLegend,
  HrvTrendChartSvg, InteractivePowerCurveChart, type PowerCurvePoint,
} from '../components/charts';
import { TrainingRiskCard } from '../components/dashboardCards';

const RANGE_OPTIONS = [
  { days: 7, key: 'days7' }, { days: 30, key: 'days30' }, { days: 42, key: 'days42' },
  { days: 90, key: 'days90' }, { days: 180, key: 'days180' }, { days: 365, key: 'days365' },
] as const;
const POWER_WINDOWS = [42, 90, 365, 0] as const;
const HRV_WINDOW_DAYS = 56;

const TSB_ZONE_LEGEND = [
  { key: 'tsbZoneRisky', color: '#ef4444' },
  { key: 'tsbZoneOptimal', color: '#10b981' },
  { key: 'tsbZoneTransition', color: '#64748b' },
  { key: 'tsbZoneFresh', color: '#3b82f6' },
  { key: 'tsbZoneVeryFresh', color: '#8b5cf6' },
];

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

/** Pill toggle row (range / window / unit selectors). */
function PillRow<T extends string | number>({ options, value, onChange, render }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; render: (v: T) => string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o === value;
        return (
          <TouchableOpacity
            key={String(o)}
            onPress={() => onChange(o)}
            className={`px-3 py-1.5 rounded-lg ${active ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{render(o)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function AnalysisScreen() {
  const { t } = useTranslation('analysis');
  const tc = useTranslation('charts').t;
  const td = useTranslation('dashboard').t;
  const theme = useThemeStore((s) => s.theme);
  const chartColors = useThemeStore((s) => s.chartColors);
  const isDark = theme === 'dark';
  const chartWidth = Dimensions.get('window').width - 64;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [pmc, setPmc] = useState<PmcSummary | null>(null);
  const [dailyTss, setDailyTss] = useState<DailyTssPoint[]>([]);
  const [risk7, setRisk7] = useState<DailyTssPoint[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [hrv, setHrv] = useState<HrvDataDto[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Power curve has its own window + unit, like the web component.
  const [powerWindow, setPowerWindow] = useState<number>(90);
  const [powerUnit, setPowerUnit] = useState<'w' | 'wkg'>('w');
  const [powerCurve, setPowerCurve] = useState<PowerCurveDto | null>(null);
  const syncVersion = useSyncStore((s) => s.syncVersion);

  const fetchSummaries = useCallback(async (wOff: number, mOff: number) => {
    const { year, month } = yearMonthForOffset(mOff);
    const [w, m] = await Promise.allSettled([
      metricsApi.getWeeklySummary(weekStartForOffset(wOff)),
      metricsApi.getMonthlySummary(year, month),
    ]);
    if (w.status === 'fulfilled') setWeekly(w.value.data);
    if (m.status === 'fulfilled') setMonthly(m.value.data);
  }, []);

  const fetchData = useCallback(async (days: number) => {
    const today10 = new Date().toISOString().slice(0, 10);
    const hrvFrom = new Date(Date.now() - HRV_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
    const [pmcR, tssR, riskR, hrvR] = await Promise.allSettled([
      metricsApi.getPmcSummary(undefined, undefined, days),
      metricsApi.getDailyTss(Math.min(days, 30)),
      metricsApi.getDailyTss(7),
      garminApi.getHrvData(hrvFrom, today10),
    ]);
    if (pmcR.status === 'fulfilled') setPmc(pmcR.value.data);
    if (tssR.status === 'fulfilled') setDailyTss(tssR.value.data);
    if (riskR.status === 'fulfilled') setRisk7(riskR.value.data);
    if (hrvR.status === 'fulfilled') setHrv(hrvR.value.data);
    await fetchSummaries(0, 0);
  }, [fetchSummaries]);

  const fetchPowerCurve = useCallback(async (windowDays: number) => {
    try {
      const { data } = await activitiesApi.getPowerCurve(windowDays);
      setPowerCurve(data);
    } catch { setPowerCurve(null); }
  }, []);

  useEffect(() => { fetchData(rangeDays).finally(() => setLoading(false)); }, [fetchData, rangeDays, syncVersion]);
  useEffect(() => { fetchSummaries(weekOffset, monthOffset); }, [weekOffset, monthOffset, fetchSummaries]);
  useEffect(() => { fetchPowerCurve(powerWindow); }, [fetchPowerCurve, powerWindow, syncVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(rangeDays), fetchPowerCurve(powerWindow)]);
    setRefreshing(false);
  }, [fetchData, fetchPowerCurve, rangeDays, powerWindow]);

  // Merge measured mean-maximal points with the modeled CP curve P(t) = W'/t + CP.
  const powerCurveData = useMemo<PowerCurvePoint[]>(() => {
    if (!powerCurve) return [];
    const wkg = powerUnit === 'wkg';
    const byDuration = new Map<number, PowerCurvePoint>();
    for (const p of powerCurve.points) {
      const measured = wkg ? p.wattsPerKg : p.watts;
      if (measured != null) byDuration.set(p.durationSeconds, { duration: p.durationSeconds, measured });
    }
    if (powerCurve.criticalPower != null && powerCurve.wPrimeJoules != null) {
      const cp = wkg ? powerCurve.criticalPowerPerKg : powerCurve.criticalPower;
      const wprime = wkg && powerCurve.criticalPower
        ? powerCurve.wPrimeJoules * ((powerCurve.criticalPowerPerKg ?? 0) / powerCurve.criticalPower)
        : powerCurve.wPrimeJoules;
      if (cp != null) {
        for (const tSec of [120, 180, 240, 300, 420, 600, 900, 1200, 1800, 2400, 3600]) {
          const model = Math.round((wprime / tSec + cp) * (wkg ? 100 : 1)) / (wkg ? 100 : 1);
          const existing = byDuration.get(tSec) ?? { duration: tSec };
          existing.model = model;
          byDuration.set(tSec, existing);
        }
      }
    }
    return Array.from(byDuration.values()).sort((a, b) => a.duration - b.duration);
  }, [powerCurve, powerUnit]);

  const canShowWkg = (powerCurve?.points ?? []).some((p) => p.wattsPerKg != null);
  const cpForChart = powerUnit === 'wkg' ? powerCurve?.criticalPowerPerKg : powerCurve?.criticalPower;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const tsb = pmc?.currentTSB ?? 0;
  const ctlValues = pmc?.history.map((h) => h.ctl) ?? [];
  const atlValues = pmc?.history.map((h) => h.atl) ?? [];
  const tsbValues = pmc?.history.map((h) => h.tsb) ?? [];
  const pmcDates = pmc?.history.map((h) => h.date) ?? [];
  const tssLabels = dailyTss.map((d) => formatDate(d.date, { month: 'short', day: 'numeric' }));
  const rampRate = pmc?.rampRateCtlPerWeek;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-3">{t('title')}</Text>

        {/* Range selector */}
        <View className="mb-4">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('rangeLabel')}</Text>
          <PillRow options={RANGE_OPTIONS.map((r) => r.days)} value={rangeDays} onChange={setRangeDays}
            render={(d) => t(RANGE_OPTIONS.find((r) => r.days === d)!.key)} />
        </View>

        {pmc ? (
          <>
            {/* CTL / ATL / TSB stats */}
            <Card>
              <View className="flex-row gap-2">
                <View className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{tc('ctl')}</Text>
                  <Text className="text-2xl font-bold" style={{ color: chartColors[0] }}>{pmc.currentCTL.toFixed(1)}</Text>
                </View>
                <View className="flex-1 bg-slate-100 dark:bg-slate-700/40 rounded-xl p-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{tc('atl')}</Text>
                  <Text className="text-2xl font-bold" style={{ color: chartColors[1] }}>{pmc.currentATL.toFixed(1)}</Text>
                </View>
                <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{tc('tsb')}</Text>
                  <Text className="text-2xl font-bold" style={{ color: tsb >= 0 ? '#16a34a' : '#dc2626' }}>{tsb.toFixed(1)}</Text>
                </View>
              </View>
            </Card>

            {/* Ramp-rate alert */}
            {rampRate != null && (
              <View className={`rounded-2xl p-4 mb-4 ${rampRate > 7 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('rampRate')}: {rampRate >= 0 ? '+' : ''}{rampRate.toFixed(1)} CTL/tydz.
                </Text>
                {rampRate > 7 && <Text className="text-xs text-red-700 dark:text-red-300 mt-1">{t('rampRateWarning')}</Text>}
              </View>
            )}

            {/* PMC chart — synced cursor + shared tooltip across load & TSB panels */}
            {pmc.history.length > 1 && (
              <Card title={tc('pmcTitle')}>
                <PmcCharts dates={pmcDates} ctl={ctlValues} atl={atlValues} tsb={tsbValues} width={chartWidth} isDark={isDark} />
                <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                  {TSB_ZONE_LEGEND.map((z) => (
                    <View key={z.key} className="flex-row items-center gap-1">
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: z.color, opacity: 0.85 }} />
                      <Text className="text-[10px] text-slate-500 dark:text-slate-400">{tc(z.key)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Daily TSS */}
            {dailyTss.length > 0 && (
              <Card title={tc('dailyTss')}>
                <BarChartSimple width={chartWidth} values={dailyTss.map((d) => d.tss)} labels={tssLabels} color={chartColors[0]} isDark={isDark} />
              </Card>
            )}

            {/* Overtraining risk */}
            <TrainingRiskCard pmc={pmc} dailyTss={risk7} />
          </>
        ) : (
          <Card>
            <Text className="text-center text-4xl mb-2">📊</Text>
            <Text className="text-center text-base font-semibold text-slate-900 dark:text-white">{t('noAnalysisData')}</Text>
            <Text className="text-center text-sm text-slate-500 dark:text-slate-400 mt-1">{t('noAnalysisDataHint')}</Text>
          </Card>
        )}

        {/* HRV trend */}
        <Card title={t('hrvTrendTitle')}>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('hrvTrendHint')}</Text>
          {hrv.filter((h) => h.lastNightAvgMs != null).length > 1 ? (
            <>
              <HrvTrendChartSvg data={hrv} width={chartWidth} isDark={isDark} />
              <ChartLegend items={[{ label: t('hrvNightly'), color: '#3b82f6' }, { label: t('hrvBaseline'), color: '#f59e0b' }]} />
            </>
          ) : (
            <Text className="text-sm text-slate-400 text-center py-8">{t('hrvTrendNoData')}</Text>
          )}
        </Card>

        {/* Power curve + Critical Power */}
        <Card title={t('powerCurveTitle')}>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('powerCurveHint')}</Text>
          <View className="flex-row items-center justify-between mb-3">
            <PillRow options={POWER_WINDOWS} value={powerWindow} onChange={setPowerWindow}
              render={(w) => (w === 0 ? t('powerCurveAllTime') : t('powerCurveDays', { days: w }))} />
            {canShowWkg && (
              <PillRow options={['w', 'wkg'] as const} value={powerUnit} onChange={setPowerUnit}
                render={(u) => (u === 'w' ? 'W' : 'W/kg')} />
            )}
          </View>
          {powerCurve?.criticalPower != null && (
            <View className="flex-row gap-3 mb-3">
              <View className="bg-slate-100 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <Text className="text-xs text-slate-500 dark:text-slate-400">{t('powerCurveCp')}</Text>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">
                  {powerUnit === 'wkg' && powerCurve.criticalPowerPerKg != null ? `${powerCurve.criticalPowerPerKg} W/kg` : `${powerCurve.criticalPower} W`}
                </Text>
              </View>
              {powerCurve.wPrimeJoules != null && (
                <View className="bg-slate-100 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{t('powerCurveWPrime')}</Text>
                  <Text className="text-lg font-bold text-slate-900 dark:text-white">{(powerCurve.wPrimeJoules / 1000).toFixed(1)} kJ</Text>
                </View>
              )}
            </View>
          )}
          {powerCurveData.length > 1 ? (
            <>
              <InteractivePowerCurveChart data={powerCurveData} cp={cpForChart} width={chartWidth} isDark={isDark} unit={powerUnit} />
              <ChartLegend items={[{ label: t('powerCurveMeasured'), color: '#3b82f6' }, { label: t('powerCurveModeled'), color: '#22c55e' }]} />
            </>
          ) : (
            <Text className="text-sm text-slate-400 text-center py-8">{t('powerCurveNoData')}</Text>
          )}
        </Card>

        {/* Weekly summary */}
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

        {/* Monthly summary */}
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
