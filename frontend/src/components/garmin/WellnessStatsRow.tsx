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
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h3 className="mb-3 text-sm font-semibold text-secondary">{t('dailyWellness')}</h3>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.labelKey} className="text-center">
            <p className="text-xs text-tertiary">{t(s.labelKey)}</p>
            <p className="text-lg font-bold text-primary">{s.value}</p>
            {s.unit && <p className="text-xs text-tertiary">{s.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
