import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { SleepDataDto } from '../../types/garmin';

interface Props {
  data: SleepDataDto[];
}

function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

export const SleepChart = ({ data }: Props) => {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date.slice(5),
      hours: toHours(d.totalSleepSeconds),
      score: d.sleepScore,
    }));

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Sleep Duration</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} unit="h" />
          <Tooltip
            formatter={(value: number) => [`${value}h`, 'Sleep']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
