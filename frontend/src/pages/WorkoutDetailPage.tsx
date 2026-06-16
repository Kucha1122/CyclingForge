import { useState, useEffect, useRef } from 'react';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [highlightedStepOrder, setHighlightedStepOrder] = useState<number | null>(null);
  const highlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHighlight = (order: number | null) => {
    if (highlightClearRef.current) {
      clearTimeout(highlightClearRef.current);
      highlightClearRef.current = null;
    }
    setHighlightedStepOrder(order);
  };

  const scheduleClearHighlight = () => {
    highlightClearRef.current = setTimeout(() => {
      setHighlightedStepOrder(null);
      highlightClearRef.current = null;
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
  }, []);

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
      await workoutsApi.copy(id);
      navigate('/workouts?tab=mine');
    } catch {
      // ignore
    } finally {
      setCopying(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await workoutsApi.delete(id);
      setDeleteConfirmOpen(false);
      navigate('/workouts?tab=mine');
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const safeFileName = (name: string) => name.replace(/[/\\:*?"<>|]/g, '').trim() || 'workout';

  const handleExportZwo = async () => {
    if (!id) return;
    try {
      const { data } = await workoutsApi.exportZwo(id);
      const blob = new Blob([data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFileName(workout?.name ?? '')}.zwo`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleExportFit = async () => {
    if (!id) return;
    try {
      const { data } = await workoutsApi.exportFit(id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFileName(workout?.name ?? '')}.fit`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-page"><p className="text-tertiary">{t('loadingWorkouts')}</p></div>;
  }

  if (!workout) {
    return <div className="flex min-h-screen items-center justify-center bg-page"><p className="text-tertiary">{t('workoutNotFound')}</p></div>;
  }

  const categoryColor = CATEGORY_COLORS[workout.category] || 'bg-muted text-primary dark:bg-muted dark:text-primary';
  const isUserWorkout = workout.source === 'UserCreated' || workout.source === 'Imported';

  return (
    <div className="min-h-screen bg-page p-8">
      <div className="mb-6">
        <Link to="/workouts" className="text-sm text-accent hover:opacity-80">
          {t('backToLibrary')}
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">{WORKOUT_NAME_KEYS[workout.name] ? t(WORKOUT_NAME_KEYS[workout.name]) : workout.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColor}`}>
                  {t(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-secondary">
                  {workout.targetZone}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-secondary">
                  {workout.source === 'Imported' ? t('imported') : workout.source === 'UserCreated' ? t('custom') : workout.source === 'System' ? t('sourceSystem') : workout.source}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isUserWorkout && (
                <Link
                  to={`/workouts/${id}/edit`}
                  className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted"
                >
                  {t('edit')}
                </Link>
              )}
              <button
                onClick={handleCopy}
                disabled={copying}
                className="rounded-lg border border-border-default bg-state-success-bg px-4 py-2 text-sm font-medium text-state-success-text hover:opacity-90 disabled:opacity-50"
              >
                {copying ? t('copying') : t('copyWorkout')}
              </button>
              {(isUserWorkout || workout.source === 'System' || workout.source === 'Generated') && (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="rounded-lg border border-border-default bg-state-danger-bg px-4 py-2 text-sm font-medium text-state-danger-text hover:opacity-90"
                >
                  {t('delete')}
                </button>
              )}
              <button
                onClick={handleExportZwo}
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted"
              >
                {t('exportZwo')}
              </button>
              <button
                onClick={handleExportFit}
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted"
              >
                {t('exportFit')}
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface p-4 text-center shadow-sm ring-1 ring-border-default">
            <p className="text-2xl font-bold text-primary">{workout.durationMinutes} {tCommon('min')}</p>
            <p className="text-sm text-tertiary">{t('duration')}</p>
          </div>
          <div className="rounded-xl bg-surface p-4 text-center shadow-sm ring-1 ring-border-default">
            <p className="text-2xl font-bold text-primary">{workout.estimatedTSS}</p>
            <p className="text-sm text-tertiary">{t('estimatedTSS')}</p>
          </div>
          <div className="rounded-xl bg-surface p-4 text-center shadow-sm ring-1 ring-border-default">
            <p className="text-2xl font-bold text-primary">{workout.steps.length}</p>
            <p className="text-sm text-tertiary">{t('steps')}</p>
          </div>
        </div>

        {/* Description */}
        {workout.description && (
          <div className="mb-8 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-2 text-lg font-semibold text-primary">{t('description')}</h2>
            <p className="text-secondary">{workout.description}</p>
          </div>
        )}

        {/* Interval Chart */}
        <div className="mb-8 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-primary">{t('workoutProfile')}</h2>
            {highlightedStepOrder != null && (() => {
              const step = workout.steps.find((s) => Number(s.order) === highlightedStepOrder);
              if (!step) return null;
              return (
                <span
                  className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent transition-opacity duration-200"
                  role="status"
                >
                  {t('stepHighlightLabel', { order: step.order, type: t(STEP_TYPE_I18N_KEYS[step.type] ?? step.type) })}
                </span>
              );
            })()}
          </div>
          <IntervalChart steps={workout.steps} height={200} ftp={ftp ?? undefined} highlightedStepOrder={highlightedStepOrder} />
        </div>

        {/* Steps Table */}
        <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">{t('steps')}</h2>
            {ftp && ftp > 0 && (
              <span className="rounded-full bg-state-active-bg px-3 py-1 text-xs font-medium text-state-active-text">
                FTP: {ftp}W
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-tertiary">
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
                  <tr
                    key={step.id}
                    className={`cursor-default border-b border-border-default transition-colors duration-200 hover:bg-muted/50 ${Number(step.order) === highlightedStepOrder ? 'bg-accent/10' : ''}`}
                    onMouseEnter={() => setHighlight(Number(step.order))}
                    onMouseLeave={scheduleClearHighlight}
                  >
                    <td className="py-2 pr-4 text-tertiary">{step.order}</td>
                    <td className="py-2 pr-4 font-medium text-primary">{t(STEP_TYPE_I18N_KEYS[step.type] ?? step.type)}</td>
                    <td className="py-2 pr-4 text-primary">{formatDuration(step.durationSeconds)}</td>
                    <td className="py-2 pr-4">
                      <span className="text-secondary">
                        {step.powerLow === step.powerHigh
                          ? `${Math.round(step.powerHigh * 100)}%`
                          : `${Math.round(step.powerLow * 100)}–${Math.round(step.powerHigh * 100)}%`}
                      </span>
                      {ftp && ftp > 0 && (
                        <span className="ml-1.5 font-medium text-accent">
                          {step.powerLow === step.powerHigh
                            ? `${Math.round(step.powerHigh * ftp)}W`
                            : `${Math.round(step.powerLow * ftp)}–${Math.round(step.powerHigh * ftp)}W`}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-tertiary">
                      {step.type === 'Intervals' && (step.onCadence != null || step.offCadence != null)
                        ? `${step.onCadence ?? '–'} / ${step.offCadence ?? '–'}`
                        : (step.cadence ?? '-')}
                    </td>
                    <td className="py-2 text-tertiary">
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

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border-default">
            <h2 className="text-lg font-semibold text-primary">{t('deleteWorkout')}</h2>
            <p className="mt-2 text-sm text-secondary">
              {t('deleteWorkoutConfirm', { name: workout.name })}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-state-danger-bg px-4 py-2 text-sm font-medium text-state-danger-text hover:bg-state-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
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
