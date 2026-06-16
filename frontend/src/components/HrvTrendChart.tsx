import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { garminApi } from '../services/api';
import type { HrvDataDto } from '../types/garmin';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/format';

const WINDOW_DAYS = 56;
const BASELINE_DAYS = 28;
const BAND_FRACTION = 0.1; // ±10% normal band around the rolling baseline

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const HrvTrendChart = () => {
  const { t } = useTranslation('analysis');
  const { chartColors } = useTheme();
  const [data, setData] = useState<HrvDataDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - WINDOW_DAYS);
    garminApi.getHrvData(toIsoDate(start), toIsoDate(end))
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter((d) => d.lastNightAvgMs != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    return sorted.map((d, idx) => {
      // Rolling baseline: trailing 28-day average of available nightly HRV.
      const windowSlice = sorted.slice(Math.max(0, idx - BASELINE_DAYS + 1), idx + 1);
      const baseline = windowSlice.reduce((s, x) => s + (x.lastNightAvgMs ?? 0), 0) / windowSlice.length;
      return {
        date: d.date,
        hrv: d.lastNightAvgMs,
        baseline: Math.round(baseline),
        band: [Math.round(baseline * (1 - BAND_FRACTION)), Math.round(baseline * (1 + BAND_FRACTION))] as [number, number],
        dateLabel: formatDate(d.date, { month: 'short', day: 'numeric' }),
      };
    });
  }, [data]);

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-primary">{t('hrvTrendTitle')}</h2>
        <p className="text-xs text-tertiary">{t('hrvTrendHint')}</p>
      </div>

      {loading ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-tertiary">{t('hrvTrendLoading')}</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-tertiary">{t('hrvTrendNoData')}</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis dataKey="dateLabel" stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
            <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} unit=" ms" width={56} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
              formatter={(value: number | number[] | undefined, name) => {
                if (name === 'band') return [Array.isArray(value) ? `${value[0]}–${value[1]} ms` : '—', t('hrvNormalBand')];
                if (name === 'baseline') return [`${value} ms`, t('hrvBaseline')];
                return [`${value} ms`, t('hrvNightly')];
              }}
            />
            <Area dataKey="band" stroke="none" fill={chartColors[0]} fillOpacity={0.12} name="band" />
            <Line type="monotone" dataKey="baseline" stroke={chartColors[2]} strokeDasharray="5 3" dot={false} name="baseline" />
            <Line type="monotone" dataKey="hrv" stroke={chartColors[0]} strokeWidth={2} dot={{ r: 2 }} name="hrv" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
