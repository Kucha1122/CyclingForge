import { type FC } from 'react';

interface MonthlySummaryProps {
  year: number;
  month: number;
  totalActivities: number;
  totalDistance: number;
  totalMovingTime: string;
  totalElevationGain: number;
  totalTSS: number | null;
  averageCTL: number | null;
  rideCount: number;
  runCount: number;
  isCurrentMonth?: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  canGoNext?: boolean;
}

export const MonthlySummaryCard: FC<MonthlySummaryProps> = ({
  year,
  month,
  totalActivities,
  totalDistance,
  totalMovingTime,
  totalElevationGain,
  totalTSS,
  averageCTL,
  rideCount,
  runCount,
  isCurrentMonth = true,
  onPrevMonth,
  onNextMonth,
  canGoNext = false,
}) => {
  const monthName = new Date(year, month - 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  const formatTime = (timeString: string) => {
    const match = timeString.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeString;
    const [, hours, minutes] = match;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onPrevMonth && (
            <button
              type="button"
              onClick={onPrevMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label="Poprzedni miesiąc"
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
            <p className="text-sm text-gray-500">
              {isCurrentMonth ? 'Podsumowanie miesiąca' : 'Archiwum'}
            </p>
          </div>
          {onNextMonth && canGoNext && (
            <button
              type="button"
              onClick={onNextMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label="Następny miesiąc"
            >
              →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm text-gray-600">Total Activities</p>
          <p className="text-xl font-bold text-gray-900">{totalActivities}</p>
          <p className="text-xs text-gray-500">{rideCount} rides, {runCount} runs</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Distance</p>
          <p className="text-xl font-bold text-gray-900">{totalDistance.toFixed(1)} km</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Moving Time</p>
          <p className="text-xl font-bold text-gray-900">{formatTime(totalMovingTime)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Elevation Gain</p>
          <p className="text-xl font-bold text-gray-900">{totalElevationGain.toFixed(0)} m</p>
        </div>

        {totalTSS !== null && (
          <div>
            <p className="text-sm text-gray-600">Total TSS</p>
            <p className="text-xl font-bold text-gray-900">{totalTSS.toFixed(0)}</p>
          </div>
        )}

        {averageCTL !== null && (
          <div>
            <p className="text-sm text-gray-600">Avg Fitness (CTL)</p>
            <p className="text-xl font-bold text-gray-900">{averageCTL.toFixed(1)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
