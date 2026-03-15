import type { WellnessDataDto } from '../../types/garmin';

interface Props {
  wellness: WellnessDataDto | null;
}

function getReadinessStyle(level: string | null): { bg: string; text: string; ring: string } {
  switch (level?.toUpperCase()) {
    case 'READY':
    case 'PRIME':
      return { bg: 'bg-state-success-bg', text: 'text-state-success-text', ring: 'ring-border-default' };
    case 'MODERATE':
    case 'RECOVERY':
      return { bg: 'bg-state-active-bg', text: 'text-state-active-text', ring: 'ring-border-default' };
    case 'LOW':
    case 'POOR':
      return { bg: 'bg-state-danger-bg', text: 'text-state-danger-text', ring: 'ring-border-default' };
    default:
      return { bg: 'bg-muted', text: 'text-primary', ring: 'ring-border-default' };
  }
}

export const TrainingReadinessCard = ({ wellness }: Props) => {
  if (!wellness || wellness.trainingReadinessScore == null) {
    return (
      <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
        <h3 className="text-sm font-semibold text-secondary">Training Readiness</h3>
        <p className="mt-2 text-sm text-tertiary">No data available</p>
      </div>
    );
  }

  const style = getReadinessStyle(wellness.trainingReadinessLevel);

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h3 className="mb-2 text-sm font-semibold text-secondary">Training Readiness</h3>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-primary">{wellness.trainingReadinessScore}</span>
        {wellness.trainingReadinessLevel && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
            {wellness.trainingReadinessLevel}
          </span>
        )}
      </div>
      {wellness.vo2MaxMlPerMinPerKg != null && (
        <p className="mt-2 text-xs text-tertiary">
          VO2max: <strong className="text-primary">{wellness.vo2MaxMlPerMinPerKg.toFixed(1)}</strong> ml/kg/min
        </p>
      )}
    </div>
  );
};
