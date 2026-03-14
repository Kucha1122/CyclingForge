import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PRESET_BLOCKS, PRESET_MULTIPLIERS } from '../../constants/workoutPresets';
import type { PresetBlock } from '../../constants/workoutPresets';

interface PresetBlockBarProps {
  onAdd: (preset: PresetBlock, count: number) => void;
}

export const PresetBlockBar = ({ onAdd }: PresetBlockBarProps) => {
  const { t } = useTranslation('workouts');
  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(PRESET_BLOCKS.map((p) => [p.id, 1]))
  );

  const handleAdd = (preset: PresetBlock) => {
    onAdd(preset, multipliers[preset.id] ?? 1);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{t('quickBlocks')}</h3>
      <div className="flex flex-wrap gap-2">
        {PRESET_BLOCKS.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => handleAdd(preset)}
              className="flex flex-1 items-center gap-2 rounded-l-lg px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title={t('addBlock', { label: t(`presets.${preset.id}Short`) })}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: preset.zoneColor }}
              />
              <span>{t(`presets.${preset.id}`)}</span>
              <PlusIcon className="h-4 w-4 shrink-0 text-gray-400" />
            </button>
            <select
              value={multipliers[preset.id] ?? 1}
              onChange={(e) =>
                setMultipliers((prev) => ({
                  ...prev,
                  [preset.id]: Number(e.target.value),
                }))
              }
              onClick={(e) => e.stopPropagation()}
              className="border-l border-gray-200 bg-gray-50 px-2 py-1.5 pr-6 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-r-lg"
              title={t('repeatCount')}
            >
              {PRESET_MULTIPLIERS.map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
