import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkoutSummaryDto } from '../../types/workout';
import { CATEGORY_COLORS } from '../../types/workout';
import { workoutsApi } from '../../services/api';

interface WorkoutCardProps {
  workout: WorkoutSummaryDto;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export const WorkoutCard = ({ workout, onDelete, showActions }: WorkoutCardProps) => {
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const categoryColor = CATEGORY_COLORS[workout.category] || 'bg-gray-100 text-gray-800';
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
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <Link
            to={`/workouts/${workout.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {workout.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
              {workout.category}
            </span>
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {workout.targetZone}
            </span>
            {isUserWorkout && (
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                {workout.source === 'Imported' ? 'Imported' : 'Custom'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <span>⏱</span>
          <span>{workout.durationMinutes} min</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💪</span>
          <span>TSS {workout.estimatedTSS}</span>
        </div>
      </div>

      {workout.tags && (
        <div className="mt-2 flex flex-wrap gap-1">
          {workout.tags.split(',').map(tag => (
            <span key={tag} className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {showActions && (
        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          {isUserWorkout && (
            <Link
              to={`/workouts/${workout.id}/edit`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              Edit
            </Link>
          )}
          <button
            onClick={handleCopy}
            disabled={copying}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
          >
            {copying ? 'Copying…' : 'Copy'}
          </button>
          {onDelete && isUserWorkout && (
            <button
              onClick={() => onDelete(workout.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
