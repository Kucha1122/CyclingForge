import { useTranslation } from 'react-i18next';
import type { WellnessDataDto } from '../../types/garmin';
import { formatNumber } from '../../utils/format';

interface Props {
  wellness: WellnessDataDto | null;
}

export const WellnessStatsRow = ({ wellness }: Props) => {
  const { t } = useTranslation('sleep');
  if (!wellness) return null;

  const stats = [
    { labelKey: 'vo2max' as const, value: wellness.vo2MaxMlPerMinPerKg != null ? `${wellness.vo2MaxMlPerMinPerKg.toFixed(1)}` : '-', unit: 'ml/kg/min' },
    { labelKey: 'bodyBattery' as const, value: wellness.bodyBatteryMin != null && wellness.bodyBatteryMax != null ? `${wellness.bodyBatteryMin}-${wellness.bodyBatteryMax}` : '-', unit: '' },
    { labelKey: 'stress' as const, value: wellness.averageStressLevel != null ? `${wellness.averageStressLevel}` : '-', unit: 'avg' },
    { labelKey: 'steps' as const, value: wellness.stepsCount != null ? formatNumber(wellness.stepsCount) : '-', unit: '' },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('dailyWellness')}</h3>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.labelKey} className="text-center">
            <p className="text-xs text-gray-500">{t(s.labelKey)}</p>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            {s.unit && <p className="text-xs text-gray-400">{s.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
