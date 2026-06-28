import React, { useEffect, useState, useCallback } from 'react';
import { useSyncStore } from '../stores/syncStore';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SleepDataDto, HrvDataDto, GarminStatusDto } from '@cyclingforge/shared';
import { garminApi } from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { formatDuration } from '../utils/format';
import { SleepDurationChart, SleepStagesChart, SleepNightCard, STAGE_COLORS } from '../components/sleepCharts';

type DateRange = 7 | 30 | 90;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      {title ? <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">{title}</Text> : null}
      {children}
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-white dark:bg-slate-800 rounded-2xl py-3 px-3 items-center shadow-sm">
        <Text className="text-xs text-slate-400 mb-1">{label}</Text>
        {color ? (
          <Text className="text-xl font-bold" style={{ color }}>{value}</Text>
        ) : (
          <Text className="text-xl font-bold text-slate-900 dark:text-white">{value}</Text>
        )}
      </View>
    </View>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {items.map((it) => (
        <View key={it.label} className="flex-row items-center gap-1.5">
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: it.color }} />
          <Text className="text-xs text-slate-500 dark:text-slate-400">{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function SleepScreen() {
  const { t } = useTranslation('sleep');
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const chartWidth = Dimensions.get('window').width - 64; // screen px-4 (16*2) + card p-4 (16*2)

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<GarminStatusDto | null>(null);
  const [sleepData, setSleepData] = useState<SleepDataDto[]>([]);
  const [hrvData, setHrvData] = useState<HrvDataDto[]>([]);
  const [range, setRange] = useState<DateRange>(30);
  const syncVersion = useSyncStore((s) => s.syncVersion);

  const fetchSleep = useCallback(async (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const [sleepR, hrvR] = await Promise.allSettled([
      garminApi.getSleepData(ymd(start), ymd(end)),
      garminApi.getHrvData(ymd(start), ymd(end)),
    ]);
    setSleepData(sleepR.status === 'fulfilled' ? sleepR.value.data : []);
    setHrvData(hrvR.status === 'fulfilled' ? hrvR.value.data : []);
  }, []);

  const load = useCallback(async (days: number) => {
    try {
      const statusR = await garminApi.getStatus();
      setStatus(statusR.data);
      if (statusR.data.isConnected) await fetchSleep(days);
    } catch { /* ignore */ }
  }, [fetchSleep]);

  useEffect(() => { load(range).finally(() => setLoading(false)); }, [load, range, syncVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(range);
    setRefreshing(false);
  }, [load, range]);

  const onSync = useCallback(async () => {
    setSyncing(true);
    try {
      await garminApi.sync(range);
      await fetchSleep(range);
    } catch { /* ignore */ } finally {
      setSyncing(false);
    }
  }, [fetchSleep, range]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!status?.isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">🌙</Text>
          <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2 text-center">{t('connectGarminToTrack')}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">{t('connectGarminDescription')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Averages for the summary row.
  const avg = (sel: (d: SleepDataDto) => number) =>
    sleepData.length ? Math.round(sleepData.reduce((s, d) => s + sel(d), 0) / sleepData.length) : 0;
  const avgSleep = avg((d) => d.totalSleepSeconds);
  const avgDeep = avg((d) => d.deepSleepSeconds);
  const avgRem = avg((d) => d.remSleepSeconds);
  const scored = sleepData.filter((d) => d.sleepScore != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, d) => s + (d.sleepScore ?? 0), 0) / scored.length)
    : null;

  const nights = [...sleepData].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-4">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">{t('analytics')}</Text>
          <TouchableOpacity
            onPress={onSync}
            disabled={syncing}
            className="flex-row items-center gap-1.5 bg-blue-500 rounded-lg px-3 py-2"
            style={{ opacity: syncing ? 0.6 : 1 }}
          >
            {syncing
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Ionicons name="sync-outline" size={16} color="#ffffff" />}
            <Text className="text-sm font-medium text-white">{syncing ? t('syncing') : t('syncGarmin')}</Text>
          </TouchableOpacity>
        </View>

        {/* Range selector */}
        <View className="flex-row bg-slate-200 dark:bg-slate-800 rounded-lg p-1 mb-4">
          {([7, 30, 90] as DateRange[]).map((r) => {
            const active = range === r;
            const label = r === 7 ? t('last7Days') : r === 30 ? t('last30Days') : t('last90Days');
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                className={`flex-1 py-1.5 rounded-md ${active ? 'bg-white dark:bg-slate-600' : ''}`}
              >
                <Text className={`text-center text-xs font-medium ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {nights.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-6xl mb-4">📭</Text>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('noSleepDataYet')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">{t('syncGarminHint')}</Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View className="flex-row flex-wrap -mx-1 mb-2">
              <StatCard label={t('avgDuration')} value={formatDuration(avgSleep)} />
              <StatCard label={t('avgDeep')} value={formatDuration(avgDeep)} color={STAGE_COLORS.deep} />
              <StatCard label={t('avgRem')} value={formatDuration(avgRem)} color={STAGE_COLORS.rem} />
              <StatCard label={t('avgScore')} value={avgScore != null ? String(avgScore) : '–'} />
            </View>

            {/* Duration + HRV chart */}
            <Card title={t('sleepDurationChart')}>
              <SleepDurationChart data={sleepData} hrvData={hrvData} width={chartWidth} isDark={isDark} />
              <Legend
                items={[
                  { label: t('sleepLabel'), color: '#6366f1' },
                  ...(hrvData.some((h) => h.lastNightAvgMs != null) ? [{ label: t('hrvAvg'), color: '#10b981' }] : []),
                ]}
              />
            </Card>

            {/* Sleep stages chart */}
            <Card title={t('sleepStages')}>
              <SleepStagesChart data={sleepData} width={chartWidth} isDark={isDark} />
              <Legend
                items={[
                  { label: t('deep'), color: STAGE_COLORS.deep },
                  { label: t('rem'), color: STAGE_COLORS.rem },
                  { label: t('light'), color: STAGE_COLORS.light },
                  { label: t('awake'), color: STAGE_COLORS.awake },
                ]}
              />
            </Card>

            {/* Night details */}
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3 mt-1">{t('nightDetails')}</Text>
            {nights.map((d) => (
              <SleepNightCard
                key={d.date}
                sleep={d}
                hrv={hrvData.find((h) => h.date === d.date) ?? null}
                width={chartWidth + 32}
                isDark={isDark}
              />
            ))}
          </>
        )}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
