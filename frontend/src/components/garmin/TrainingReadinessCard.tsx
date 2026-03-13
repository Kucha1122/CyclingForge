import type { WellnessDataDto } from '../../types/garmin';

interface Props {
  wellness: WellnessDataDto | null;
}

function getReadinessStyle(level: string | null): { bg: string; text: string; ring: string } {
  switch (level?.toUpperCase()) {
    case 'READY':
    case 'PRIME':
      return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200' };
    case 'MODERATE':
    case 'RECOVERY':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200' };
    case 'LOW':
    case 'POOR':
      return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-200' };
  }
}

export const TrainingReadinessCard = ({ wellness }: Props) => {
  if (!wellness || wellness.trainingReadinessScore == null) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Training Readiness</h3>
        <p className="mt-2 text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const style = getReadinessStyle(wellness.trainingReadinessLevel);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Training Readiness</h3>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-gray-900">{wellness.trainingReadinessScore}</span>
        {wellness.trainingReadinessLevel && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
            {wellness.trainingReadinessLevel}
          </span>
        )}
      </div>
      {wellness.vo2MaxMlPerMinPerKg != null && (
        <p className="mt-2 text-xs text-gray-500">
          VO2max: <strong>{wellness.vo2MaxMlPerMinPerKg.toFixed(1)}</strong> ml/kg/min
        </p>
      )}
    </div>
  );
};
