import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SleepLevelDto } from '../../types/garmin';

interface Props {
  levels: SleepLevelDto[];
}

/** "YYYY-MM-DD HH:MM:SS" (UTC) → ms epoch */
function gmtToMs(s: string): number {
  return new Date(s.replace(' ', 'T') + 'Z').getTime();
}

/** ms epoch → local "HH:MM" */
function msToLocal(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Stage config ──────────────────────────────────────────────
// Standard hypnogram: Awake at TOP (band 0), Deep at BOTTOM (band 3).
// Garmin activityLevel: 0=deep, 1=light, 2=rem, 3=awake, 4=awake
const BAND: Record<number, number> = { 0: 3, 1: 2, 2: 1, 3: 0, 4: 0 };

const STAGE_COLOR: Record<number, string> = {
  0: '#6366f1', // deep  – indigo
  1: '#38bdf8', // light – sky
  2: '#a78bfa', // rem   – violet
  3: '#fbbf24', // awake – amber
  4: '#fbbf24',
};

const STAGE_LABEL_KEY: Record<number, string> = {
  0: 'deep', 1: 'light', 2: 'rem', 3: 'awake', 4: 'awake',
};

// Y-axis row labels (top → bottom)
const Y_LABELS = ['awake', 'rem', 'light', 'deep'] as const;

// ─────────────────────────────────────────────────────────────

const BAND_COUNT   = 4;
const BAND_H       = 26;        // px per band
const CHART_H      = BAND_COUNT * BAND_H; // 104 px
const Y_LABEL_W    = 48;        // px reserved for Y-axis labels
const TIME_AXIS_H  = 20;        // px for time labels at bottom

interface Tooltip {
  xPx: number;   // from left of the chart area (no Y-label)
  pct: number;   // 0-1
  ms: number;
  band: number;
  level: number;
}

export const SleepHypnogram = ({ levels }: Props) => {
  const { t } = useTranslation('sleep');
  const chartRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tooltip | null>(null);

  if (!levels || levels.length === 0) return null;

  const starts  = levels.map((l) => gmtToMs(l.startGmt));
  const ends    = levels.map((l) => gmtToMs(l.endGmt));
  const minT    = Math.min(...starts);
  const maxT    = Math.max(...ends);
  const totalMs = maxT - minT;
  if (totalMs <= 0) return null;

  // Hourly ticks
  const firstTick = new Date(minT);
  firstTick.setUTCMinutes(0, 0, 0);
  firstTick.setUTCHours(firstTick.getUTCHours() + 1);
  const ticks: number[] = [];
  for (let t = firstTick.getTime(); t < maxT; t += 3_600_000) ticks.push(t);

  const toX = (ms: number) => ((ms - minT) / totalMs) * 100; // % of chart width

  // Mouse on chart area
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPx = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, xPx / rect.width));
    const ms = minT + pct * totalMs;
    // find which segment we're in
    const seg = levels.find((l) => {
      const s = gmtToMs(l.startGmt);
      const e2 = gmtToMs(l.endGmt);
      return ms >= s && ms <= e2;
    });
    const level = seg ? Math.min(Math.round(seg.activityLevel), 4) : 3;
    setTip({ xPx, pct, ms, band: BAND[level] ?? 0, level });
  };

  return (
    <div className="select-none">
      <div className="flex">
        {/* ── Y-axis labels ── */}
        <div
          className="flex flex-col shrink-0 text-[10px] text-tertiary"
          style={{ width: Y_LABEL_W, height: CHART_H }}
        >
          {Y_LABELS.map((key) => (
            <div
              key={key}
              className="flex items-center justify-end pr-2"
              style={{ height: BAND_H }}
            >
              {t(key)}
            </div>
          ))}
        </div>

        {/* ── Chart area ─────────────────────────────────────── */}
        <div className="relative flex-1 min-w-0">
          {/* Outer wrapper: relative, NOT overflow-hidden → tooltip escapes */}
          <div
            className="relative cursor-crosshair"
            style={{ height: CHART_H }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTip(null)}
          >
            {/* Horizontal grid lines between bands */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="pointer-events-none absolute left-0 right-0 border-t border-border-default/40"
                style={{ top: i * BAND_H }}
              />
            ))}

            {/* Inner chart: overflow-hidden clips segments at edges */}
            <div ref={chartRef} className="absolute inset-0 overflow-hidden rounded-md">
              {levels.map((l, i) => {
                const level  = Math.min(Math.round(l.activityLevel), 4);
                const band   = BAND[level] ?? 0;
                const leftPct  = toX(gmtToMs(l.startGmt));
                const widthPct = toX(gmtToMs(l.endGmt)) - leftPct;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left:            `${leftPct}%`,
                      width:           `${widthPct}%`,
                      top:             band * BAND_H,
                      height:          BAND_H,
                      backgroundColor: STAGE_COLOR[level] ?? '#64748b',
                    }}
                  />
                );
              })}

              {/* Cursor hairline */}
              {tip && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/70"
                  style={{ left: tip.xPx }}
                />
              )}
            </div>

            {/* Tooltip — outside overflow-hidden so it's fully visible */}
            {tip && (
              <div
                className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg"
                style={{
                  top: tip.band * BAND_H - 36,
                  ...(tip.pct > 0.72
                    ? { right: `${(1 - tip.pct) * 100}%` }
                    : { left: tip.xPx + 8 }),
                }}
              >
                <span className="font-semibold">{msToLocal(tip.ms)}</span>
                {' · '}
                <span style={{ color: STAGE_COLOR[tip.level] }}>
                  {t(STAGE_LABEL_KEY[tip.level] ?? 'awake')}
                </span>
              </div>
            )}
          </div>

          {/* ── Time axis ───────────────────────────────────── */}
          <div
            className="relative w-full text-[10px] text-tertiary"
            style={{ height: TIME_AXIS_H, marginTop: 2 }}
          >
            {/* Start label — hidden when the first tick is within 8% */}
            {(ticks.length === 0 || toX(ticks[0]) > 8) && (
              <span className="absolute left-0">{msToLocal(minT)}</span>
            )}
            {ticks.map((tickMs) => (
              <span
                key={tickMs}
                className="absolute -translate-x-1/2"
                style={{ left: `${toX(tickMs)}%` }}
              >
                {msToLocal(tickMs)}
              </span>
            ))}
            {/* End label — hidden when the last tick is within 8% */}
            {(ticks.length === 0 || toX(ticks[ticks.length - 1]) < 92) && (
              <span className="absolute right-0">{msToLocal(maxT)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
