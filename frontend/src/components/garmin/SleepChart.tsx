import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { SleepDataDto, HrvDataDto } from '../../types/garmin';

interface Props {
  data: SleepDataDto[];
  hrvData?: HrvDataDto[];
}

function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

export const SleepChart = ({ data, hrvData = [] }: Props) => {
  const { t } = useTranslation('sleep');

  const hrvByDate = Object.fromEntries(hrvData.map((h) => [h.date, h.lastNightAvgMs]));

  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date.slice(5),
      fullDate: d.date,
      hours: toHours(d.totalSleepSeconds),
      score: d.sleepScore,
      hrv: hrvByDate[d.date] ?? null,
    }));

  const hasHrv = chartData.some((d) => d.hrv != null);

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h3 className="mb-4 text-lg font-semibold text-primary">{t('sleepDurationChart')}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-default)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="sleep"
            domain={[0, 12]}
            tick={{ fontSize: 11 }}
            unit="h"
            width={32}
          />
          {hasHrv && (
            <YAxis
              yAxisId="hrv"
              orientation="right"
              tick={{ fontSize: 11 }}
              unit="ms"
              width={44}
              domain={['auto', 'auto']}
            />
          )}
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value == null) return ['-', name ?? ''];
              if (name === 'hrv') return [`${value} ms`, t('hrvAvg')];
              return [`${value}h`, t('sleepLabel')];
            }}
            labelFormatter={(label) => `${t('dateLabelTooltip')}: ${label}`}
          />
          <Legend formatter={(val) => val === 'hrv' ? t('hrvAvg') : t('sleepLabel')} />
          <Bar yAxisId="sleep" dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} name="sleep" />
          {hasHrv && (
            <Line
              yAxisId="hrv"
              type="monotone"
              dataKey="hrv"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              connectNulls
              name="hrv"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
