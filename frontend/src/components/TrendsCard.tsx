import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

interface TrendsCardProps {
  currentCTL: number;
  currentATL: number;
  /** Week averages (preferred for trend). */
  currentWeekAvgCtl?: number;
  currentWeekAvgAtl?: number;
  previousWeekAvgCtl?: number;
  previousWeekAvgAtl?: number;
  /** Fallback when week averages not available. */
  previousCTL?: number;
  previousATL?: number;
}

function TrendIndicator({ value, t }: { value: number; t: (key: string) => string }) {
  if (Math.abs(value) < 0.5) {
    return <span className="text-secondary">{t('trendStable')}</span>;
  }
  if (value > 0) {
    return <span className="text-state-success-text">↑ +{value.toFixed(1)}%</span>;
  }
  return <span className="text-state-danger-text">↓ {value.toFixed(1)}%</span>;
}

export const TrendsCard: FC<TrendsCardProps> = ({
  currentCTL,
  currentATL,
  currentWeekAvgCtl,
  currentWeekAvgAtl,
  previousWeekAvgCtl,
  previousWeekAvgAtl,
  previousCTL,
  previousATL,
}) => {
  const { t } = useTranslation('charts');

  const calculateTrend = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const ctlTrend = currentWeekAvgCtl != null && previousWeekAvgCtl != null && previousWeekAvgCtl !== 0
    ? ((currentWeekAvgCtl - previousWeekAvgCtl) / previousWeekAvgCtl) * 100
    : calculateTrend(currentCTL, previousCTL);
  const atlTrend = currentWeekAvgAtl != null && previousWeekAvgAtl != null && previousWeekAvgAtl !== 0
    ? ((currentWeekAvgAtl - previousWeekAvgAtl) / previousWeekAvgAtl) * 100
    : calculateTrend(currentATL, previousATL);

  const fitnessLevelText = currentCTL > 80 ? t('fitnessLevelExcellent')
    : currentCTL > 60 ? t('fitnessLevelGood')
    : currentCTL > 40 ? t('fitnessLevelModerate') : t('fitnessLevelBuilding');

  const fatigueText = currentATL > 100 ? t('fatigueHighLoad')
    : currentATL > 60 ? t('fatigueModerate')
    : currentATL > 30 ? t('fatigueFresh') : t('fatigueVeryFresh');

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h2 className="mb-4 text-xl font-semibold text-primary">{t('formTrendsTitle')}</h2>

      <div className="space-y-4">
        <div className="rounded-lg border border-border-default bg-state-active-bg p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-state-active-text">{t('ctl')}</span>
            <TrendIndicator value={ctlTrend} t={t} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-state-active-text">{currentCTL.toFixed(1)}</span>
            {(previousWeekAvgCtl !== undefined || previousCTL !== undefined) && (
              <span className="text-sm text-accent">
                {t('trendWas')} {previousWeekAvgCtl?.toFixed(1) ?? previousCTL?.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-state-active-text">{fitnessLevelText}</p>
        </div>

        <div className="rounded-lg border border-border-default bg-muted p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">{t('atl')}</span>
            <TrendIndicator value={atlTrend} t={t} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-secondary">{currentATL.toFixed(1)}</span>
            {(previousWeekAvgAtl !== undefined || previousATL !== undefined) && (
              <span className="text-sm text-secondary">
                {t('trendWas')} {previousWeekAvgAtl?.toFixed(1) ?? previousATL?.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-secondary">{fatigueText}</p>
        </div>

        <div className="rounded-lg border border-border-default bg-state-success-bg p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-state-success-text">{t('tsb')}</span>
            <span className="text-2xl font-bold text-state-success-text">{(currentCTL - currentATL).toFixed(1)}</span>
          </div>
          <p className="mt-1 text-xs text-state-success-text">{t('tsbBalance')}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-secondary">
        <p className="font-medium">{t('understandingTrends')}</p>
        <ul className="mt-1 space-y-1 pl-4">
          <li>• {t('trendRisingCtl')}</li>
          <li>• {t('trendHighAtl')}</li>
          <li>• {t('trendPositiveTsb')}</li>
        </ul>
      </div>
    </div>
  );
};
