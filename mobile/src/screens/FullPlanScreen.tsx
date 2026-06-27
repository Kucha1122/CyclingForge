import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { FullPlanDto, WeeklyPlanDto, DailyRecommendationDto } from '@cyclingforge/shared';
import {
  computeWorkoutZoneSeconds, sumWeekZoneSeconds, ZONE_COUNT, ZONE_COLORS,
} from '@cyclingforge/shared';
import { recommendationsApi, trainingPreferenceApi } from '../services/api';
import { CATEGORY_HEX } from '../components/workoutCard';
import { useThemeStore } from '../stores/themeStore';
import { formatDate } from '../utils/format';
import type { FullPlanScreenProps } from '../navigation/types';

// Indexed by JS Date.getDay() (0 = Sunday .. 6 = Saturday).
const DAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'] as const;
const ZONE_KEYS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'] as const;

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

const COLOR_NORMAL = '#3b82f6';
const COLOR_DELOAD = '#f59e0b';
const COLOR_TAPER = '#a855f7';

type Metric = 'hours' | 'tss';

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

const weekIsDeload = (w: WeeklyPlanDto) => w.days.some((d) => d.isDeloadWeek);
const weekIsTaper = (w: WeeklyPlanDto) => w.days.some((d) => d.isTaper);
const weekHours = (w: WeeklyPlanDto) => w.days.reduce((s, d) => s + (d.recommendedWorkout?.durationMinutes ?? 0), 0) / 60;
const weekTss = (w: WeeklyPlanDto) => w.days.reduce((s, d) => s + (d.recommendedWorkout?.estimatedTSS ?? 0), 0);

interface WeekStat {
  index: number;
  label: string;
  hours: number;
  tss: number;
  trainingDays: number;
  isDeload: boolean;
  isTaper: boolean;
}

const barColor = (s: WeekStat) => (s.isTaper ? COLOR_TAPER : s.isDeload ? COLOR_DELOAD : COLOR_NORMAL);

export function FullPlanScreen({ navigation }: FullPlanScreenProps) {
  const { t: tCommon } = useTranslation('common');
  const { t: tToday } = useTranslation('todayWorkout');
  const { t: tWorkouts } = useTranslation('workouts');
  const { t: tErr } = useTranslation('errors');
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  const screenWidth = Dimensions.get('window').width;
  const cardBarWidth = screenWidth - 64; // screen px-4 (32) + card p-4 (32)

  const [plan, setPlan] = useState<FullPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('hours');
  const [editMode, setEditMode] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const scrollRef = useRef<ScrollView>(null);
  const weekY = useRef<number[]>([]);

  const today = toIsoDate(new Date());

  const loadPlan = useCallback(async () => {
    try {
      const pref = await trainingPreferenceApi.get().then(({ data }) => data.planDurationWeeks).catch(() => 12);
      const numWeeks = Math.min(Math.max(1, pref ?? 12), 16);
      const res = await recommendationsApi.getPlan(numWeeks);
      setPlan(res.data);
      setError(null);
      // Expand the week containing today (fallback: first week).
      const todayIdx = res.data.weeksData.findIndex((w) => today >= w.weekStart && today <= w.weekEnd);
      setExpanded((prev) => (prev.size > 0 ? prev : new Set([todayIdx >= 0 ? todayIdx : 0])));
    } catch (err) {
      setError((err as { message?: string })?.message ?? tErr('requestFailed'));
    }
  }, [tErr, today]);

  useEffect(() => {
    setLoading(true);
    loadPlan().finally(() => setLoading(false));
  }, [loadPlan]);

  // Silently refetch when returning to the tab (e.g. after editing preferences
  // in TrainingSetup, where plan duration may have changed). Skips the initial
  // focus — the mount effect above already handles the first load.
  const focusedOnce = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (focusedOnce.current) loadPlan();
      focusedOnce.current = true;
    });
    return unsub;
  }, [navigation, loadPlan]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  }, [loadPlan]);

  const handleDayAction = useCallback(async (id: string, action: 'rest' | 'swap' | 'move', targetDate?: string) => {
    setActionBusy(true);
    setWarning(null);
    try {
      const { data } = await recommendationsApi.adjustPlanDay(id, action, targetDate);
      if (data.warnings?.length) setWarning(data.warnings[0]);
      await loadPlan();
    } catch {
      setWarning('requestFailed');
    } finally {
      setActionBusy(false);
    }
  }, [loadPlan]);

  const toggleWeek = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const openWorkout = useCallback((id: string) => {
    navigation.getParent()?.navigate('WorkoutDetail', { id });
  }, [navigation]);

  const weekStats: WeekStat[] = useMemo(() => (plan?.weeksData ?? []).map((week, i) => ({
    index: i,
    label: `${tCommon('week').charAt(0)}${i + 1}`,
    hours: +weekHours(week).toFixed(1),
    tss: Math.round(weekTss(week)),
    trainingDays: week.days.filter((d) => d.recommendationType === 'Workout').length,
    isDeload: weekIsDeload(week),
    isTaper: weekIsTaper(week),
  })), [plan, tCommon]);

  const scrollToWeek = useCallback((index: number) => {
    // Make sure the target week is open so there's something to scroll to.
    setExpanded((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    const y = weekY.current[index];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-sm text-slate-400 mt-3">{tCommon('generatingPlan')}</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center px-8">
        <Text className="text-base text-slate-600 dark:text-slate-300 text-center">{error ?? tErr('planLoadFailed')}</Text>
        <Text className="text-sm text-slate-400 text-center mt-2">{tCommon('planGeneratingHint')}</Text>
        <TouchableOpacity onPress={onRefresh} className="mt-4 rounded-xl bg-blue-500 px-4 py-2.5">
          <Text className="text-sm font-medium text-white">{tCommon('sync')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="mb-3">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">{tCommon('fullPlanTitle')}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDate(plan.planStart, { day: 'numeric', month: 'short' })} – {formatDate(plan.planEnd, { day: 'numeric', month: 'short' })} · {plan.weeks} {tCommon('week').toLowerCase()}
          </Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('TrainingSetup')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5"
          >
            <Ionicons name="options-outline" size={16} color="#3b82f6" />
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{tToday('adjustPlan')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEditMode((v) => !v)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${editMode ? 'bg-blue-500' : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
          >
            <Ionicons name={editMode ? 'checkmark' : 'create-outline'} size={16} color={editMode ? '#fff' : '#3b82f6'} />
            <Text className={`text-sm font-medium ${editMode ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
              {editMode ? tCommon('done') : tToday('editPlan')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Warning banner */}
        {warning && (
          <View className="flex-row items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-3 py-2 mb-3">
            <Text className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              {tToday(`planWarn_${warning}`, { defaultValue: tErr('requestFailed') })}
            </Text>
            <TouchableOpacity onPress={() => setWarning(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color="#b45309" />
            </TouchableOpacity>
          </View>
        )}

        {/* Plan overview chart */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">{tCommon('planOverview')}</Text>
            <View className="flex-row rounded-lg bg-slate-100 dark:bg-slate-700 p-0.5">
              {(['hours', 'tss'] as Metric[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMetric(m)}
                  className={`rounded-md px-2.5 py-1 ${metric === m ? 'bg-white dark:bg-slate-600' : ''}`}
                >
                  <Text className={`text-xs font-medium ${metric === m ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {m === 'hours' ? tCommon('metricHours') : tCommon('metricTss')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <PlanBarChart
            stats={weekStats}
            metric={metric}
            width={cardBarWidth}
            isDark={isDark}
            onBarPress={scrollToWeek}
          />
          <View className="flex-row gap-3 mt-2">
            <LegendDot color={COLOR_NORMAL} label={tCommon('buildWeek')} />
            <LegendDot color={COLOR_DELOAD} label={tCommon('deload')} />
            <LegendDot color={COLOR_TAPER} label={tCommon('taper')} />
          </View>
        </View>

        {/* Week accordion */}
        {plan.weeksData.map((week, weekIndex) => (
          <WeekCard
            key={week.weekStart}
            week={week}
            weekIndex={weekIndex}
            stat={weekStats[weekIndex]}
            expanded={expanded.has(weekIndex)}
            onToggle={() => toggleWeek(weekIndex)}
            barWidth={cardBarWidth}
            today={today}
            editMode={editMode}
            actionBusy={actionBusy}
            onAction={handleDayAction}
            onOpenWorkout={openWorkout}
            onLayoutY={(y) => { weekY.current[weekIndex] = y; }}
            tCommon={tCommon}
            tWorkouts={tWorkouts}
            tToday={tToday}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Plan overview bar chart (per-week color + tap) ──────────────────
function PlanBarChart({ stats, metric, width, isDark, onBarPress }: {
  stats: WeekStat[]; metric: Metric; width: number; isDark: boolean; onBarPress: (index: number) => void;
}) {
  const height = 120;
  const AXIS_W = 30;
  const AXIS_H = 16;
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const values = stats.map((s) => (metric === 'hours' ? s.hours : s.tss));
  const rawMax = Math.max(1, ...values);
  const maxV = niceMax(rawMax);
  const n = Math.max(stats.length, 1);
  const slot = innerW / n;
  const barW = Math.max(3, slot * 0.6);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const axisFill = isDark ? '#64748b' : '#94a3b8';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';

  // ~5 evenly spaced X labels so they stay legible.
  const labelIdx: number[] = [];
  const step = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += step) labelIdx.push(i);
  if (labelIdx[labelIdx.length - 1] !== n - 1) labelIdx.push(n - 1);

  return (
    <Svg width={width} height={height}>
      {ticks.map((f) => {
        const y = padTop + innerH * f;
        return (
          <React.Fragment key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridStroke} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisFill} textAnchor="end">{Math.round(maxV * (1 - f))}</SvgText>
          </React.Fragment>
        );
      })}
      {stats.map((s, i) => {
        const v = values[i];
        const h = (v / maxV) * innerH;
        const x = x0 + i * slot + (slot - barW) / 2;
        const y = padTop + innerH - h;
        return (
          <Rect
            key={s.index}
            x={x} y={y} width={barW} height={Math.max(0, h)} rx={2}
            fill={barColor(s)}
            onPress={() => onBarPress(i)}
          />
        );
      })}
      {labelIdx.map((i) => (
        <SvgText key={i} x={x0 + i * slot + slot / 2} y={height - 3} fontSize={9} fill={axisFill} textAnchor="middle">
          {stats[i].label}
        </SvgText>
      ))}
    </Svg>
  );
}

function niceMax(max: number): number {
  if (max <= 5) return Math.ceil(max);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / pow) * pow;
}

// ── Week card (accordion) ───────────────────────────────────────────
function WeekCard({
  week, weekIndex, stat, expanded, onToggle, barWidth, today, editMode, actionBusy,
  onAction, onOpenWorkout, onLayoutY, tCommon, tWorkouts, tToday,
}: {
  week: WeeklyPlanDto; weekIndex: number; stat: WeekStat; expanded: boolean; onToggle: () => void;
  barWidth: number; today: string; editMode: boolean; actionBusy: boolean;
  onAction: (id: string, action: 'rest' | 'swap' | 'move', targetDate?: string) => void;
  onOpenWorkout: (id: string) => void; onLayoutY: (y: number) => void;
  tCommon: (k: string) => string; tWorkouts: (k: string) => string;
  tToday: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const zoneSeconds = useMemo(() => sumWeekZoneSeconds(week.days), [week.days]);
  const zoneTotal = zoneSeconds.reduce((a, b) => a + b, 0);

  return (
    <View
      className="bg-white dark:bg-slate-800 rounded-2xl mb-3 shadow-sm overflow-hidden"
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      {/* Header (tap to expand/collapse) */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <Text className="text-sm font-bold text-slate-900 dark:text-white">{tCommon('week')} {weekIndex + 1}</Text>
            {stat.isTaper ? <Badge color={COLOR_TAPER} label={tCommon('taper')} />
              : stat.isDeload ? <Badge color={COLOR_DELOAD} label={tCommon('deload')} /> : null}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-xs text-slate-400">
            {formatDate(week.weekStart, { day: 'numeric', month: 'short' })} – {formatDate(week.weekEnd, { day: 'numeric', month: 'short' })}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            <Text className="font-semibold text-slate-700 dark:text-slate-200">{stat.hours}</Text> h · {' '}
            <Text className="font-semibold text-slate-700 dark:text-slate-200">{stat.tss}</Text> {tCommon('tssLabel')} · {' '}
            {stat.trainingDays} {tCommon('days')}
          </Text>
        </View>
        {zoneTotal > 0 && (
          <View className="mt-2 rounded-full overflow-hidden">
            <PlanZoneBar zoneSeconds={zoneSeconds} width={barWidth} height={6} />
          </View>
        )}
      </TouchableOpacity>

      {/* Days */}
      {expanded && (
        <View className="px-3 pb-3 pt-0.5">
          {week.days.map((day, i) => (
            <DayRow
              key={day.date ?? i}
              day={day}
              today={today}
              barWidth={barWidth - 24}
              editMode={editMode}
              actionBusy={actionBusy}
              onAction={onAction}
              onOpenWorkout={onOpenWorkout}
              tCommon={tCommon}
              tWorkouts={tWorkouts}
              tToday={tToday}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Single day row ──────────────────────────────────────────────────
function DayRow({
  day, today, barWidth, editMode, actionBusy, onAction, onOpenWorkout, tCommon, tWorkouts, tToday,
}: {
  day: DailyRecommendationDto; today: string; barWidth: number; editMode: boolean; actionBusy: boolean;
  onAction: (id: string, action: 'rest' | 'swap' | 'move', targetDate?: string) => void;
  onOpenWorkout: (id: string) => void;
  tCommon: (k: string) => string; tWorkouts: (k: string) => string;
  tToday: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const isToday = day.date === today;
  const isPast = day.date < today && !isToday;
  const canEdit = editMode && !isPast;
  const dayKey = DAY_KEYS[new Date(day.date + 'T00:00:00').getDay()];
  const workout = day.recommendedWorkout;
  const isWorkout = !!workout && day.recommendationType === 'Workout';
  const catHex = workout ? (CATEGORY_HEX[workout.category] ?? '#64748b') : '#64748b';
  const zoneSeconds = isWorkout ? computeWorkoutZoneSeconds(workout!.steps) : new Array<number>(ZONE_COUNT).fill(0);
  const hasZones = zoneSeconds.some((s) => s > 0);

  const content = (
    <>
      <View className="flex-row items-center justify-between">
        <Text className={`text-xs font-semibold ${isToday ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'}`}>
          {tCommon(dayKey)}
        </Text>
        <Text className="text-[10px] text-slate-400">{formatDate(day.date, { day: 'numeric', month: 'numeric' })}</Text>
      </View>

      {day.recommendationType === 'RestDay' && (
        <Text className="text-xs text-slate-400 mt-1">😴 {tCommon('rest')}</Text>
      )}
      {day.recommendationType === 'AlternativeActivity' && (
        <Text className="text-xs text-slate-400 mt-1">🚶 {tCommon('walk')}</Text>
      )}
      {isWorkout && (
        <View className="mt-1">
          <View className="flex-row items-center">
            <View style={{ backgroundColor: catHex + '22' }} className="rounded px-1.5 py-0.5">
              <Text style={{ color: catHex }} className="text-[10px] font-medium">
                {tWorkouts(CATEGORY_I18N_KEYS[workout!.category] ?? 'categoryMixed')}
              </Text>
            </View>
          </View>
          <Text className="text-xs font-medium text-slate-900 dark:text-white mt-1" numberOfLines={1}>{workout!.name}</Text>
          <Text className="text-[10px] text-slate-400">
            {workout!.durationMinutes} {tCommon('min')} · {workout!.estimatedTSS} {tCommon('tssLabel')}
          </Text>
          {hasZones && (
            <View className="mt-1.5 rounded-full overflow-hidden self-start">
              <PlanZoneBar zoneSeconds={zoneSeconds} width={barWidth} height={5} />
            </View>
          )}
        </View>
      )}
    </>
  );

  const rowBase = `rounded-xl px-3 py-2.5 mb-2 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-500' : 'bg-slate-50 dark:bg-slate-700/40'}`;
  const rowStyle = isPast ? { opacity: 0.5 } : undefined;

  if (canEdit) {
    return (
      <View className={rowBase} style={rowStyle}>
        {content}
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          <EditBtn icon="chevron-back" disabled={actionBusy} onPress={() => onAction(day.id, 'move', addDays(day.date, -1))} />
          <EditBtn icon="chevron-forward" disabled={actionBusy} onPress={() => onAction(day.id, 'move', addDays(day.date, 1))} />
          {day.alternativeWorkout && (
            <EditBtn icon="swap-horizontal" disabled={actionBusy} onPress={() => onAction(day.id, 'swap')} />
          )}
          {day.recommendationType !== 'RestDay' && (
            <EditBtn icon="bed-outline" disabled={actionBusy} onPress={() => onAction(day.id, 'rest')} />
          )}
        </View>
      </View>
    );
  }

  if (isWorkout) {
    return (
      <TouchableOpacity className={rowBase} style={rowStyle} activeOpacity={0.7} onPress={() => onOpenWorkout(workout!.id)}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View className={rowBase} style={rowStyle}>{content}</View>;
}

function EditBtn({ icon, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 items-center justify-center"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={icon} size={16} color="#64748b" />
    </TouchableOpacity>
  );
}

// ── Power-zone bar (SVG, per-week ZONE_COLORS) ──────────────────────
function PlanZoneBar({ zoneSeconds, width, height }: { zoneSeconds: number[]; width: number; height: number }) {
  const total = zoneSeconds.reduce((a, b) => a + b, 0);
  if (total === 0 || width <= 0) return null;
  let x = 0;
  return (
    <Svg width={width} height={height}>
      {zoneSeconds.map((s, i) => {
        if (s <= 0) return null;
        const w = (s / total) * width;
        const rect = <Rect key={i} x={x} y={0} width={w} height={height} fill={ZONE_COLORS[ZONE_KEYS[i]] ?? '#888'} />;
        x += w;
        return rect;
      })}
    </Svg>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ backgroundColor: color }} className="rounded-full px-1.5 py-0.5">
      <Text className="text-[10px] font-semibold uppercase text-white">{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text className="text-[10px] text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}
