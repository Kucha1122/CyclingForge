import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { recommendationsApi, trainingPreferenceApi } from '../services/api';
import { HowRecommendationsWork } from '../components/workouts/HowRecommendationsWork';
import type { FullPlanDto, WeeklyPlanDto, DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS, ZONE_COLORS } from '../types/workout';
import { computeWorkoutZoneSeconds, sumWeekZoneSeconds, ZONE_COUNT } from '../utils/workoutZones';
import { formatDate } from '../utils/format';

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

const TODAY = new Date().toISOString().split('T')[0];

type Metric = 'hours' | 'tss';

interface WeekStat {
  index: number;
  label: string;
  hours: number;
  tss: number;
  trainingDays: number;
  isDeload: boolean;
  isTaper: boolean;
}

const weekIsDeload = (w: WeeklyPlanDto) => w.days.some(d => d.isDeloadWeek);
const weekIsTaper = (w: WeeklyPlanDto) => w.days.some(d => d.isTaper);
const weekHours = (w: WeeklyPlanDto) => w.days.reduce((s, d) => s + (d.recommendedWorkout?.durationMinutes ?? 0), 0) / 60;
const weekTss = (w: WeeklyPlanDto) => w.days.reduce((s, d) => s + (d.recommendedWorkout?.estimatedTSS ?? 0), 0);

function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const FullPlanPage = () => {
  const { t: tErr } = useTranslation('errors');
  const { t: tCommon } = useTranslation('common');
  const { t: tToday } = useTranslation('todayWorkout');
  const { t: tWorkouts } = useTranslation('workouts');
  const [plan, setPlan] = useState<FullPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('hours');
  const [editMode, setEditMode] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const weekRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadPlan = useCallback(async () => {
    try {
      const pref = await trainingPreferenceApi.get().then(({ data }) => data.planDurationWeeks).catch(() => 12);
      const numWeeks = Math.min(Math.max(1, pref ?? 12), 16);
      const res = await recommendationsApi.getPlan(numWeeks);
      setPlan(res.data);
    } catch (err) {
      setError((err as { message?: string })?.message ?? tErr('requestFailed'));
    } finally {
      setLoading(false);
    }
  }, [tErr]);

  useEffect(() => {
    setError(null);
    setLoading(true);
    loadPlan();
  }, [loadPlan]);

  const handleDayAction = useCallback(async (recommendationId: string, action: 'rest' | 'swap' | 'move', targetDate?: string) => {
    setActionBusy(true);
    setWarning(null);
    try {
      const { data } = await recommendationsApi.adjustPlanDay(recommendationId, action, targetDate);
      if (data.warnings?.length) setWarning(data.warnings[0]);
      await loadPlan();
    } catch {
      setWarning('requestFailed');
    } finally {
      setActionBusy(false);
    }
  }, [loadPlan]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-tertiary">{tCommon('generatingPlan')}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-page p-8">
        <p className="text-secondary">{error ?? tErr('planLoadFailed')}</p>
        <p className="mt-2 text-sm text-tertiary">{tCommon('planGeneratingHint')}</p>
        <Link to="/workout/today" className="mt-4 text-accent hover:underline">{tCommon('backToToday')}</Link>
      </div>
    );
  }

  const weekStats: WeekStat[] = plan.weeksData.map((week, i) => ({
    index: i,
    label: `${tCommon('week').charAt(0)}${i + 1}`,
    hours: +weekHours(week).toFixed(1),
    tss: Math.round(weekTss(week)),
    trainingDays: week.days.filter(d => d.recommendationType === 'Workout').length,
    isDeload: weekIsDeload(week),
    isTaper: weekIsTaper(week),
  }));

  const scrollToWeek = (index: number) =>
    weekRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const barColor = (s: WeekStat) => (s.isTaper ? COLOR_TAPER : s.isDeload ? COLOR_DELOAD : COLOR_NORMAL);

  return (
    <div className="min-h-screen bg-page p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{tCommon('fullPlanTitle')}</h1>
          <p className="mt-0.5 text-sm text-secondary">
            {formatDate(plan.planStart)} – {formatDate(plan.planEnd)} · {plan.weeks} {tCommon('week').toLowerCase()}s
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              editMode ? 'bg-accent text-accent-foreground' : 'border border-border-default bg-surface text-primary hover:bg-muted'
            }`}
          >
            {editMode ? tCommon('done') : tToday('editPlan')}
          </button>
          <Link to="/workout/today" className="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted">
            {tCommon('todaysWorkout')}
          </Link>
          <Link to="/training-setup" className="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted">
            {tToday('adjustPlan')}
          </Link>
        </div>
      </header>

      {warning && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-text ring-1 ring-border-default">
          <span>{tToday(`planWarn_${warning}`, { defaultValue: tErr('requestFailed') })}</span>
          <button type="button" onClick={() => setWarning(null)} className="ml-3 text-tertiary hover:text-primary">✕</button>
        </div>
      )}

      {/* Compact plan overview chart */}
      <div className="mb-5 rounded-xl bg-surface px-4 py-3 shadow-sm ring-1 ring-border-default">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-primary">{tCommon('planOverview')}</h2>
            <div className="flex gap-2 text-[10px] text-secondary">
              <LegendDot color={COLOR_NORMAL} label={tCommon('buildWeek')} />
              <LegendDot color={COLOR_DELOAD} label={tCommon('deload')} />
              <LegendDot color={COLOR_TAPER} label={tCommon('taper')} />
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {(['hours', 'tss'] as Metric[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  metric === m ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-primary'
                }`}
              >
                {m === 'hours' ? tCommon('metricHours') : tCommon('metricTss')}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={weekStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
            <XAxis dataKey="label" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} interval={0} />
            <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} width={36} style={{ fontSize: '10px' }} />
            <Tooltip
              cursor={{ fill: 'var(--border-default)', opacity: 0.3 }}
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined) => [
                metric === 'hours' ? `${value ?? 0} h` : `${value ?? 0} ${tCommon('tssLabel')}`,
                metric === 'hours' ? tCommon('metricHours') : tCommon('metricTss'),
              ]}
              labelFormatter={(label, payload) => {
                const s = payload?.[0]?.payload as WeekStat | undefined;
                if (!s) return label;
                const tag = s.isTaper ? ` · ${tCommon('taper')}` : s.isDeload ? ` · ${tCommon('deload')}` : '';
                return `${label}${tag}`;
              }}
            />
            <Bar dataKey={metric} radius={[2, 2, 0, 0]} cursor="pointer" onClick={(_, index) => scrollToWeek(index)}>
              {weekStats.map((s) => (
                <Cell key={s.index} fill={barColor(s)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calendar-style week rows */}
      <div className="space-y-3">
        {plan.weeksData.map((week, weekIndex) => {
          const stat = weekStats[weekIndex];
          const zoneSeconds = sumWeekZoneSeconds(week.days);
          const zoneTotal = zoneSeconds.reduce((a, b) => a + b, 0);
          return (
            <div
              key={week.weekStart}
              ref={(el) => { weekRefs.current[weekIndex] = el; }}
              className="scroll-mt-4 overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border-default"
            >
              {/* Week header */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-default px-4 py-2.5">
                <span className="text-sm font-semibold text-primary">{tCommon('week')} {weekIndex + 1}</span>
                <span className="text-xs text-tertiary">{formatDate(week.weekStart)} – {formatDate(week.weekEnd)}</span>
                {stat.isTaper && <Badge color={COLOR_TAPER} label={tCommon('taper')} />}
                {stat.isDeload && !stat.isTaper && <Badge color={COLOR_DELOAD} label={tCommon('deload')} />}
                <span className="ml-auto flex items-center gap-3 text-xs text-secondary">
                  <span><span className="font-semibold text-primary">{stat.hours}</span> h</span>
                  <span><span className="font-semibold text-primary">{stat.tss}</span> {tCommon('tssLabel')}</span>
                  <span>{stat.trainingDays} {tCommon('days')}</span>
                </span>
                {/* Inline weekly zone bar */}
                {zoneTotal > 0 && (
                  <div className="flex w-full items-center gap-2 sm:w-44">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" title={tCommon('targetZones')}>
                      {zoneSeconds.map((s, i) => (
                        s > 0 ? <div key={i} style={{ width: `${(s / zoneTotal) * 100}%`, backgroundColor: ZONE_COLORS[ZONE_KEYS[i]] ?? '#888' }} /> : null
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-2 gap-px bg-border-default sm:grid-cols-4 md:grid-cols-7">
                {week.days.map((day, i) => (
                  <DayCell
                    key={day.date ?? i}
                    day={day}
                    tCommon={tCommon}
                    tWorkouts={tWorkouts}
                    tToday={tToday}
                    editMode={editMode}
                    actionBusy={actionBusy}
                    onAction={handleDayAction}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <HowRecommendationsWork />
      </div>
    </div>
  );
};

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function ZoneBar({ zoneSeconds }: { zoneSeconds: number[] }) {
  const total = zoneSeconds.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {zoneSeconds.map((s, i) => (
        s > 0 ? (
          <div
            key={i}
            style={{ width: `${(s / total) * 100}%`, backgroundColor: ZONE_COLORS[ZONE_KEYS[i]] ?? '#888' }}
            title={`${ZONE_KEYS[i]}: ${formatMinutes(s)}`}
          />
        ) : null
      ))}
    </div>
  );
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function DayCell({ day, tCommon, tWorkouts, tToday, editMode, actionBusy, onAction }: {
  day: DailyRecommendationDto;
  tCommon: (key: string) => string;
  tWorkouts: (key: string) => string;
  tToday: TFunction<'todayWorkout'>;
  editMode: boolean;
  actionBusy: boolean;
  onAction: (recommendationId: string, action: 'rest' | 'swap' | 'move', targetDate?: string) => void;
}) {
  const isToday = day.date === TODAY;
  const isPast = day.date < TODAY && !isToday;
  const canEdit = editMode && !isPast;
  const dayKey = DAY_KEYS[new Date(day.date + 'T00:00:00').getDay()];
  const workout = day.recommendedWorkout;
  const isWorkout = workout && day.recommendationType === 'Workout';
  const categoryColor = workout ? (CATEGORY_COLORS[workout.category] || 'bg-muted text-primary') : '';
  const zoneSeconds = workout ? computeWorkoutZoneSeconds(workout.steps) : new Array<number>(ZONE_COUNT).fill(0);

  const inner = (
    <>
      <div className="mb-1 flex items-baseline justify-between">
        <span className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-secondary'}`}>{tCommon(dayKey)}</span>
        <span className="text-[10px] text-tertiary">{formatDate(day.date, { day: 'numeric', month: 'numeric' })}</span>
      </div>

      {day.recommendationType === 'RestDay' && (
        <div className="flex flex-col items-center py-2">
          <span className="text-base leading-none">😴</span>
          <span className="mt-1 text-[10px] text-tertiary">{tCommon('rest')}</span>
        </div>
      )}
      {day.recommendationType === 'AlternativeActivity' && (
        <div className="flex flex-col items-center py-2">
          <span className="text-base leading-none">🚶</span>
          <span className="mt-1 text-[10px] text-tertiary">{tCommon('walk')}</span>
        </div>
      )}
      {isWorkout && (
        <div>
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryColor}`}>
            {tWorkouts(CATEGORY_I18N_KEYS[workout!.category] ?? 'categoryMixed')}
          </span>
          <p className="mt-1 truncate text-[11px] font-medium text-primary" title={workout!.name}>{workout!.name}</p>
          <p className="text-[10px] text-tertiary">{workout!.durationMinutes} {tCommon('min')} · {workout!.estimatedTSS} {tCommon('tssLabel')}</p>
          {zoneSeconds.some(s => s > 0) && <ZoneBar zoneSeconds={zoneSeconds} />}
        </div>
      )}
    </>
  );

  const base = `block min-h-[92px] p-2.5 transition-colors ${
    isToday ? 'bg-state-active-bg ring-1 ring-inset ring-accent' : 'bg-surface'
  } ${isPast ? 'opacity-45' : ''}`;

  if (canEdit) {
    const btn = 'rounded border border-border-default px-1.5 py-0.5 text-[10px] text-secondary hover:bg-muted disabled:opacity-40';
    return (
      <div className={base}>
        {inner}
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" disabled={actionBusy} title={tToday('planMoveEarlier')}
            onClick={() => onAction(day.id, 'move', addDays(day.date, -1))} className={btn}>◀</button>
          <button type="button" disabled={actionBusy} title={tToday('planMoveLater')}
            onClick={() => onAction(day.id, 'move', addDays(day.date, 1))} className={btn}>▶</button>
          {day.alternativeWorkout && (
            <button type="button" disabled={actionBusy} title={tToday('planSwapAlternative')}
              onClick={() => onAction(day.id, 'swap')} className={btn}>⇄</button>
          )}
          {day.recommendationType !== 'RestDay' && (
            <button type="button" disabled={actionBusy} title={tToday('planMakeRest')}
              onClick={() => onAction(day.id, 'rest')} className={btn}>😴</button>
          )}
        </div>
      </div>
    );
  }

  if (isWorkout) {
    return (
      <Link to={`/workouts/${workout!.id}`} className={`${base} hover:bg-muted`}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}
