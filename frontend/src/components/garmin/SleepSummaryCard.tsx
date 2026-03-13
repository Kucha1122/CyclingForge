import type { SleepDataDto } from '../../types/garmin';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

interface Props {
  sleep: SleepDataDto | null;
}

export const SleepSummaryCard = ({ sleep }: Props) => {
  if (!sleep) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Last Night's Sleep</h3>
        <p className="mt-2 text-sm text-gray-500">No sleep data available</p>
      </div>
    );
  }

  const scoreColor =
    (sleep.sleepScore ?? 0) >= 80
      ? 'text-green-600'
      : (sleep.sleepScore ?? 0) >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Last Night's Sleep</h3>
        {sleep.sleepScore != null && (
          <span className={`text-2xl font-bold ${scoreColor}`}>{sleep.sleepScore}</span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{formatDuration(sleep.totalSleepSeconds)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-indigo-50 px-2 py-1.5">
          <span className="text-indigo-700">Deep</span>
          <p className="font-semibold text-indigo-900">{formatDuration(sleep.deepSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-violet-50 px-2 py-1.5">
          <span className="text-violet-700">REM</span>
          <p className="font-semibold text-violet-900">{formatDuration(sleep.remSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-1.5">
          <span className="text-blue-700">Light</span>
          <p className="font-semibold text-blue-900">{formatDuration(sleep.lightSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1.5">
          <span className="text-amber-700">Awake</span>
          <p className="font-semibold text-amber-900">{formatDuration(sleep.awakeSeconds)}</p>
        </div>
      </div>
    </div>
  );
};
