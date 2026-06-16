import { useTranslation } from 'react-i18next';
import type { WellnessDataDto } from '../../types/garmin';
import { formatDate } from '../../utils/format';

interface Props {
  wellness: WellnessDataDto | null;
}

type LevelStyle = { bg: string; text: string; bar: string };

function getReadinessStyle(level: string | null): LevelStyle {
  switch (level?.toUpperCase()) {
    case 'READY':
    case 'PRIME':
      return { bg: 'bg-state-success-bg', text: 'text-state-success-text', bar: 'bg-green-500' };
    case 'MODERATE':
    case 'RECOVERY':
      return { bg: 'bg-state-active-bg', text: 'text-state-active-text', bar: 'bg-blue-500' };
    case 'LOW':
    case 'POOR':
      return { bg: 'bg-state-danger-bg', text: 'text-state-danger-text', bar: 'bg-red-500' };
    default:
      return { bg: 'bg-muted', text: 'text-primary', bar: 'bg-accent' };
  }
}

/** Maps a Garmin readiness level to a localized description key. */
function levelDescriptionKey(level: string | null): string {
  switch (level?.toUpperCase()) {
    case 'PRIME':
      return 'trPrime';
    case 'READY':
      return 'trReady';
    case 'MODERATE':
      return 'trModerate';
    case 'RECOVERY':
      return 'trRecovery';
    case 'LOW':
      return 'trLow';
    case 'POOR':
      return 'trPoor';
    default:
      return 'trUnknown';
  }
}

export const TrainingReadinessCard = ({ wellness }: Props) => {
  const { t } = useTranslation('dashboard');

  if (!wellness || wellness.trainingReadinessScore == null) {
    return (
      <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
        <h3 className="text-sm font-semibold text-secondary">{t('trainingReadinessTitle')}</h3>
        <p className="mt-2 text-sm text-tertiary">{t('trainingReadinessNoData')}</p>
      </div>
    );
  }

  const style = getReadinessStyle(wellness.trainingReadinessLevel);
  const score = wellness.trainingReadinessScore;

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-secondary">{t('trainingReadinessTitle')}</h3>
        <span className="text-xs text-tertiary">{formatDate(wellness.date)}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-primary">{score}</span>
        <span className="text-sm text-tertiary">/ 100</span>
        {wellness.trainingReadinessLevel && (
          <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
            {wellness.trainingReadinessLevel}
          </span>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>

      <p className="mt-3 text-sm text-secondary">{t(levelDescriptionKey(wellness.trainingReadinessLevel))}</p>

      <p className="mt-3 text-xs text-tertiary">{t('trainingReadinessHint')}</p>

      {wellness.vo2MaxMlPerMinPerKg != null && (
        <p className="mt-2 text-xs text-tertiary">
          VO2max: <strong className="text-primary">{wellness.vo2MaxMlPerMinPerKg.toFixed(1)}</strong> ml/kg/min
        </p>
      )}
    </div>
  );
};
