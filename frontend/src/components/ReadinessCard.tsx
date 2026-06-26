import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoTooltip } from './InfoTooltip';

interface ReadinessCardProps {
  currentTSB: number;
  formStatus: string;
  recommendation: string;
  rampRateCtlPerWeek?: number;
}

const FORM_STATUS_KEYS: Record<string, string> = {
  Ryzykowna: 'tsbFormStatusRisky',
  Optymalna: 'tsbFormStatusOptimal',
  Przejściowa: 'tsbFormStatusTransition',
  Świeża: 'tsbFormStatusFresh',
  'Bardzo świeża': 'tsbFormStatusVeryFresh',
};

const RECOMMENDATION_KEY_MAP: Array<{ pattern: RegExp | string; key: string }> = [
  { pattern: /Świeżość w normie|Freshness in range|Good window for intense/i, key: 'tsbRecommendationFresh' },
  { pattern: /Strefa przejściowa|Transition zone|Możesz trenować umiarkowanie|train moderately/i, key: 'tsbRecommendationTransition' },
];

export const ReadinessCard: FC<ReadinessCardProps> = ({
  currentTSB,
  formStatus,
  recommendation,
  rampRateCtlPerWeek,
}) => {
  const { t } = useTranslation('charts');

  const getStatusColor = (tsb: number) => {
    if (tsb < -35) return 'bg-red-500';
    if (tsb < -10) return 'bg-green-500';
    if (tsb < 5) return 'bg-slate-500';
    if (tsb < 25) return 'bg-blue-500';
    return 'bg-purple-500';
  };

  const getStatusIcon = (tsb: number) => {
    if (tsb < -35) return '😫';
    if (tsb < -10) return '💪';
    if (tsb < 5) return '😐';
    if (tsb < 25) return '✨';
    return '⚡';
  };

  const formStatusKey = FORM_STATUS_KEYS[formStatus];
  const displayFormStatus = formStatusKey ? t(formStatusKey) : formStatus;

  const recEntry = RECOMMENDATION_KEY_MAP.find(({ pattern }) =>
    typeof pattern === 'string' ? recommendation.includes(pattern) : pattern.test(recommendation)
  );
  const displayRecommendation = recEntry ? t(recEntry.key) : recommendation;

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h2 className="mb-4 text-xl font-semibold text-primary">{t('readinessScore')}</h2>

      <div className="mb-6 text-center">
        <div className="mb-2 text-6xl">{getStatusIcon(currentTSB)}</div>
        <div className={`mx-auto mb-2 inline-block rounded-full px-4 py-2 text-white ${getStatusColor(currentTSB)}`}>
          <span className="text-2xl font-bold">{currentTSB.toFixed(1)}</span>
          <span className="ml-1 inline-flex items-center gap-1 text-sm">
            TSB
            <InfoTooltip text={t('glossaryTsb')} label="TSB" />
          </span>
        </div>
        <p className="text-lg font-semibold text-primary">{displayFormStatus}</p>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium text-primary">{t('recommendationTitle')}</p>
        <p className="mt-1 text-sm text-secondary">{displayRecommendation}</p>
        {rampRateCtlPerWeek != null && (
          <p className="mt-2 text-xs text-secondary">
            {rampRateCtlPerWeek > 7
              ? t('ctlTrendFocusRecovery', { value: t('ctlTrendLabel', { value: `${rampRateCtlPerWeek >= 0 ? '+' : ''}${rampRateCtlPerWeek.toFixed(1)}` }) })
              : t('ctlTrendLabel', { value: `${rampRateCtlPerWeek >= 0 ? '+' : ''}${rampRateCtlPerWeek.toFixed(1)}` })}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs text-secondary">
        <div className="flex items-center justify-between">
          <span>TSB &lt; -35</span>
          <span className="font-medium text-red-600 dark:text-red-400">{t('tsbZoneRisky')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>-35 to -10</span>
          <span className="font-medium text-green-600 dark:text-green-400">{t('tsbZoneOptimal')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>-10 to 5</span>
          <span className="font-medium text-slate-600 dark:text-slate-400">{t('tsbZoneTransition')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>5 to 25</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{t('tsbZoneFresh')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>&gt; 25</span>
          <span className="font-medium text-purple-600 dark:text-purple-400">{t('tsbZoneVeryFresh')}</span>
        </div>
      </div>
    </div>
  );
};
