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
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onPrevWeek && (
            <button
              type="button"
              onClick={onPrevWeek}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface text-secondary transition-colors hover:bg-muted"
              aria-label={t('prevWeek')}
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">
              {isCurrentWeek ? t('thisWeek') : dateRange}
            </h2>
            {isCurrentWeek && (
              <span className="text-sm text-tertiary">{dateRange}</span>
            )}
          </div>
          {onNextWeek && canGoNext && (
            <button
              type="button"
              onClick={onNextWeek}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface text-secondary transition-colors hover:bg-muted"
              aria-label={t('nextWeek')}
            >
              →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-state-active-bg p-4">
          <p className="text-sm text-state-active-text">{t('totalActivities')}</p>
          <p className="text-2xl font-bold text-state-active-text">{totalActivities}</p>
          <p className="text-xs text-state-active-text">{t('rideRunCount', { rideCount, runCount })}</p>
        </div>

        <div className="rounded-lg bg-state-success-bg p-4 ring-1 ring-border-default">
          <p className="text-sm text-state-success-text">{t('distance')}</p>
          <p className="text-2xl font-bold text-state-success-text">{totalDistance.toFixed(1)} km</p>
        </div>

        <div className="rounded-lg bg-muted p-4 ring-1 ring-border-default">
          <p className="text-sm text-secondary">{t('movingTime')}</p>
          <p className="text-2xl font-bold text-primary">{formatTime(totalMovingTime)}</p>
        </div>

        {totalTSS !== null && (
          <div className="rounded-lg bg-state-active-bg p-4 ring-1 ring-border-default">
            <p className="text-sm text-state-active-text">{t('totalTSS')}</p>
            <p className="text-2xl font-bold text-state-active-text">{totalTSS.toFixed(0)}</p>
          </div>
        )}

        {totalTSS === null && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-secondary">{t('elevationGain')}</p>
            <p className="text-2xl font-bold text-secondary">{totalElevationGain.toFixed(0)} m</p>
          </div>
        )}
      </div>
    </div>
  );
};
