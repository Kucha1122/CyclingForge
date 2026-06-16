import { useTranslation } from 'react-i18next';
import type { WellnessDataDto, HrvDataDto } from '../../types/garmin';
import { formatNumber, formatDate } from '../../utils/format';

interface Props {
  wellness: WellnessDataDto | null;
  hrv?: HrvDataDto | null;
}

export const WellnessStatsRow = ({ wellness, hrv }: Props) => {
  const { t } = useTranslation('sleep');
  if (!wellness) return null;

  const stats = [
    { labelKey: 'vo2max', value: wellness.vo2MaxMlPerMinPerKg != null ? `${wellness.vo2MaxMlPerMinPerKg.toFixed(1)}` : '-', unit: 'ml/kg/min' },
    { labelKey: 'bodyBattery', value: wellness.bodyBatteryMin != null && wellness.bodyBatteryMax != null ? `${wellness.bodyBatteryMin}-${wellness.bodyBatteryMax}` : '-', unit: '' },
    { labelKey: 'stress', value: wellness.averageStressLevel != null ? `${wellness.averageStressLevel}` : '-', unit: 'avg' },
    { labelKey: 'hrv', value: hrv?.lastNightAvgMs != null ? `${hrv.lastNightAvgMs}` : '-', unit: hrv?.status ?? 'ms' },
    { labelKey: 'steps', value: wellness.stepsCount != null ? formatNumber(wellness.stepsCount) : '-', unit: '' },
  ];

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-secondary">{t('dailyWellness')}</h3>
        <span className="text-xs text-tertiary">{formatDate(wellness.date)}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
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
