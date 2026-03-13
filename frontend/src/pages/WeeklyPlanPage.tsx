import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recommendationsApi } from '../services/api';
import type { WeeklyPlanDto, DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WeeklyPlanPage = () => {
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
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading weekly plan...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Weekly Plan</h1>
        {plan && (
          <p className="text-gray-600">
            {new Date(plan.weekStart).toLocaleDateString()} - {new Date(plan.weekEnd).toLocaleDateString()}
          </p>
        )}
      </header>

      {/* Week navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          ← Previous Week
        </button>
        <button onClick={() => setWeekOffset(0)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          Current Week
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          Next Week →
        </button>
      </div>

      {/* Weekly grid */}
      {plan && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {plan.days.map((day, i) => (
            <DayCard key={day.date || i} day={day} dayName={DAY_NAMES[i]} />
          ))}
        </div>
      )}

      {/* Weekly summary */}
      {plan && (
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Week Summary</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard
              label="Training Days"
              value={String(plan.days.filter(d => d.recommendationType === 'Workout').length)}
            />
            <SummaryCard
              label="Rest Days"
              value={String(plan.days.filter(d => d.recommendationType !== 'Workout').length)}
            />
            <SummaryCard
              label="Total Duration"
              value={`${plan.days.reduce((sum, d) => sum + (d.recommendedWorkout?.durationMinutes ?? 0), 0)} min`}
            />
            <SummaryCard
              label="Total TSS"
              value={String(plan.days.reduce((sum, d) => sum + (d.recommendedWorkout?.estimatedTSS ?? 0), 0))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function DayCard({ day, dayName }: { day: DailyRecommendationDto; dayName: string }) {
  const isToday = day.date === new Date().toISOString().split('T')[0];
  const workout = day.recommendedWorkout;
  const categoryColor = workout ? (CATEGORY_COLORS[workout.category] || 'bg-gray-100 text-gray-800') : '';

  const statusColors: Record<string, string> = {
    Completed: 'border-green-300 bg-green-50',
    Skipped: 'border-gray-300 bg-gray-50',
    Accepted: 'border-blue-300 bg-blue-50',
    Pending: 'border-gray-200 bg-white',
  };

  return (
    <div className={`rounded-xl p-4 shadow-sm ring-1 ${statusColors[day.status] || 'ring-gray-200 bg-white'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{dayName}</span>
        <span className="text-xs text-gray-400">
          {new Date(day.date).getDate()}
        </span>
      </div>

      {/* Readiness indicator */}
      <div className="mb-2 flex items-center gap-1">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getScoreColor(day.readinessScore) }} />
        <span className="text-xs text-gray-500">{Math.round(day.readinessScore)}</span>
      </div>

      {day.recommendationType === 'RestDay' && (
        <div className="text-center">
          <p className="text-lg">😴</p>
          <p className="text-xs font-medium text-gray-500">Rest</p>
        </div>
      )}

      {day.recommendationType === 'AlternativeActivity' && (
        <div className="text-center">
          <p className="text-lg">🚶</p>
          <p className="text-xs font-medium text-gray-500">Walk</p>
        </div>
      )}

      {workout && day.recommendationType === 'Workout' && (
        <div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}>
            {workout.category}
          </span>
          <p className="mt-1 truncate text-xs font-medium text-gray-900" title={workout.name}>
            {workout.name}
          </p>
          <p className="text-[10px] text-gray-400">{workout.durationMinutes}m / TSS {workout.estimatedTSS}</p>
        </div>
      )}

      {day.status === 'Completed' && (
        <div className="mt-1 text-center text-xs text-green-600">✓ Done</div>
      )}
      {day.status === 'Skipped' && (
        <div className="mt-1 text-center text-xs text-gray-400">Skipped</div>
      )}

      {isToday && day.recommendationType === 'Workout' && (
        <Link to="/workout/today"
          className="mt-2 block rounded bg-blue-600 py-1 text-center text-[10px] font-medium text-white hover:bg-blue-700">
          View
        </Link>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
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
