import type { SleepDataDto } from '../../types/garmin';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  sleep: SleepDataDto;
}

export const SleepDetailsCard = ({ sleep }: Props) => {
  const total = sleep.totalSleepSeconds || 1;
  const stages = [
    { label: 'Deep', seconds: sleep.deepSleepSeconds, color: 'bg-indigo-600' },
    { label: 'REM', seconds: sleep.remSleepSeconds, color: 'bg-violet-500' },
    { label: 'Light', seconds: sleep.lightSleepSeconds, color: 'bg-blue-300' },
    { label: 'Awake', seconds: sleep.awakeSeconds, color: 'bg-amber-300' },
  ];

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{sleep.date}</h4>
        {sleep.sleepScore != null && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            Score: {sleep.sleepScore}
          </span>
        )}
      </div>

      <div className="mb-3 flex h-3 overflow-hidden rounded-full">
        {stages.map((s) => (
          <div
            key={s.label}
            className={`${s.color}`}
            style={{ width: `${(s.seconds / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        {stages.map((s) => (
          <div key={s.label} className="text-center">
            <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${s.color}`} />
            <p className="text-gray-600">{s.label}</p>
            <p className="font-semibold text-gray-900">{formatDuration(s.seconds)}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>Bedtime: {formatTime(sleep.sleepStartTime)}</span>
        <span>Wake: {formatTime(sleep.sleepEndTime)}</span>
        <span>Total: {formatDuration(sleep.totalSleepSeconds)}</span>
      </div>

      {(sleep.averageSpO2 != null || sleep.averageRespirationRate != null) && (
        <div className="mt-3 flex gap-4 text-xs text-gray-600">
          {sleep.averageSpO2 != null && (
            <span>SpO2: <strong>{sleep.averageSpO2.toFixed(1)}%</strong></span>
          )}
          {sleep.averageRespirationRate != null && (
            <span>Respiration: <strong>{sleep.averageRespirationRate.toFixed(1)}</strong> br/min</span>
          )}
        </div>
      )}
    </div>
  );
};
