import { useTranslation } from 'react-i18next';

// HR zone colours (Z1..Z5+), matching RealizedWeekPage.
const HR_ZONE_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

interface Props {
  weeklyHrZoneSeconds: number[];
}

export const WeeklyZonesCard = ({ weeklyHrZoneSeconds }: Props) => {
  const { t } = useTranslation('common');
  const total = weeklyHrZoneSeconds.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-secondary">{t('timeInZones')}</h3>
        <span className="text-xs text-tertiary">{t('thisWeekLabel')} · {formatDuration(total)}</span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-tertiary">{t('noActivities')}</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {weeklyHrZoneSeconds.map((s, i) => (
              s > 0 ? (
                <div
                  key={i}
                  style={{ width: `${(s / total) * 100}%`, backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }}
                  title={`Z${i + 1}: ${formatDuration(s)}`}
                />
              ) : null
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {weeklyHrZoneSeconds.map((s, i) => (
              s > 0 ? (
                <div key={i} className="flex items-center gap-1.5 text-xs text-secondary">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }} />
                  <span className="font-medium">Z{i + 1}</span>
                  <span className="text-tertiary">{formatDuration(s)}</span>
                </div>
              ) : null
            ))}
          </div>
        </>
      )}
    </div>
  );
};
