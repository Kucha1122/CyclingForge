import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recommendationsApi } from '../services/api';
import { ReadinessGauge } from '../components/workouts/ReadinessGauge';
import { IntervalChart } from '../components/workouts/IntervalChart';
import { HowRecommendationsWork } from '../components/workouts/HowRecommendationsWork';
import type { DailyRecommendationDto, ReadinessBreakdownDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';
import { formatDate } from '../utils/format';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};
const STATUS_I18N_KEYS: Record<string, string> = {
  Pending: 'statusPending', Accepted: 'statusAccepted', Skipped: 'statusSkipped', Completed: 'statusCompleted',
};
const WORKOUT_NAME_KEYS: Record<string, string> = {
  'Progressive endurance with ramp finish': 'nameProgressiveEnduranceRamp',
};

/** Parse backend reason string and return translated text. */
function translateReason(
  reason: string,
  t: (key: string, opts?: object) => string,
  tWorkouts: (key: string) => string
): string {
  const parts: string[] = [];
  if (reason.includes('Rest day recommended')) {
    parts.push(t('reasonRestDay'));
  } else if (reason.includes('Consider a light walk')) {
    parts.push(t('reasonLightWalk'));
  } else {
    const workoutMatch = reason.match(/Recommended a (\w+) workout based on your current readiness\./);
    if (workoutMatch) {
      const categoryKey = CATEGORY_I18N_KEYS[workoutMatch[1]] ?? 'categoryMixed';
      parts.push(t('reasonRecommendedWorkout', { category: tWorkouts(categoryKey) }));
    } else {
      parts.push(reason.split('.')[0] || reason);
    }
  }
  const scoreMatch = reason.match(/Readiness score: (\d+)\/100\.?/);
  if (scoreMatch) parts.push(t('reasonReadinessScore', { score: scoreMatch[1] }));
  const formMatch = reason.match(/Form \(TSB\): ([\d.,]+)\.?/);
  if (formMatch) parts.push(t('reasonFormTsb', { value: formMatch[1] }));
  const bbMatch = reason.match(/Body Battery: ([\d]+)\/100\.?/);
  if (bbMatch) parts.push(t('reasonBodyBattery', { value: bbMatch[1] }));
  const sleepMatch = reason.match(/Sleep Score: ([\d]+)\/100\.?/);
  if (sleepMatch) parts.push(t('reasonSleepScore', { value: sleepMatch[1] }));
  const trMatch = reason.match(/Training Readiness: ([\d]+)\/100\.?/);
  if (trMatch) parts.push(t('reasonTrainingReadiness', { value: trMatch[1] }));
  return parts.join(' ');
}

export const TodayWorkoutPage = () => {
  const { t, i18n } = useTranslation('todayWorkout');
  const tCommon = useTranslation('common').t;
  const tWorkouts = useTranslation('workouts').t;
  const [recommendation, setRecommendation] = useState<DailyRecommendationDto | null>(null);
  const [readiness, setReadiness] = useState<ReadinessBreakdownDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [noPreference, setNoPreference] = useState(false);

  useEffect(() => {
    Promise.all([
      recommendationsApi.getToday().catch(() => null),
      recommendationsApi.getReadiness().catch(() => null),
    ]).then(([recoRes, readinessRes]) => {
      if (recoRes?.data) {
        if ('message' in (recoRes.data as object)) {
          setNoPreference(true);
        } else {
          setRecommendation(recoRes.data as DailyRecommendationDto);
        }
      }
      if (readinessRes?.data) {
        setReadiness(readinessRes.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const [regenerating, setRegenerating] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    if (!recommendation) return;
    try {
      await recommendationsApi.updateStatus(recommendation.id, status);
      setRecommendation(prev => prev ? { ...prev, status } : null);
    } catch {
      // ignore
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data } = await recommendationsApi.regenerateToday();
      setRecommendation(data);
    } catch {
      // ignore
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">{t('loadingWorkout')}</p></div>;
  }

  if (noPreference) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{t('setUpTitle')}</h1>
          <p className="mb-6 text-gray-600">{t('setUpDesc')}</p>
          <Link to="/training-setup"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">
            {tCommon('getStarted')}
          </Link>
        </div>
      </div>
    );
  }

  const workout = recommendation?.recommendedWorkout;
  const altWorkout = recommendation?.alternativeWorkout;

  return (
    <div key={i18n.language} className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>

      <div className="mx-auto max-w-4xl">
        {/* Readiness Score */}
        <div className="mb-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <ReadinessGauge score={readiness?.overallScore ?? recommendation?.readinessScore ?? 50} size="lg" />
            <div className="flex-1">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('readinessBreakdown')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {readiness?.tsbValue != null && (
                  <MetricCard label={t('formTsb')} value={readiness.tsbValue.toFixed(1)} score={readiness.tsbScore} />
                )}
                {readiness?.bodyBatteryValue != null && (
                  <MetricCard label={t('bodyBattery')} value={`${readiness.bodyBatteryValue}/100`} score={readiness.bodyBatteryScore} />
                )}
                {readiness?.sleepScoreValue != null && (
                  <MetricCard label={t('sleepScore')} value={`${readiness.sleepScoreValue}/100`} score={readiness.sleepScore} />
                )}
                {readiness?.trainingReadinessValue != null && (
                  <MetricCard label={t('trainingReadiness')} value={`${readiness.trainingReadinessValue}/100`} score={readiness.trainingReadinessScore} />
                )}
                {readiness?.stressValue != null && (
                  <MetricCard label={t('stressLevel')} value={`${readiness.stressValue}/100`} score={readiness.stressScore} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation Reason */}
        {recommendation?.reason && (
          <div className="mb-6 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
            <p className="text-sm text-blue-800">{translateReason(recommendation.reason, t, tWorkouts)}</p>
          </div>
        )}

        {/* Rest / Alternative Activity */}
        {recommendation?.recommendationType === 'RestDay' && (
          <div className="rounded-xl bg-green-50 p-8 text-center ring-1 ring-green-200">
            <span className="text-4xl">😴</span>
            <h2 className="mt-4 text-2xl font-bold text-green-800">{t('restDay')}</h2>
            <p className="mt-2 text-green-700">{t('restDayDesc')}</p>
          </div>
        )}

        {recommendation?.recommendationType === 'AlternativeActivity' && (
          <div className="rounded-xl bg-amber-50 p-8 text-center ring-1 ring-amber-200">
            <span className="text-4xl">🚶</span>
            <h2 className="mt-4 text-2xl font-bold text-amber-800">{t('activeRecovery')}</h2>
            <p className="mt-2 text-amber-700">{t('activeRecoveryDesc')}</p>
          </div>
        )}

        {/* Recommended Workout */}
        {workout && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{WORKOUT_NAME_KEYS[workout.name] ? tWorkouts(WORKOUT_NAME_KEYS[workout.name]) : workout.name}</h2>
                <div className="mt-2 flex gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_COLORS[workout.category] || ''}`}>
                    {tWorkouts(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    {workout.durationMinutes} {tCommon('min')}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    {tCommon('tssLabel')} {workout.estimatedTSS}
                  </span>
                </div>
              </div>
              {recommendation.status === 'Pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusUpdate('Accepted')}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    {tCommon('accept')}
                  </button>
                  <button onClick={() => handleStatusUpdate('Skipped')}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    {tCommon('skip')}
                  </button>
                </div>
              )}
              {recommendation.status !== 'Pending' && (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  recommendation.status === 'Accepted' ? 'bg-green-100 text-green-800'
                    : recommendation.status === 'Completed' ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {tWorkouts(STATUS_I18N_KEYS[recommendation.status] ?? recommendation.status)}
                </span>
              )}
            </div>

            {workout.description && (
              <p className="mb-4 text-sm text-gray-600">{workout.description}</p>
            )}

            <IntervalChart steps={workout.steps} height={160} />

            <div className="mt-4 text-center">
              <Link to={`/workouts/${workout.id}`}
                className="text-sm text-blue-600 hover:text-blue-800">
                {t('viewFullWorkout')}
              </Link>
            </div>
          </div>
        )}

        {/* Alternative Workout */}
        {altWorkout && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 className="mb-3 text-sm font-medium text-gray-500">{t('alternativeOption')}</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{WORKOUT_NAME_KEYS[altWorkout.name] ? tWorkouts(WORKOUT_NAME_KEYS[altWorkout.name]) : altWorkout.name}</p>
                <div className="mt-1 flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[altWorkout.category] || ''}`}>
                    {tWorkouts(CATEGORY_I18N_KEYS[altWorkout.category] ?? 'categoryMixed')}
                  </span>
                  <span className="text-xs text-gray-500">{altWorkout.durationMinutes} {tCommon('min')} / {tCommon('tssLabel')} {altWorkout.estimatedTSS}</span>
                </div>
              </div>
              <Link to={`/workouts/${altWorkout.id}`}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                {t('view')}
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8">
          <HowRecommendationsWork />
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/workout/week" className="flex-1 min-w-[140px] rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50">
            <p className="font-medium text-gray-900">{t('weeklyPlan')}</p>
            <p className="text-sm text-gray-500">{t('seeFullWeek')}</p>
          </Link>
          <Link to="/workouts" className="flex-1 min-w-[140px] rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50">
            <p className="font-medium text-gray-900">{t('browseLibrary')}</p>
            <p className="text-sm text-gray-500">{t('pickDifferentWorkout')}</p>
          </Link>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex-1 min-w-[140px] rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 disabled:opacity-50"
          >
            <p className="font-medium text-gray-900">{regenerating ? t('regenerating') : tCommon('regenerate')}</p>
            <p className="text-sm text-gray-500">{t('getNewRecommendation')}</p>
          </button>
          <Link to="/training-setup" className="flex-1 min-w-[140px] rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50">
            <p className="font-medium text-gray-900">{t('adjustPlan')}</p>
            <p className="text-sm text-gray-500">{t('changePreferences')}</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

function MetricCard({ label, value, score }: { label: string; value: string; score: number | null }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      {score != null && (
        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        </div>
      )}
    </div>
  );
}
