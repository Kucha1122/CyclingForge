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
      <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
        <h3 className="text-sm font-semibold text-secondary">Last Night's Sleep</h3>
        <p className="mt-2 text-sm text-tertiary">No sleep data available</p>
      </div>
    );
  }

  const scoreColor =
    (sleep.sleepScore ?? 0) >= 80
      ? 'text-state-success-text'
      : (sleep.sleepScore ?? 0) >= 60
        ? 'text-accent'
        : 'text-state-danger-text';

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-secondary">Last Night's Sleep</h3>
        {sleep.sleepScore != null && (
          <span className={`text-2xl font-bold ${scoreColor}`}>{sleep.sleepScore}</span>
        )}
      </div>
      <p className="text-3xl font-bold text-primary">{formatDuration(sleep.totalSleepSeconds)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted px-2 py-1.5 ring-1 ring-border-default" style={{ borderLeft: '3px solid var(--chart-1)' }}>
          <span className="text-secondary">Deep</span>
          <p className="font-semibold text-primary">{formatDuration(sleep.deepSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 ring-1 ring-border-default" style={{ borderLeft: '3px solid var(--chart-2)' }}>
          <span className="text-secondary">REM</span>
          <p className="font-semibold text-primary">{formatDuration(sleep.remSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 ring-1 ring-border-default" style={{ borderLeft: '3px solid var(--chart-3)' }}>
          <span className="text-secondary">Light</span>
          <p className="font-semibold text-primary">{formatDuration(sleep.lightSleepSeconds)}</p>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 ring-1 ring-border-default" style={{ borderLeft: '3px solid var(--chart-4)' }}>
          <span className="text-secondary">Awake</span>
          <p className="font-semibold text-primary">{formatDuration(sleep.awakeSeconds)}</p>
        </div>
      </div>
    </div>
  );
};
