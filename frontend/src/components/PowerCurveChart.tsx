import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { activitiesApi, type PowerCurveDto } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const WINDOW_OPTIONS = [42, 90, 365, 0] as const;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
}

export const PowerCurveChart = () => {
  const { t } = useTranslation('analysis');
  const { chartColors } = useTheme();
  const [windowDays, setWindowDays] = useState<number>(90);
  const [unit, setUnit] = useState<'w' | 'wkg'>('w');
  const [data, setData] = useState<PowerCurveDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    activitiesApi.getPowerCurve(windowDays)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [windowDays]);

  const hasWkg = unit === 'wkg';
  const canShowWkg = (data?.points ?? []).some((p) => p.wattsPerKg != null);

  const chartData = useMemo(() => {
    if (!data) return [];
    // Measured mean-maximal points.
    const measured = data.points
      .map((p) => ({
        duration: p.durationSeconds,
        measured: hasWkg ? p.wattsPerKg : p.watts,
      }))
      .filter((p) => p.measured != null);

    // Modeled CP curve P(t) = W'/t + CP sampled across the duration range for a smooth overlay.
    const modeled: { duration: number; model: number | null }[] = [];
    if (data.criticalPower != null && data.wPrimeJoules != null) {
      const cp = hasWkg ? (data.criticalPowerPerKg ?? null) : data.criticalPower;
      const wprimeScaled = hasWkg && data.criticalPower
        ? data.wPrimeJoules * ((data.criticalPowerPerKg ?? 0) / data.criticalPower)
        : data.wPrimeJoules;
      if (cp != null) {
        for (const tSec of [120, 180, 240, 300, 420, 600, 900, 1200, 1800, 2400, 3600]) {
          modeled.push({ duration: tSec, model: Math.round((wprimeScaled / tSec + cp) * (hasWkg ? 100 : 1)) / (hasWkg ? 100 : 1) });
        }
      }
    }

    const byDuration = new Map<number, { duration: number; measured?: number | null; model?: number | null }>();
    for (const m of measured) byDuration.set(m.duration, { duration: m.duration, measured: m.measured });
    for (const m of modeled) {
      const existing = byDuration.get(m.duration) ?? { duration: m.duration };
      existing.model = m.model;
      byDuration.set(m.duration, existing);
    }
    return Array.from(byDuration.values()).sort((a, b) => a.duration - b.duration);
  }, [data, hasWkg]);

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-primary">{t('powerCurveTitle')}</h2>
          <p className="text-xs text-tertiary">{t('powerCurveHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canShowWkg && (
            <div className="flex rounded-lg border border-border-default p-0.5 text-xs">
              <button onClick={() => setUnit('w')} className={`rounded-md px-2 py-1 ${!hasWkg ? 'bg-accent text-accent-foreground' : 'text-secondary'}`}>W</button>
              <button onClick={() => setUnit('wkg')} className={`rounded-md px-2 py-1 ${hasWkg ? 'bg-accent text-accent-foreground' : 'text-secondary'}`}>W/kg</button>
            </div>
          )}
          <div className="flex rounded-lg border border-border-default p-0.5 text-xs">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWindowDays(w)}
                className={`rounded-md px-2 py-1 ${windowDays === w ? 'bg-accent text-accent-foreground' : 'text-secondary'}`}
              >
                {w === 0 ? t('powerCurveAllTime') : t('powerCurveDays', { days: w })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CP / W' summary */}
      {data?.criticalPower != null && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-lg bg-page px-4 py-2">
            <p className="text-xs text-tertiary">{t('powerCurveCp')}</p>
            <p className="text-lg font-bold text-primary">
              {hasWkg && data.criticalPowerPerKg != null ? `${data.criticalPowerPerKg} W/kg` : `${data.criticalPower} W`}
            </p>
          </div>
          {data.wPrimeJoules != null && (
            <div className="rounded-lg bg-page px-4 py-2">
              <p className="text-xs text-tertiary">{t('powerCurveWPrime')}</p>
              <p className="text-lg font-bold text-primary">{(data.wPrimeJoules / 1000).toFixed(1)} kJ</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-tertiary">{t('powerCurveLoading')}</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-tertiary">{t('powerCurveNoData')}</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis
              dataKey="duration"
              type="number"
              scale="log"
              domain={['dataMin', 'dataMax']}
              ticks={[1, 5, 60, 300, 1200, 3600]}
              tickFormatter={formatDuration}
              stroke="var(--text-tertiary)"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
              labelFormatter={(v) => formatDuration(Number(v))}
              formatter={(value: number | undefined, name) => [
                value != null ? (hasWkg ? value.toFixed(2) : value.toFixed(0)) : '—',
                name === 'measured' ? t('powerCurveMeasured') : t('powerCurveModeled'),
              ]}
            />
            {data?.criticalPower != null && (
              <ReferenceLine
                y={hasWkg ? (data.criticalPowerPerKg ?? undefined) : data.criticalPower}
                stroke={chartColors[2]}
                strokeDasharray="4 4"
                label={{ value: 'CP', position: 'right', fill: 'var(--text-tertiary)', fontSize: 11 }}
              />
            )}
            <Line type="monotone" dataKey="model" stroke={chartColors[1]} dot={false} strokeDasharray="5 3" name="model" connectNulls />
            <Line type="monotone" dataKey="measured" stroke={chartColors[0]} strokeWidth={2} dot={{ r: 3 }} name="measured" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
