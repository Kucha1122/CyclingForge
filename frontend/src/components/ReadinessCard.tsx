import { type FC } from 'react';

interface ReadinessCardProps {
  currentTSB: number;
  formStatus: string;
  recommendation: string;
  rampRateCtlPerWeek?: number;
}

export const ReadinessCard: FC<ReadinessCardProps> = ({
  currentTSB,
  formStatus,
  recommendation,
  rampRateCtlPerWeek,
}) => {
  // Strefy zgodne z interval.icu: Optymalna = -10 do -35 (budowanie formy)
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

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Readiness Score</h2>
      
      <div className="mb-6 text-center">
        <div className="mb-2 text-6xl">{getStatusIcon(currentTSB)}</div>
        <div className={`mx-auto mb-2 inline-block rounded-full px-4 py-2 text-white ${getStatusColor(currentTSB)}`}>
          <span className="text-2xl font-bold">{currentTSB.toFixed(1)}</span>
          <span className="ml-1 text-sm">TSB</span>
        </div>
        <p className="text-lg font-semibold text-gray-900">{formStatus}</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">Recommendation</p>
        <p className="mt-1 text-sm text-gray-700">{recommendation}</p>
        {rampRateCtlPerWeek != null && (
          <p className="mt-2 text-xs text-gray-600">
            CTL trend: {rampRateCtlPerWeek >= 0 ? '+' : ''}{rampRateCtlPerWeek.toFixed(1)} pts/week
            {rampRateCtlPerWeek > 7 && ' – focus on recovery.'}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>TSB &lt; -35</span>
          <span className="font-medium text-red-600">Ryzykowna</span>
        </div>
        <div className="flex items-center justify-between">
          <span>-35 do -10</span>
          <span className="font-medium text-green-600">Optymalna</span>
        </div>
        <div className="flex items-center justify-between">
          <span>-10 do 5</span>
          <span className="font-medium text-slate-600">Przejściowa</span>
        </div>
        <div className="flex items-center justify-between">
          <span>5 do 25</span>
          <span className="font-medium text-blue-600">Świeża</span>
        </div>
        <div className="flex items-center justify-between">
          <span>&gt; 25</span>
          <span className="font-medium text-purple-600">Bardzo świeża</span>
        </div>
      </div>
    </div>
  );
};
