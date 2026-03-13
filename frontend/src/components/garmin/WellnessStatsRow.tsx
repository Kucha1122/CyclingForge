import type { WellnessDataDto } from '../../types/garmin';

interface Props {
  wellness: WellnessDataDto | null;
}

export const WellnessStatsRow = ({ wellness }: Props) => {
  if (!wellness) return null;

  const stats = [
    {
      label: 'VO2max',
      value: wellness.vo2MaxMlPerMinPerKg != null ? `${wellness.vo2MaxMlPerMinPerKg.toFixed(1)}` : '-',
      unit: 'ml/kg/min',
    },
    {
      label: 'Body Battery',
      value:
        wellness.bodyBatteryMin != null && wellness.bodyBatteryMax != null
          ? `${wellness.bodyBatteryMin}-${wellness.bodyBatteryMax}`
          : '-',
      unit: '',
    },
    {
      label: 'Stress',
      value: wellness.averageStressLevel != null ? `${wellness.averageStressLevel}` : '-',
      unit: 'avg',
    },
    {
      label: 'Steps',
      value: wellness.stepsCount != null ? wellness.stepsCount.toLocaleString() : '-',
      unit: '',
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Daily Wellness</h3>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            {s.unit && <p className="text-xs text-gray-400">{s.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
