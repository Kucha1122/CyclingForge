import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recommendationsApi } from '../services/api';
import type { WeeklyPlanDto, DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';
import { formatDate } from '../utils/format';

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const;

export const WeeklyPlanPage = () => {
  const { t: tCommon } = useTranslation('common');
  const { t: tNav } = useTranslation('nav');
  const { t: tWorkouts } = useTranslation('workouts');
  const [plan, setPlan] = useState<WeeklyPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    const current = new Date();
    current.setDate(current.getDate() + weekOffset * 7);
    const weekStart = getMondayOfWeek(current);

    recommendationsApi.getWeek(weekStart)
      .then(({ data }) => setPlan(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekOffset]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-tertiary">{tCommon('loadingWeeklyPlan')}</p></div>;
  }

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{tNav('weeklyPlan')}</h1>
        {plan && (
          <p className="text-secondary">
            {formatDate(plan.weekStart)} - {formatDate(plan.weekEnd)}
          </p>
        )}
      </header>

      {/* Week navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          ← {tCommon('previousWeek')}
        </button>
        <button onClick={() => setWeekOffset(0)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          {tCommon('thisWeekLabel')}
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          {tCommon('nextWeekLabel')} →
        </button>
      </div>

      {/* Weekly grid */}
      {plan && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {plan.days.map((day, i) => (
            <DayCard key={day.date || i} day={day} dayKey={DAY_KEYS[i]} tCommon={tCommon} tWorkouts={tWorkouts} />
          ))}
        </div>
      )}

      {/* Weekly summary */}
      {plan && (
        <div className="mt-8 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
          <h2 className="mb-4 text-lg font-semibold text-primary">{tCommon('weekSummary')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard
              label={tCommon('trainingDays')}
              value={String(plan.days.filter(d => d.recommendationType === 'Workout').length)}
            />
            <SummaryCard
              label={tCommon('restDays')}
              value={String(plan.days.filter(d => d.recommendationType !== 'Workout').length)}
            />
            <SummaryCard
              label={tCommon('totalDuration')}
              value={`${plan.days.reduce((sum, d) => sum + (d.recommendedWorkout?.durationMinutes ?? 0), 0)} ${tCommon('min')}`}
            />
            <SummaryCard
              label={tCommon('totalTssLabel')}
              value={String(plan.days.reduce((sum, d) => sum + (d.recommendedWorkout?.estimatedTSS ?? 0), 0))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

function DayCard({ day, dayKey, tCommon, tWorkouts }: { day: DailyRecommendationDto; dayKey: string; tCommon: (key: string) => string; tWorkouts: (key: string) => string }) {
  const isToday = day.date === new Date().toISOString().split('T')[0];
  const workout = day.recommendedWorkout;
  const categoryColor = workout ? (CATEGORY_COLORS[workout.category] || 'bg-muted text-primary dark:bg-muted dark:text-primary') : '';

  const statusColors: Record<string, string> = {
    Completed: 'border-border-default bg-muted',
    Skipped: 'border-border-default bg-page',
    Accepted: 'border-border-default bg-state-active-bg',
    Pending: 'border-border-default bg-surface',
  };

  return (
    <div className={`rounded-xl p-4 shadow-sm ring-1 ${statusColors[day.status] || 'ring-border-default bg-surface'} ${isToday ? 'ring-2 ring-accent' : ''}`}>
      <div className="mb-2">
        <div className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-secondary'}`}>{tCommon(dayKey)}</div>
        <div className="text-xs text-tertiary">{formatDate(day.date)}</div>
      </div>

      {/* Readiness indicator */}
      <div className="mb-2 flex items-center gap-1">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getScoreColor(day.readinessScore) }} />
        <span className="text-xs text-tertiary">{Math.round(day.readinessScore)}</span>
      </div>

      {day.recommendationType === 'RestDay' && (
        <div className="text-center">
          <p className="text-lg">😴</p>
          <p className="text-xs font-medium text-tertiary">{tCommon('rest')}</p>
        </div>
      )}

      {day.recommendationType === 'AlternativeActivity' && (
        <div className="text-center">
          <p className="text-lg">🚶</p>
          <p className="text-xs font-medium text-tertiary">{tCommon('walk')}</p>
        </div>
      )}

      {workout && day.recommendationType === 'Workout' && (
        <div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}>
            {tWorkouts(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
          </span>
          <p className="mt-1 truncate text-xs font-medium text-primary" title={workout.name}>
            {workout.name}
          </p>
          <p className="text-[10px] text-tertiary">{workout.durationMinutes} {tCommon('min')} / {tCommon('tssLabel')} {workout.estimatedTSS}</p>
        </div>
      )}

      {day.status === 'Completed' && (
        <div className="mt-1 text-center text-xs text-state-success-text">✓ {tCommon('done')}</div>
      )}
      {day.status === 'Skipped' && (
        <div className="mt-1 text-center text-xs text-tertiary">{tWorkouts('statusSkipped')}</div>
      )}

      {isToday && day.recommendationType === 'Workout' && (
        <Link to="/workout/today"
          className="mt-2 block rounded bg-accent py-1 text-center text-[10px] font-medium text-accent-foreground hover:opacity-90">
          {tCommon('view')}
        </Link>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-page p-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-tertiary">{label}</p>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score < 20) return '#ef4444';
  if (score < 40) return '#f97316';
  if (score < 60) return '#eab308';
  if (score < 80) return '#22c55e';
  return '#10b981';
}
