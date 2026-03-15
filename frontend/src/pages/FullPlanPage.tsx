import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recommendationsApi } from '../services/api';
import { trainingPreferenceApi } from '../services/api';
import { HowRecommendationsWork } from '../components/workouts/HowRecommendationsWork';
import type { FullPlanDto, DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';
import { formatDate } from '../utils/format';

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const;

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

export const FullPlanPage = () => {
  const { t: tErr } = useTranslation('errors');
  const { t: tCommon } = useTranslation('common');
  const { t: tToday } = useTranslation('todayWorkout');
  const { t: tWorkouts } = useTranslation('workouts');
  const [plan, setPlan] = useState<FullPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    trainingPreferenceApi.get()
      .then(({ data }) => (cancelled ? undefined : data.planDurationWeeks))
      .catch(() => 12)
      .then((w) => {
        const numWeeks = Math.min(Math.max(1, w ?? 12), 16);
        if (cancelled) return;
        return recommendationsApi.getPlan(numWeeks);
      })
      .then((res) => {
        if (cancelled || !res) return;
        setPlan(res.data);
        setExpandedWeek(0);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? tErr('requestFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{tCommon('fullPlanTitle')}</h1>
        <p className="mt-1 text-secondary">
          {formatDate(plan.planStart)} - {formatDate(plan.planEnd)}
          {' '}({plan.weeks} {tCommon('week').toLowerCase()}s)
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/workout/today" className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted">
          {tCommon('todaysWorkout')}
        </Link>
        <Link to="/workout/week" className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted">
          {tCommon('weeklyView')}
        </Link>
        <Link to="/training-setup" className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted">
          {tToday('adjustPlan')}
        </Link>
      </div>

      <div className="mb-6">
        <HowRecommendationsWork />
      </div>

      <div className="space-y-4">
        {plan.weeksData.map((week, weekIndex) => (
          <div key={week.weekStart} className="rounded-xl bg-surface shadow-sm ring-1 ring-border-default">
            <button
              type="button"
              onClick={() => setExpandedWeek(expandedWeek === weekIndex ? -1 : weekIndex)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-page"
            >
              <span className="font-semibold text-primary">
                {tCommon('week')} {weekIndex + 1}: {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
              </span>
              <span className="text-sm text-tertiary">
                {tCommon('trainingDaysCount', { count: week.days.filter(d => d.recommendationType === 'Workout').length })}
              </span>
              <span className="text-tertiary">{expandedWeek === weekIndex ? '▼' : '▶'}</span>
            </button>
            {expandedWeek === weekIndex && (
              <div className="border-t border-border-default p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
                  {week.days.map((day, i) => (
                    <DayCard key={day.date ?? i} day={day} dayKey={DAY_KEYS[i]} tCommon={tCommon} tWorkouts={tWorkouts} />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-muted p-3 text-sm text-primary">
                  <span>{tCommon('trainingDays')}: {week.days.filter(d => d.recommendationType === 'Workout').length} {tCommon('days')}</span>
                  <span>
                    {tCommon('totalDuration')}: {week.days.reduce((sum, d) => sum + (d.recommendedWorkout?.durationMinutes ?? 0), 0)} {tCommon('min')}
                  </span>
                  <span>{tCommon('tssLabel')}: {week.days.reduce((sum, d) => sum + (d.recommendedWorkout?.estimatedTSS ?? 0), 0)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function DayCard({ day, dayKey, tCommon, tWorkouts }: { day: DailyRecommendationDto; dayKey: string; tCommon: (key: string) => string; tWorkouts: (key: string) => string }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = day.date === todayStr;
  const workout = day.recommendedWorkout;
  const categoryColor = workout ? (CATEGORY_COLORS[workout.category] || 'bg-muted text-primary dark:bg-muted dark:text-primary') : '';

  const statusColors: Record<string, string> = {
    Completed: 'border-border-default bg-muted',
    Skipped: 'border-border-default bg-page',
    Accepted: 'border-border-default bg-state-active-bg',
    Pending: 'border-border-default bg-surface',
  };

  return (
    <div className={`rounded-lg p-3 ring-1 ${statusColors[day.status] || 'ring-border-default bg-surface'} ${isToday ? 'ring-2 ring-accent' : ''}`}>
      <div className="mb-1">
        <div className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-secondary'}`}>{tCommon(dayKey)}</div>
        <div className="text-[10px] text-tertiary">{formatDate(day.date)}</div>
      </div>
      {day.recommendationType === 'RestDay' && (
        <div className="text-center">
          <p className="text-sm">😴</p>
          <p className="text-[10px] text-tertiary">{tCommon('rest')}</p>
        </div>
      )}
      {day.recommendationType === 'AlternativeActivity' && (
        <div className="text-center">
          <p className="text-sm">🚶</p>
          <p className="text-[10px] text-tertiary">{tCommon('walk')}</p>
        </div>
      )}
      {workout && day.recommendationType === 'Workout' && (
        <div>
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${categoryColor}`}>
            {tWorkouts(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
          </span>
          <p className="mt-1 truncate text-[10px] font-medium text-primary" title={workout.name}>
            {workout.name}
          </p>
          <p className="text-[10px] text-tertiary">{workout.durationMinutes} {tCommon('min')} / {tCommon('tssLabel')} {workout.estimatedTSS}</p>
          {isToday && (
            <Link
              to="/workout/today"
              className="mt-1 block rounded bg-accent py-0.5 text-center text-[10px] font-medium text-accent-foreground hover:opacity-90"
            >
              {tCommon('view')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
