import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ActivityDto, FtpChangeDto } from '@cyclingforge/shared';
import { activitiesApi, metricsApi } from '../services/api';
import { formatDate, formatTime } from '../utils/format';
import type { ActivitiesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ActivitiesStackParamList, 'Activities'>;
type Filter = 'all' | 'ride' | 'run' | 'walk';
const PER_PAGE = 30;

function icon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('ride')) return '🚴';
  if (t.includes('run')) return '🏃';
  if (t.includes('walk')) return '🚶';
  return '⚡';
}

function StatBig({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <View className="flex-1 items-center px-0.5">
      <View className="flex-row items-baseline">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className={`text-lg font-bold ${accent ? '' : 'text-slate-900 dark:text-white'}`}
          style={[{ lineHeight: 22 }, accent ? { color: accent } : null]}
        >
          {value}
        </Text>
        {unit ? <Text className="text-[10px] text-slate-400 ml-0.5">{unit}</Text> : null}
      </View>
      <Text numberOfLines={1} className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">{label}</Text>
    </View>
  );
}

function ActivityCard({ activity, ftpChanges, onPress }: { activity: ActivityDto; ftpChanges: FtpChangeDto[] | null; onPress: () => void }) {
  const { t } = useTranslation('activities');
  const tssLabel = activity.normalizedPower != null || activity.deviceWatts === true ? 'TSS' : 'HRSS';

  const ftpSourceKey = (): string | null => {
    if (activity.ftpUsed == null || !ftpChanges?.length) return null;
    const aDate = new Date(activity.startDate);
    let last: FtpChangeDto | null = null;
    for (const c of ftpChanges) {
      const cDate = new Date(c.date);
      if (cDate <= aDate && (!last || cDate > new Date(last.date))) last = c;
    }
    if (!last) return null;
    return last.source === 'Manual' ? 'ftpFromProfile' : last.source === 'EstimatedFromActivity' ? 'eftpFromActivity' : null;
  };
  const srcKey = ftpSourceKey();

  const hours = Math.floor((activity.movingTime ?? 0) / 3600);
  const mins = Math.floor(((activity.movingTime ?? 0) % 3600) / 60);
  // TSS gets the highlighted 4th slot; NP (if any) moves to the secondary line.
  const showTss = activity.trainingStressScore != null;

  // Compact, low-emphasis secondary line.
  const secondary: { text: string; accent?: string }[] = [];
  if (activity.averageHeartRate != null) secondary.push({ text: `♥ ${activity.averageHeartRate.toFixed(0)} bpm`, accent: '#ef4444' });
  if (activity.averagePower != null) secondary.push({ text: `${activity.averagePower.toFixed(0)} W` });
  if (showTss && activity.normalizedPower != null) secondary.push({ text: `${t('np')} ${activity.normalizedPower.toFixed(0)} W` });
  if (activity.averageSpeed != null) secondary.push({ text: `${activity.averageSpeed.toFixed(1)} km/h` });
  if (activity.intensityFactor != null) secondary.push({ text: `IF ${activity.intensityFactor.toFixed(2)}` });
  if (activity.ftpUsed != null) secondary.push({ text: `FTP ${activity.ftpUsed} W${srcKey ? ` (${t(srcKey)})` : ''}` });

  return (
    <TouchableOpacity className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm" onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View className="flex-row items-center">
        <View className="h-11 w-11 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-3">
          <Text style={{ fontSize: 20, lineHeight: 24 }}>{icon(activity.type)}</Text>
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white" numberOfLines={1}>{activity.name}</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            {formatDate(activity.startDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(activity.startDate)}
          </Text>
        </View>
        {activity.deviceWatts != null && (
          <View className={`px-2 py-0.5 rounded-full ${activity.deviceWatts ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
            <Text className={`text-[10px] font-medium ${activity.deviceWatts ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {activity.deviceWatts ? '⚡' : '~'} {activity.deviceWatts ? t('powerMeter') : t('estimatedOrHr')}
            </Text>
          </View>
        )}
      </View>

      {/* Key numbers strip */}
      <View className="flex-row mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <StatBig label={t('distance')} value={`${((activity.distance ?? 0) / 1000).toFixed(1)}`} unit="km" />
        <View className="w-px bg-slate-100 dark:bg-slate-700" />
        <StatBig label={t('time')} value={hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} />
        <View className="w-px bg-slate-100 dark:bg-slate-700" />
        <StatBig label={t('elevation')} value={`${(activity.totalElevationGain ?? 0).toFixed(0)}`} unit="m" />
        {showTss
          ? (<>
              <View className="w-px bg-slate-100 dark:bg-slate-700" />
              <StatBig label={tssLabel} value={`${activity.trainingStressScore!.toFixed(0)}`} accent="#ea580c" />
            </>)
          : activity.normalizedPower != null
            ? (<>
                <View className="w-px bg-slate-100 dark:bg-slate-700" />
                <StatBig label={t('np')} value={`${activity.normalizedPower.toFixed(0)}`} unit="W" accent="#2563eb" />
              </>)
            : null}
      </View>

      {/* Secondary metrics line */}
      {secondary.length > 0 && (
        <View className="flex-row flex-wrap items-center mt-2.5">
          {secondary.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text className="text-slate-300 dark:text-slate-600 mx-1.5" style={{ lineHeight: 16 }}>·</Text>}
              <Text
                className={`text-xs ${s.accent ? '' : 'text-slate-500 dark:text-slate-400'}`}
                style={[{ lineHeight: 16 }, s.accent ? { color: s.accent } : null]}
              >
                {s.text}
              </Text>
            </React.Fragment>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ActivitiesScreen({ navigation }: Props) {
  const { t } = useTranslation('activities');
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [ftpChanges, setFtpChanges] = useState<FtpChangeDto[] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchInitial = useCallback(async () => {
    const [actR, pmcR] = await Promise.allSettled([
      activitiesApi.getActivities(1, PER_PAGE),
      metricsApi.getPmcSummary(undefined, undefined, 365),
    ]);
    if (actR.status === 'fulfilled') {
      setActivities(actR.value.data);
      setHasMore(actR.value.data.length === PER_PAGE);
      setPage(1);
    }
    if (pmcR.status === 'fulfilled') setFtpChanges(pmcR.value.data.ftpChanges ?? null);
  }, []);

  useEffect(() => { fetchInitial().finally(() => setLoading(false)); }, [fetchInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInitial();
    setRefreshing(false);
  }, [fetchInitial]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    const { data } = await activitiesApi.getActivities(next, PER_PAGE);
    setActivities((prev) => [...prev, ...data]);
    setPage(next);
    setHasMore(data.length === PER_PAGE);
  }, [page, hasMore, loading]);

  const counts = {
    all: activities.length,
    ride: activities.filter((a) => a.type.toLowerCase().includes('ride')).length,
    run: activities.filter((a) => a.type.toLowerCase().includes('run')).length,
    walk: activities.filter((a) => a.type.toLowerCase().includes('walk')).length,
  };
  const filtered = activities.filter((a) => filter === 'all' || a.type.toLowerCase().includes(filter));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('all') }, { key: 'ride', label: t('rides') },
    { key: 'run', label: t('runs') }, { key: 'walk', label: t('walks') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Text className="text-2xl font-bold text-slate-900 dark:text-white px-4 mt-4 mb-1">{t('title')}</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 px-4 mb-3">{t('subtitle')}</Text>

      <View className="mb-2" style={{ height: 44 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              className={`px-3.5 rounded-full ${filter === f.key ? 'bg-blue-600' : 'bg-white dark:bg-slate-800'}`}
              style={{ height: 34, justifyContent: 'center' }}>
              <Text style={{ lineHeight: 18 }} className={`text-sm font-medium ${filter === f.key ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {f.label} ({counts[f.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <ActivityCard activity={item} ftpChanges={ftpChanges} onPress={() => navigation.navigate('ActivityDetails', { id: item.id })} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text className="text-center text-slate-500 dark:text-slate-400 mt-8">
            {filter !== 'all' ? t('noMatchFilter') : t('syncStravaToSee')}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
