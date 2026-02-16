import { type FC } from 'react';

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

function TrendIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.5) {
    return <span className="text-gray-600">→ Stable</span>;
  }
  if (value > 0) {
    return <span className="text-green-600">↑ +{value.toFixed(1)}%</span>;
  }
  return <span className="text-red-600">↓ {value.toFixed(1)}%</span>;
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

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Form Trends</h2>
      
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Fitness (CTL)</span>
            <TrendIndicator value={ctlTrend} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700">{currentCTL.toFixed(1)}</span>
            {(previousWeekAvgCtl !== undefined || previousCTL !== undefined) && (
              <span className="text-sm text-blue-600">
                was {previousWeekAvgCtl?.toFixed(1) ?? previousCTL?.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-blue-700">
            {currentCTL > 80 ? 'Excellent fitness level' : 
             currentCTL > 60 ? 'Good fitness level' :
             currentCTL > 40 ? 'Moderate fitness' : 'Building fitness'}
          </p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-orange-900">Fatigue (ATL)</span>
            <TrendIndicator value={atlTrend} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-orange-700">{currentATL.toFixed(1)}</span>
            {(previousWeekAvgAtl !== undefined || previousATL !== undefined) && (
              <span className="text-sm text-orange-600">
                was {previousWeekAvgAtl?.toFixed(1) ?? previousATL?.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-orange-700">
            {currentATL > 100 ? 'High acute load - recovery needed' :
             currentATL > 60 ? 'Moderate fatigue' :
             currentATL > 30 ? 'Fresh - can handle more load' : 'Very fresh'}
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-green-900">Form (TSB)</span>
            <span className="text-2xl font-bold text-green-700">{(currentCTL - currentATL).toFixed(1)}</span>
          </div>
          <p className="mt-1 text-xs text-green-700">
            Balance between fitness and fatigue
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        <p className="font-medium">Understanding Trends:</p>
        <ul className="mt-1 space-y-1 pl-4">
          <li>• Rising CTL = Building fitness gradually</li>
          <li>• High ATL = Recent hard training or racing</li>
          <li>• Positive TSB = Fresh and ready to perform</li>
        </ul>
      </div>
    </div>
  );
};
