import { useEffect, useState } from 'react';
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

/** Display minutes without float noise (e.g. 15, 5.5). */
function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
}

/** Display percent as integer (e.g. 55 not 55.0000000000). */
function formatPercent(percent: number): string {
  return String(Math.round(percent));
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
  /** When set, the user is editing this field; value is the raw input string so they can clear/type freely. */
  const [editing, setEditing] = useState<{ field: string; value: string } | null>(null);
  useEffect(() => {
    if (!expanded) setEditing(null);
  }, [expanded]);
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
      className="overflow-hidden rounded-lg border border-border-default bg-surface shadow-sm transition-shadow hover:shadow-md"
      style={{ borderLeftWidth: '4px', borderLeftColor: zoneColor }}
    >
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
      >
        <span className="text-xs font-medium text-tertiary tabular-nums">
          {t('stepNumber', { num: index + 1 })}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
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
            className="rounded p-1.5 text-tertiary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-30 disabled:hover:bg-transparent"
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
            className="rounded p-1.5 text-tertiary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-30 disabled:hover:bg-transparent"
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
            className="rounded p-1.5 text-state-danger-text hover:bg-state-danger-bg focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-5 w-5 shrink-0 text-tertiary" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-tertiary" />
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border-default bg-muted/50 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-tertiary">Type</label>
              <select
                value={step.type}
                onChange={(e) => onUpdate(step.tempId, { type: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelDuration')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={editing?.field === 'duration' ? editing.value : formatMinutes(step.durationSeconds / 60)}
                    onFocus={() => setEditing({ field: 'duration', value: formatMinutes(step.durationSeconds / 60) })}
                    onBlur={() => {
                      const mins = parseFloat(editing?.field === 'duration' ? editing.value : '');
                      if (!Number.isNaN(mins) && mins >= 0)
                        onUpdate(step.tempId, { durationSeconds: Math.round(mins * 60) });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'duration' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelPowerLow')}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editing?.field === 'powerLow' ? editing.value : formatPercent(step.powerLow * 100)}
                    onFocus={() => setEditing({ field: 'powerLow', value: formatPercent(step.powerLow * 100) })}
                    onBlur={() => {
                      const pct = parseFloat(editing?.field === 'powerLow' ? editing.value : '');
                      if (!Number.isNaN(pct)) onUpdate(step.tempId, { powerLow: pct / 100 });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'powerLow' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelPowerHigh')}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editing?.field === 'powerHigh' ? editing.value : formatPercent(step.powerHigh * 100)}
                    onFocus={() => setEditing({ field: 'powerHigh', value: formatPercent(step.powerHigh * 100) })}
                    onBlur={() => {
                      const pct = parseFloat(editing?.field === 'powerHigh' ? editing.value : '');
                      if (!Number.isNaN(pct)) onUpdate(step.tempId, { powerHigh: pct / 100 });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'powerHigh' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    Repeat
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editing?.field === 'repeat' ? editing.value : String(step.repeat ?? 4)}
                    onFocus={() => setEditing({ field: 'repeat', value: String(step.repeat ?? 4) })}
                    onBlur={() => {
                      const raw = editing?.field === 'repeat' ? editing.value : '';
                      const n = parseInt(raw, 10);
                      if (!Number.isNaN(n) && n >= 1) onUpdate(step.tempId, { repeat: n });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'repeat' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelOnMin')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={editing?.field === 'onMin' ? editing.value : formatMinutes((step.onDurationSeconds ?? 60) / 60)}
                    onFocus={() => setEditing({ field: 'onMin', value: formatMinutes((step.onDurationSeconds ?? 60) / 60) })}
                    onBlur={() => {
                      const mins = parseFloat(editing?.field === 'onMin' ? editing.value : '');
                      if (!Number.isNaN(mins) && mins >= 0)
                        onUpdate(step.tempId, { onDurationSeconds: Math.round(mins * 60) });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'onMin' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelOffMin')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={editing?.field === 'offMin' ? editing.value : formatMinutes((step.offDurationSeconds ?? 60) / 60)}
                    onFocus={() => setEditing({ field: 'offMin', value: formatMinutes((step.offDurationSeconds ?? 60) / 60) })}
                    onBlur={() => {
                      const mins = parseFloat(editing?.field === 'offMin' ? editing.value : '');
                      if (!Number.isNaN(mins) && mins >= 0)
                        onUpdate(step.tempId, { offDurationSeconds: Math.round(mins * 60) });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'offMin' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelOnPower')}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editing?.field === 'onPower' ? editing.value : formatPercent((step.onPower ?? 1) * 100)}
                    onFocus={() => setEditing({ field: 'onPower', value: formatPercent((step.onPower ?? 1) * 100) })}
                    onBlur={() => {
                      const pct = parseFloat(editing?.field === 'onPower' ? editing.value : '');
                      if (!Number.isNaN(pct)) onUpdate(step.tempId, { onPower: pct / 100 });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'onPower' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('stepLabelOffPower')}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editing?.field === 'offPower' ? editing.value : formatPercent((step.offPower ?? 0.5) * 100)}
                    onFocus={() => setEditing({ field: 'offPower', value: formatPercent((step.offPower ?? 0.5) * 100) })}
                    onBlur={() => {
                      const pct = parseFloat(editing?.field === 'offPower' ? editing.value : '');
                      if (!Number.isNaN(pct)) onUpdate(step.tempId, { offPower: pct / 100 });
                      setEditing(null);
                    }}
                    onChange={(e) => setEditing((prev) => (prev?.field === 'offPower' ? { ...prev, value: e.target.value } : prev))}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-tertiary">
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
                className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="–"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
