import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/format';

interface WeeklySummaryProps {
  weekStart: string;
  weekEnd: string;
  totalActivities: number;
  totalDistance: number;
  totalMovingTime: string;
  totalElevationGain: number;
  totalTSS: number | null;
  rideCount: number;
  runCount: number;
  isCurrentWeek?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  canGoNext?: boolean;
}

export const WeeklySummaryCard: FC<WeeklySummaryProps> = ({
  weekStart,
  weekEnd,
  totalActivities,
  totalDistance,
  totalMovingTime,
  totalElevationGain,
  totalTSS,
  rideCount,
  runCount,
  isCurrentWeek = true,
  onPrevWeek,
  onNextWeek,
  canGoNext = false,
}) => {
  const { t } = useTranslation('dashboard');
  const formatTime = (timeString: string) => {
    const match = timeString.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeString;
    const [, hours, minutes] = match;
    return `${hours}h ${minutes}m`;
  };

  const dateRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onPrevWeek && (
            <button
              type="button"
              onClick={onPrevWeek}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label={t('prevWeek')}
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {isCurrentWeek ? t('thisWeek') : dateRange}
            </h2>
            {isCurrentWeek && (
              <span className="text-sm text-gray-500">{dateRange}</span>
            )}
          </div>
          {onNextWeek && canGoNext && (
            <button
              type="button"
              onClick={onNextWeek}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label={t('nextWeek')}
            >
              →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-600">{t('totalActivities')}</p>
          <p className="text-2xl font-bold text-blue-700">{totalActivities}</p>
          <p className="text-xs text-blue-600">{t('rideRunCount', { rideCount, runCount })}</p>
        </div>

        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-600">{t('distance')}</p>
          <p className="text-2xl font-bold text-green-700">{totalDistance.toFixed(1)} km</p>
        </div>

        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-purple-600">{t('movingTime')}</p>
          <p className="text-2xl font-bold text-purple-700">{formatTime(totalMovingTime)}</p>
        </div>

        {totalTSS !== null && (
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-600">{t('totalTSS')}</p>
            <p className="text-2xl font-bold text-orange-700">{totalTSS.toFixed(0)}</p>
          </div>
        )}

        {totalTSS === null && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">{t('elevationGain')}</p>
            <p className="text-2xl font-bold text-gray-700">{totalElevationGain.toFixed(0)} m</p>
          </div>
        )}
      </div>
    </div>
  );
};
