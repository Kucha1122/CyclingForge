import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ZONE_COLORS } from '../types/workout';
import { ZONE_COUNT } from '../utils/workoutZones';

interface PowerZonesCardProps {
  /** Seconds spent in each power zone, index 0 = Z1 … 5 = Z6. */
  zoneSeconds: number[];
}

const ZONE_KEYS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'] as const;

function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Time-in-power-zone distribution for a single activity (Coggan Z1–Z6 of FTP). */
export const PowerZonesCard: FC<PowerZonesCardProps> = ({ zoneSeconds }) => {
  const { t } = useTranslation('workouts');
  const tCharts = useTranslation('charts').t;

  const total = zoneSeconds.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  return (
    <div>
      {/* Stacked distribution bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted" role="img"
           aria-label={tCharts('powerZonesTitle')}>
        {Array.from({ length: ZONE_COUNT }).map((_, z) => {
          const pct = (zoneSeconds[z] / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={z}
              style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[ZONE_KEYS[z]] }}
              title={`${ZONE_KEYS[z]} · ${pct.toFixed(0)}%`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <ul className="mt-3 space-y-1.5 text-sm">
        {Array.from({ length: ZONE_COUNT }).map((_, z) => {
          const seconds = zoneSeconds[z];
          const pct = (seconds / total) * 100;
          return (
            <li key={z} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: ZONE_COLORS[ZONE_KEYS[z]] }} />
                <span className="font-medium text-secondary">{ZONE_KEYS[z]}</span>
                <span className="text-tertiary">{t(`zone${z + 1}Short`)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-tertiary">{pct.toFixed(0)}%</span>
                <span className="w-16 text-right font-medium text-primary">{formatDuration(seconds)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
