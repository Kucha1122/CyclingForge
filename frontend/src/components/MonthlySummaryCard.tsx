import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/format';

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
  const { t } = useTranslation('dashboard');
  const monthName = formatDate(new Date(year, month - 1), { month: 'long', year: 'numeric' });

  const formatTime = (timeString: string) => {
    const match = timeString.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeString;
    const [, hours, minutes] = match;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onPrevMonth && (
            <button
              type="button"
              onClick={onPrevMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface text-secondary transition-colors hover:bg-muted"
              aria-label={t('prevMonth')}
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">{monthName}</h2>
            <p className="text-sm text-tertiary">
              {isCurrentMonth ? t('monthSummary') : t('archive')}
            </p>
          </div>
          {onNextMonth && canGoNext && (
            <button
              type="button"
              onClick={onNextMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface text-secondary transition-colors hover:bg-muted"
              aria-label={t('nextMonth')}
            >
              →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm text-secondary">{t('totalActivities')}</p>
          <p className="text-xl font-bold text-primary">{totalActivities}</p>
          <p className="text-xs text-tertiary">{t('rideRunCount', { rideCount, runCount })}</p>
        </div>

        <div>
          <p className="text-sm text-secondary">{t('distance')}</p>
          <p className="text-xl font-bold text-primary">{totalDistance.toFixed(1)} km</p>
        </div>

        <div>
          <p className="text-sm text-secondary">{t('movingTime')}</p>
          <p className="text-xl font-bold text-primary">{formatTime(totalMovingTime)}</p>
        </div>

        <div>
          <p className="text-sm text-secondary">{t('elevationGain')}</p>
          <p className="text-xl font-bold text-primary">{totalElevationGain.toFixed(0)} m</p>
        </div>

        {totalTSS !== null && (
          <div>
            <p className="text-sm text-secondary">{t('totalTSS')}</p>
            <p className="text-xl font-bold text-primary">{totalTSS.toFixed(0)}</p>
          </div>
        )}

        {averageCTL !== null && (
          <div>
            <p className="text-sm text-secondary">{t('avgFitnessCtl')}</p>
            <p className="text-xl font-bold text-primary">{averageCTL.toFixed(1)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
