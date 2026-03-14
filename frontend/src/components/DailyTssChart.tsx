import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { DailyTssPoint } from '../services/api';
import { formatDate } from '../utils/format';

interface DailyTssChartProps {
  data: DailyTssPoint[];
  days?: number;
}

export const DailyTssChart: React.FC<DailyTssChartProps> = ({ data, days = 30 }) => {
  const { t } = useTranslation('charts');
  const chartData = data.map((item) => ({
    ...item,
    dateLabel: formatDate(item.date, { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('dailyTss')}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number | undefined) => [value != null ? value.toFixed(0) : '0', t('tss')]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.date
                ? formatDate((payload[0].payload as { date: string }).date, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : ''
            }
          />
          <Bar dataKey="tss" fill="#3b82f6" name={t('tss')} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-gray-500">{t('lastDays', { days })}</p>
    </div>
  );
};
