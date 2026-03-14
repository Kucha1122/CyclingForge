import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { SleepDataDto } from '../../types/garmin';

interface Props {
  data: SleepDataDto[];
}

function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

export const SleepStagesChart = ({ data }: Props) => {
  const { t } = useTranslation('sleep');
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date.slice(5),
      deep: toHours(d.deepSleepSeconds),
      rem: toHours(d.remSleepSeconds),
      light: toHours(d.lightSleepSeconds),
      awake: toHours(d.awakeSeconds),
    }));

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('sleepStages')}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="h" />
          <Tooltip formatter={(value: number | undefined) => [value != null ? `${value}h` : '0']} />
          <Legend />
          <Bar dataKey="deep" stackId="sleep" fill="#4338ca" name={t('deep')} />
          <Bar dataKey="rem" stackId="sleep" fill="#8b5cf6" name={t('rem')} />
          <Bar dataKey="light" stackId="sleep" fill="#93c5fd" name={t('light')} />
          <Bar dataKey="awake" stackId="sleep" fill="#fbbf24" name={t('awake')} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
