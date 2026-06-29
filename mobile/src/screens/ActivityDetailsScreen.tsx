import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ActivityDetailsDto } from '@cyclingforge/shared';
import { computePowerZoneSecondsFromStream, computeAerobicDecoupling, ZONE_COLORS } from '@cyclingforge/shared';
import { activitiesApi, stravaApi } from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { formatDate, formatTime } from '../utils/format';
import { parseStreams, downsample, type StreamPoint } from '../utils/streams';
import { InteractiveStreamChart, ZoneBar, ChartLegend, type StreamSeries } from '../components/charts';
import type { ActivitiesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ActivitiesStackParamList, 'ActivityDetails'>;

const SPORT_KEYS: Record<string, string> = {
  ride: 'sportRide', virtualride: 'sportVirtualRide', run: 'sportRun', walk: 'sportWalk',
  hike: 'sportHike', swim: 'sportSwim', alpineski: 'sportAlpineski', nordicski: 'sportNordicski', workout: 'sportWorkout',
};
const ZONE_KEYS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'] as const;
const ZONE_HEX = ZONE_KEYS.map((z) => ZONE_COLORS[z]);

function sportIcon(type: string): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('ride') || t.includes('cycling')) return '🚴';
  if (t.includes('run')) return '🏃';
  if (t.includes('swim')) return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🚶';
  if (t.includes('ski')) return '⛷️';
  return '🏋️';
}
function fmtDur(ts: string): string {
  const p = ts.split(':');
  if (p.length === 3) {
    const h = +p[0], m = +p[1], s = parseInt(p[2], 10);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }
  return ts;
}
function zoneDur(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s % 60}s`;
}

function StatCard({ label, value, unit, sub, accent, info }: { label: string; value: string | number; unit?: string; sub?: string; accent?: string; info?: string }) {
  return (
    <View className="w-1/2 p-1">
      <View className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
        <View className="flex-row items-center gap-1">
          <Text className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</Text>
          {info ? (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => Alert.alert(label, info)}
            >
              <View className="h-3.5 w-3.5 rounded-full bg-slate-300 dark:bg-slate-600 items-center justify-center">
                <Text className="text-[9px] font-bold text-white">i</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text className={`text-xl font-bold ${accent ? '' : 'text-slate-900 dark:text-white'}`} style={accent ? { color: accent } : undefined}>{value}</Text>
          {unit ? <Text className="text-xs text-slate-400">{unit}</Text> : null}
        </View>
        {sub ? <Text className="text-[10px] text-slate-400">{sub}</Text> : null}
      </View>
    </View>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <View className="flex-row items-center gap-2 my-3 px-1">
      <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</Text>
      <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
    </View>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</Text>
      {desc ? <Text className="text-xs text-slate-400 mb-2">{desc}</Text> : <View className="mb-2" />}
      {children}
    </View>
  );
}

function PowerBestRow({ label, watts, ftp }: { label: string; watts?: number; ftp?: number | null }) {
  if (!watts) return null;
  const pct = ftp ? Math.round((watts / ftp) * 100) : null;
  const barPct = ftp ? Math.min((watts / ftp) * 100, 150) : 50;
  const color = pct == null ? '#3b82f6' : pct >= 120 ? '#a855f7' : pct >= 105 ? '#ef4444' : pct >= 90 ? '#f97316' : pct >= 75 ? '#eab308' : '#3b82f6';
  return (
    <View className="py-2.5 border-b border-slate-100 dark:border-slate-700">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</Text>
        <Text className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(watts)} W{pct != null ? `  ·  ${pct}% FTP` : ''}</Text>
      </View>
      <View className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
        <View className="h-2 rounded-full" style={{ width: `${(barPct / 150) * 100}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function ActivityDetailsScreen({ route }: Props) {
  const { t } = useTranslation('activityDetails');
  const tc = useTranslation('charts').t;
  const tw = useTranslation('workouts').t;
  const { id } = route.params;
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [activity, setActivity] = useState<ActivityDetailsDto | null>(null);
  const [raw, setRaw] = useState<StreamPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const chartWidth = Dimensions.get('window').width - 64;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: act } = await activitiesApi.getActivityDetails(id);
        if (!alive) return;
        setActivity(act);
        try {
          const { data: s } = await stravaApi.getActivityDetails(String(act.stravaActivityId));
          if (alive && s.streamsJson) setRaw(parseStreams(s.streamsJson));
        } catch { /* streams optional */ }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const chart = useMemo(() => downsample(raw), [raw]);
  const powerZones = useMemo(() => computePowerZoneSecondsFromStream(raw, activity?.ftpUsed ?? 0), [raw, activity?.ftpUsed]);
  const decoupling = useMemo(() => computeAerobicDecoupling(raw), [raw]);

  if (loading) {
    return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center"><ActivityIndicator size="large" color="#3b82f6" /></SafeAreaView>;
  }
  if (!activity) {
    return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center"><Text className="text-slate-500 dark:text-slate-400">{t('backToActivities')}</Text></SafeAreaView>;
  }

  const a = activity;
  const sportLabel = t(SPORT_KEYS[(a.type ?? '').toLowerCase()] ?? 'sportWorkout');
  const xValues = chart.map((p) => p.distKm);
  const hasPowerStream = chart.some((p) => p.watts != null);
  const hasHrStream = chart.some((p) => p.heartrate != null);
  const hasAlt = chart.some((p) => p.altitude != null);
  const hasSpeed = chart.some((p) => p.speedKph != null);
  const hasCadence = chart.some((p) => p.cadence != null);
  const totalZones = powerZones.reduce((s, v) => s + v, 0);
  const ftp = a.ftpUsed;

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-4">
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-1">
        <View className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-3">
          <Text className="text-2xl">{sportIcon(a.type)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">{a.name}</Text>
          <View className="flex-row gap-2 mt-1">
            <View className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">{sportLabel}</Text></View>
            {a.deviceWatts === true && <View className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">⚡ {t('powerMeter')}</Text></View>}
            {a.deviceWatts === false && <View className="bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-semibold text-red-600 dark:text-red-300">~ {t('powerEstimated')}</Text></View>}
          </View>
        </View>
      </View>
      <Text className="text-xs text-slate-400 mb-2">{formatDate(a.startDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {formatTime(a.startDate)}</Text>

      {/* Basic data */}
      <SectionHeading>{t('sectionBasicData')}</SectionHeading>
      <View className="flex-row flex-wrap -m-1">
        <StatCard label={t('distance')} value={a.distanceKm.toFixed(2)} unit="km" accent="#2563eb" />
        <StatCard label={t('rideTime')} value={fmtDur(a.movingTime)} />
        <StatCard label={t('elapsedTime')} value={fmtDur(a.elapsedTime)} />
        <StatCard label={t('elevation')} value={Math.round(a.totalElevationGain)} unit="m" accent="#059669" />
        {a.averageSpeed != null && <StatCard label={t('avgSpeed')} value={a.averageSpeed.toFixed(1)} unit="km/h" accent="#d97706" sub={a.maxSpeed != null ? `${t('maxSpeed')} ${a.maxSpeed.toFixed(1)} km/h` : undefined} />}
      </View>

      {/* Power metrics */}
      {a.averagePower != null && (
        <>
          <SectionHeading>{t('sectionPowerData')}</SectionHeading>
          <View className="flex-row flex-wrap -m-1">
            <StatCard label={t('avgPower')} value={Math.round(a.averagePower)} unit="W" accent="#2563eb" />
            {a.normalizedPower != null && <StatCard label={t('normalizedPower')} value={Math.round(a.normalizedPower)} unit="W" sub="NP" accent="#1d4ed8" info={tc('glossaryNp')} />}
            {a.maxPower != null && <StatCard label={t('maxPower')} value={Math.round(a.maxPower)} unit="W" accent="#9333ea" />}
            {a.intensityFactor != null && <StatCard label={t('intensityFactor')} value={a.intensityFactor.toFixed(2)} sub="IF" accent="#ea580c" info={tc('glossaryIf')} />}
            {a.variabilityIndex != null && <StatCard label={t('variabilityIndex')} value={a.variabilityIndex.toFixed(2)} sub="VI" accent="#0d9488" info={tc('glossaryVi')} />}
            {a.trainingStressScore != null && <StatCard label={t('trainingLoad')} value={Math.round(a.trainingStressScore)} sub="TSS" accent="#dc2626" info={tc('glossaryTss')} />}
            {a.ftpUsed != null && <StatCard label={t('ftpUsed')} value={a.ftpUsed} unit="W" />}
            {decoupling != null && <StatCard label={tc('decoupling')} value={decoupling.toFixed(1)} unit="%" accent={decoupling <= 5 ? '#16a34a' : '#ea580c'} info={tc('glossaryDecoupling')} />}
          </View>
        </>
      )}

      {/* HR metrics */}
      {a.averageHeartRate != null && (
        <>
          <SectionHeading>{t('sectionHeartrate')}</SectionHeading>
          <View className="flex-row flex-wrap -m-1">
            <StatCard label={t('avgHr')} value={Math.round(a.averageHeartRate)} unit="bpm" accent="#ef4444" />
            {a.maxHeartRate != null && <StatCard label={t('maxHr')} value={Math.round(a.maxHeartRate)} unit="bpm" accent="#b91c1c" />}
          </View>
        </>
      )}

      {/* Charts */}
      {chart.length > 0 && (
        <>
          <SectionHeading>{t('sectionCharts')}</SectionHeading>

          {hasAlt && (
            <ChartCard title={t('elevationProfile')} desc={t('elevationProfileDesc')}>
              <InteractiveStreamChart
                xValues={xValues}
                series={[{ values: chart.map((p) => p.altitude), color: '#10b981', label: t('altitude'), unit: 'm', axis: 'left' as const, zoom: true, fill: true }] as StreamSeries[]}
                width={chartWidth} isDark={isDark}
              />
            </ChartCard>
          )}

          {(hasPowerStream || hasHrStream) && (
            <ChartCard title={t('powerAndHeartrate')} desc={hasPowerStream && hasHrStream ? t('powerAndHrVsDist') : hasPowerStream ? t('powerVsDist') : t('hrVsDist')}>
              <InteractiveStreamChart
                xValues={xValues}
                series={[
                  ...(hasPowerStream ? [{ values: chart.map((p) => p.watts), color: '#3b82f6', label: t('power'), unit: 'W', axis: 'left' as const, avg: a.averagePower ?? undefined }] : []),
                  ...(hasHrStream ? [{ values: chart.map((p) => p.heartrate), color: '#ef4444', label: t('heartrate'), unit: 'bpm', axis: 'right' as const, avg: a.averageHeartRate ?? undefined, zoom: true }] : []),
                ] as StreamSeries[]}
                width={chartWidth} isDark={isDark}
              />
              <ChartLegend items={[
                ...(hasPowerStream ? [{ label: `${t('power')} (W)`, color: '#3b82f6' }] : []),
                ...(hasHrStream ? [{ label: `${t('heartrate')} (bpm)`, color: '#ef4444' }] : []),
              ]} />
            </ChartCard>
          )}

          {(hasSpeed || hasCadence) && (
            <ChartCard title={t('speedAndCadence')} desc={hasSpeed && hasCadence ? t('speedAndCadenceVsDist') : hasSpeed ? t('speedVsDist') : t('cadenceVsDist')}>
              <InteractiveStreamChart
                xValues={xValues}
                series={[
                  ...(hasSpeed ? [{ values: chart.map((p) => p.speedKph), color: '#f59e0b', label: t('speed'), unit: 'km/h', axis: 'left' as const, avg: a.averageSpeed ?? undefined }] : []),
                  ...(hasCadence ? [{ values: chart.map((p) => p.cadence), color: '#8b5cf6', label: t('cadence'), unit: 'rpm', axis: 'right' as const, zoom: true }] : []),
                ] as StreamSeries[]}
                width={chartWidth} isDark={isDark}
              />
              <ChartLegend items={[
                ...(hasSpeed ? [{ label: `${t('speed')} (km/h)`, color: '#f59e0b' }] : []),
                ...(hasCadence ? [{ label: `${t('cadence')} (rpm)`, color: '#8b5cf6' }] : []),
              ]} />
            </ChartCard>
          )}
        </>
      )}

      {/* Power zones */}
      {totalZones > 0 && (
        <>
          <SectionHeading>{tc('powerZonesTitle')}</SectionHeading>
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm">
            <View className="rounded-full overflow-hidden mb-3">
              <ZoneBar zoneSeconds={powerZones} width={chartWidth} colors={ZONE_HEX} height={18} />
            </View>
            {ZONE_KEYS.map((z, i) => {
              const pct = (powerZones[i] / totalZones) * 100;
              return (
                <View key={z} className="flex-row items-center justify-between py-1">
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: ZONE_HEX[i] }} />
                    <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{z}</Text>
                    <Text className="text-xs text-slate-400">{tw(`zone${i + 1}Short`)}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xs text-slate-400">{pct.toFixed(0)}%</Text>
                    <Text className="text-sm font-medium text-slate-900 dark:text-white w-16 text-right">{zoneDur(powerZones[i])}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Power bests */}
      {(a.best5MinPower || a.best20MinPower || a.best60MinPower) && (
        <>
          <SectionHeading>{t('powerBests')}</SectionHeading>
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm">
            <Text className="text-xs text-slate-400 mb-2">{t('powerBestsDesc')}</Text>
            <PowerBestRow label={t('best5min')} watts={a.best5MinPower} ftp={ftp} />
            <PowerBestRow label={t('best20min')} watts={a.best20MinPower} ftp={ftp} />
            <PowerBestRow label={t('best60min')} watts={a.best60MinPower} ftp={ftp} />
            {a.estimatedFtpFromActivity != null && (
              <View className="mt-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] font-semibold uppercase text-blue-700 dark:text-blue-300">{t('estimatedFtpFromActivity')}</Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">{t('estimatedFtpFromActivityHint')}</Text>
                </View>
                <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">{a.estimatedFtpFromActivity} W</Text>
              </View>
            )}
          </View>
        </>
      )}

      <Text className="text-[10px] text-slate-400 text-right mt-2 mb-6">{t('syncedAt')}: {formatDate(a.syncedAt, { year: 'numeric', month: 'short', day: 'numeric' })} {formatTime(a.syncedAt)}</Text>
    </ScrollView>
  );
}
