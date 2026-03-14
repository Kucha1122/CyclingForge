import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workoutsApi, usersApi } from '../services/api';
import { IntervalChart } from '../components/workouts/IntervalChart';
import type { WorkoutDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';
import { useAuth } from '../context/AuthContext';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};
const STEP_TYPE_I18N_KEYS: Record<string, string> = {
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};
const WORKOUT_NAME_KEYS: Record<string, string> = {
  'Progressive endurance with ramp finish': 'nameProgressiveEnduranceRamp',
};

export const WorkoutDetailPage = () => {
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<WorkoutDto | null>(null);
  const [ftp, setFtp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!id) return;
    workoutsApi.getById(id)
      .then(({ data }) => setWorkout(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user?.userId) return;
    usersApi.getProfile(user.userId)
      .then(({ data }) => setFtp(data.functionalThresholdPower))
      .catch(() => {});
  }, [user?.userId]);

  const handleCopy = async () => {
    if (!id) return;
    setCopying(true);
    try {
      const { data: newId } = await workoutsApi.copy(id);
      navigate(`/workouts/${newId}/edit`);
    } catch {
      // ignore
    } finally {
      setCopying(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const { data } = await workoutsApi.exportZwo(id);
      const blob = new Blob([data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workout?.name || 'workout'}.zwo`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">{t('loadingWorkouts')}</p></div>;
  }

  if (!workout) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">{t('workoutNotFound')}</p></div>;
  }

  const categoryColor = CATEGORY_COLORS[workout.category] || 'bg-gray-100 text-gray-800';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6">
        <Link to="/workouts" className="text-sm text-blue-600 hover:text-blue-800">
          {t('backToLibrary')}
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{WORKOUT_NAME_KEYS[workout.name] ? t(WORKOUT_NAME_KEYS[workout.name]) : workout.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColor}`}>
                  {t(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                  {workout.targetZone}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                  {workout.source === 'Imported' ? t('imported') : workout.source === 'UserCreated' ? t('custom') : workout.source === 'System' ? t('sourceSystem') : workout.source}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={copying}
                className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {copying ? t('copying') : t('copyWorkout')}
              </button>
              <button
                onClick={handleExport}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('exportZwo')}
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-2xl font-bold text-gray-900">{workout.durationMinutes} {tCommon('min')}</p>
            <p className="text-sm text-gray-500">{t('duration')}</p>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-2xl font-bold text-gray-900">{workout.estimatedTSS}</p>
            <p className="text-sm text-gray-500">{t('estimatedTSS')}</p>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-2xl font-bold text-gray-900">{workout.steps.length}</p>
            <p className="text-sm text-gray-500">{t('steps')}</p>
          </div>
        </div>

        {/* Description */}
        {workout.description && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('description')}</h2>
            <p className="text-gray-600">{workout.description}</p>
          </div>
        )}

        {/* Interval Chart */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('workoutProfile')}</h2>
          <IntervalChart steps={workout.steps} height={200} ftp={ftp ?? undefined} />
        </div>

        {/* Steps Table */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('steps')}</h2>
            {ftp && ftp > 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                FTP: {ftp}W
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">{t('hash')}</th>
                  <th className="pb-2 pr-4">{t('type')}</th>
                  <th className="pb-2 pr-4">{t('duration')}</th>
                  <th className="pb-2 pr-4">{t('power')}</th>
                  <th className="pb-2 pr-4">{t('cadence')}</th>
                  <th className="pb-2">{t('details')}</th>
                </tr>
              </thead>
              <tbody>
                {workout.steps.sort((a, b) => a.order - b.order).map(step => (
                  <tr key={step.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-400">{step.order}</td>
                    <td className="py-2 pr-4 font-medium">{t(STEP_TYPE_I18N_KEYS[step.type] ?? step.type)}</td>
                    <td className="py-2 pr-4">{formatDuration(step.durationSeconds)}</td>
                    <td className="py-2 pr-4">
                      <span className="text-gray-700">
                        {step.powerLow === step.powerHigh
                          ? `${Math.round(step.powerHigh * 100)}%`
                          : `${Math.round(step.powerLow * 100)}–${Math.round(step.powerHigh * 100)}%`}
                      </span>
                      {ftp && ftp > 0 && (
                        <span className="ml-1.5 font-medium text-yellow-600">
                          {step.powerLow === step.powerHigh
                            ? `${Math.round(step.powerHigh * ftp)}W`
                            : `${Math.round(step.powerLow * ftp)}–${Math.round(step.powerHigh * ftp)}W`}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{step.cadence ?? '-'}</td>
                    <td className="py-2 text-gray-500">
                      {step.type === 'Intervals' && step.repeat && (
                        <span>
                          {step.repeat}x&nbsp;(
                          {formatDuration(step.onDurationSeconds ?? 0)}&nbsp;
                          {ftp && step.onPower != null
                            ? `@ ${Math.round((step.onPower ?? 0) * 100)}% / ${Math.round((step.onPower ?? 0) * ftp)}W`
                            : step.onPower != null ? `@ ${Math.round((step.onPower ?? 0) * 100)}%` : ''}
                          &nbsp;on&nbsp;/&nbsp;
                          {formatDuration(step.offDurationSeconds ?? 0)}&nbsp;
                          {ftp && step.offPower != null
                            ? `@ ${Math.round((step.offPower ?? 0) * 100)}% / ${Math.round((step.offPower ?? 0) * ftp)}W`
                            : step.offPower != null ? `@ ${Math.round((step.offPower ?? 0) * 100)}%` : ''}
                          &nbsp;off)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}m ${secs}s`;
}
