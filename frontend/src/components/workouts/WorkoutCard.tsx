import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WorkoutSummaryDto } from '../../types/workout';
import { CATEGORY_COLORS } from '../../types/workout';
import { workoutsApi } from '../../services/api';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

interface WorkoutCardProps {
  workout: WorkoutSummaryDto;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export const WorkoutCard = ({ workout, onDelete, showActions }: WorkoutCardProps) => {
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const categoryColor = CATEGORY_COLORS[workout.category] || 'bg-muted text-primary dark:bg-muted dark:text-primary';
  const isUserWorkout = workout.source === 'UserCreated' || workout.source === 'Imported';

  const handleCopy = async () => {
    setCopying(true);
    try {
      const { data: newId } = await workoutsApi.copy(workout.id);
      navigate(`/workouts/${newId}/edit`);
    } catch {
      // ignore
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border-default transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <Link
            to={`/workouts/${workout.id}`}
            className="text-lg font-semibold text-primary hover:text-accent"
          >
            {workout.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
              {t(CATEGORY_I18N_KEYS[workout.category] ?? 'categoryMixed')}
            </span>
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-secondary">
              {workout.targetZone}
            </span>
            {isUserWorkout && (
              <span className="inline-flex rounded-full bg-state-active-bg px-2.5 py-0.5 text-xs font-medium text-state-active-text">
                {workout.source === 'Imported' ? t('imported') : t('custom')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-tertiary">
        <div className="flex items-center gap-1">
          <span>⏱</span>
          <span>{workout.durationMinutes} {tCommon('min')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💪</span>
          <span>{tCommon('tssLabel')} {workout.estimatedTSS}</span>
        </div>
      </div>

      {workout.tags && (
        <div className="mt-2 flex flex-wrap gap-1">
          {workout.tags.split(',').map(tag => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-tertiary">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {showActions && (
        <div className="mt-3 flex gap-2 border-t border-border-default pt-3">
          {isUserWorkout && (
            <Link
              to={`/workouts/${workout.id}/edit`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-state-active-bg"
            >
              {t('edit')}
            </Link>
          )}
          <button
            onClick={handleCopy}
            disabled={copying}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-state-success-text hover:bg-state-success-bg disabled:opacity-50"
          >
            {copying ? t('copying') : t('copy')}
          </button>
          {onDelete && (isUserWorkout || workout.source === 'System' || workout.source === 'Generated') && (
            <button
              onClick={() => onDelete(workout.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-state-danger-text hover:bg-state-danger-bg"
            >
              {t('delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
