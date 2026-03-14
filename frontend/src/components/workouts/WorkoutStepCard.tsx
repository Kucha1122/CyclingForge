import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { STEP_TYPES } from '../../types/workout';
import { ZONE_COLORS } from '../../types/workout';
import type { CreateWorkoutStepDto } from '../../types/workout';

const STEP_TYPE_I18N_KEYS: Record<string, string> = {
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

interface EditableStep extends CreateWorkoutStepDto {
  tempId: string;
}

function powerToZone(power: number): string {
  if (power < 0.56) return 'Z1';
  if (power < 0.76) return 'Z2';
  if (power < 0.91) return 'Z3';
  if (power < 1.06) return 'Z4';
  if (power < 1.21) return 'Z5';
  return 'Z6';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
}

interface WorkoutStepCardProps {
  step: EditableStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (tempId: string, updates: Partial<EditableStep>) => void;
  onRemove: (tempId: string) => void;
  onMove: (tempId: string, direction: 'up' | 'down') => void;
}

export const WorkoutStepCard = ({
  step,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: WorkoutStepCardProps) => {
  const { t } = useTranslation('workouts');
  const [expanded, setExpanded] = useState(false);
  const zone = powerToZone(step.powerHigh);
  const zoneColor = ZONE_COLORS[zone] ?? '#94a3b8';
  const stepTypeLabel = t(STEP_TYPE_I18N_KEYS[step.type] ?? step.type);

  const totalDuration =
    step.type === 'Intervals' &&
    step.repeat != null &&
    step.onDurationSeconds != null &&
    step.offDurationSeconds != null
      ? step.repeat * (step.onDurationSeconds + step.offDurationSeconds)
      : step.durationSeconds;

  const powerLabel =
    step.powerLow === step.powerHigh
      ? `${Math.round(step.powerHigh * 100)}%`
      : `${Math.round(step.powerLow * 100)}–${Math.round(step.powerHigh * 100)}%`;

  const intervalsLabel =
    step.type === 'Intervals' && step.repeat && step.onDurationSeconds && step.offDurationSeconds
      ? `${step.repeat}× (${formatDuration(step.onDurationSeconds)} ON @ ${Math.round((step.onPower ?? 1) * 100)}% / ${formatDuration(step.offDurationSeconds)} OFF @ ${Math.round((step.offPower ?? 0.5) * 100)}%)`
      : null;

  const collapsedSummary =
    step.type === 'Intervals' && intervalsLabel
      ? intervalsLabel
      : `${stepTypeLabel} · ${formatDuration(totalDuration)} · ${powerLabel}`;

  return (
    <div
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ borderLeftWidth: '4px', borderLeftColor: zoneColor }}
    >
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <span className="text-xs font-medium text-gray-500 tabular-nums">
          {t('stepNumber', { num: index + 1 })}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
          {collapsedSummary}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(step.tempId, 'up');
            }}
            disabled={isFirst}
            title={t('stepMoveUp')}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(step.tempId, 'down');
            }}
            disabled={isLast}
            title="Przesuń w dół"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(step.tempId);
            }}
            title={t('stepRemove')}
            className="rounded p-1.5 text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-5 w-5 shrink-0 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400" />
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
              <select
                value={step.type}
                onChange={(e) => onUpdate(step.tempId, { type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STEP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {step.type !== 'Intervals' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('stepLabelDuration')}
                  </label>
                  <input
                    type="number"
                    value={step.durationSeconds}
                    onChange={(e) =>
                      onUpdate(step.tempId, { durationSeconds: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Power Low (% FTP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={step.powerLow}
                    onChange={(e) =>
                      onUpdate(step.tempId, { powerLow: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('stepLabelPowerHigh')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={step.powerHigh}
                    onChange={(e) =>
                      onUpdate(step.tempId, { powerHigh: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Repeat
                  </label>
                  <input
                    type="number"
                    value={step.repeat ?? 4}
                    onChange={(e) =>
                      onUpdate(step.tempId, { repeat: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('stepLabelOnSec')}
                  </label>
                  <input
                    type="number"
                    value={step.onDurationSeconds ?? 60}
                    onChange={(e) =>
                      onUpdate(step.tempId, {
                        onDurationSeconds: +e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Off (sec)
                  </label>
                  <input
                    type="number"
                    value={step.offDurationSeconds ?? 60}
                    onChange={(e) =>
                      onUpdate(step.tempId, {
                        offDurationSeconds: +e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('stepLabelOnPower')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={step.onPower ?? 1.0}
                    onChange={(e) =>
                      onUpdate(step.tempId, { onPower: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Off Power (% FTP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={step.offPower ?? 0.5}
                    onChange={(e) =>
                      onUpdate(step.tempId, { offPower: +e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {t('stepLabelCadence')}
              </label>
              <input
                type="number"
                value={step.cadence ?? ''}
                onChange={(e) =>
                  onUpdate(step.tempId, {
                    cadence: e.target.value ? +e.target.value : null,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="–"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
