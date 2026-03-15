import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workoutsApi } from '../services/api';
import { IntervalChart } from '../components/workouts/IntervalChart';
import { PresetBlockBar } from '../components/workouts/PresetBlockBar';
import { WorkoutStepCard } from '../components/workouts/WorkoutStepCard';
import type { PresetBlock } from '../constants/workoutPresets';
import type { CreateWorkoutStepDto, WorkoutStepDto } from '../types/workout';
import { WORKOUT_CATEGORIES, TRAINING_ZONES } from '../types/workout';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};
const STEP_TYPE_I18N_KEYS: Record<string, string> = {
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

interface EditableStep extends CreateWorkoutStepDto {
  tempId: string;
}

const newStep = (order: number): EditableStep => ({
  tempId: crypto.randomUUID(),
  order,
  type: 'SteadyState',
  durationSeconds: 300,
  powerLow: 0.7,
  powerHigh: 0.7,
  cadence: null,
  repeat: null,
  onDurationSeconds: null,
  offDurationSeconds: null,
  onPower: null,
  offPower: null,
  onCadence: null,
  offCadence: null,
});

export const WorkoutCreatorPage = () => {
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Endurance');
  const [targetZone, setTargetZone] = useState('Z2');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [steps, setSteps] = useState<EditableStep[]>([
    {
      ...newStep(1),
      type: 'Warmup',
      durationSeconds: 600,
      powerLow: 0.4,
      powerHigh: 0.7,
    },
    {
      ...newStep(2),
      type: 'SteadyState',
      durationSeconds: 1200,
      powerLow: 0.7,
      powerHigh: 0.7,
    },
    {
      ...newStep(3),
      type: 'Cooldown',
      durationSeconds: 300,
      powerLow: 0.6,
      powerHigh: 0.4,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [zwoImport, setZwoImport] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [highlightedStepOrder, setHighlightedStepOrder] = useState<number | null>(null);
  const highlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHighlight = (order: number | null) => {
    if (highlightClearRef.current) {
      clearTimeout(highlightClearRef.current);
      highlightClearRef.current = null;
    }
    setHighlightedStepOrder(order);
  };

  const scheduleClearHighlight = () => {
    highlightClearRef.current = setTimeout(() => {
      setHighlightedStepOrder(null);
      highlightClearRef.current = null;
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    workoutsApi.getById(id).then(({ data }) => {
      setName(data.name);
      setDescription(data.description);
      setCategory(data.category);
      setTargetZone(data.targetZone);
      setIsPublic(data.isPublic);
      setTags(data.tags || '');
      setSteps(
        data.steps.map((s) => ({ ...s, tempId: crypto.randomUUID() }))
      );
    });
  }, [id]);

  const addStep = () => {
    setSteps((prev) => [...prev, newStep(prev.length + 1)]);
  };

  const addPresetBlocks = (preset: PresetBlock, count: number) => {
    setSteps((prev) => {
      const newSteps: EditableStep[] = [];
      for (let i = 0; i < count; i++) {
        const base = preset.toStep(prev.length + 1 + i);
        newSteps.push({
          ...base,
          tempId: crypto.randomUUID(),
          order: prev.length + 1 + i,
        });
      }
      return [...prev, ...newSteps].map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const removeStep = (tempId: string) => {
    setSteps((prev) =>
      prev.filter((s) => s.tempId !== tempId).map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const updateStep = (tempId: string, updates: Partial<EditableStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
    );
  };

  const moveStep = (tempId: string, direction: 'up' | 'down') => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.tempId === tempId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const stepsForChart: WorkoutStepDto[] = steps.map((s, i) => ({
    id: s.tempId,
    order: i + 1,
    type: s.type,
    durationSeconds:
      s.type === 'Intervals' &&
      s.repeat &&
      s.onDurationSeconds &&
      s.offDurationSeconds
        ? s.repeat * (s.onDurationSeconds + s.offDurationSeconds)
        : s.durationSeconds,
    powerLow: s.powerLow,
    powerHigh: s.powerHigh,
    cadence: s.cadence ?? null,
    repeat: s.repeat ?? null,
    onDurationSeconds: s.onDurationSeconds ?? null,
    offDurationSeconds: s.offDurationSeconds ?? null,
    onPower: s.onPower ?? null,
    offPower: s.offPower ?? null,
    onCadence: s.onCadence ?? null,
    offCadence: s.offCadence ?? null,
  }));

  const totalDuration = stepsForChart.reduce(
    (sum, s) => sum + s.durationSeconds,
    0
  );
  const totalMinutes = Math.ceil(totalDuration / 60);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        category,
        targetZone,
        isPublic,
        tags: tags || null,
        steps: steps.map(({ tempId, ...rest }) => rest),
      };

      if (isEditing) {
        await workoutsApi.update(id!, payload);
      } else {
        await workoutsApi.create(payload);
      }

      navigate('/workouts');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!zwoImport.trim()) return;
    try {
      const { data } = await workoutsApi.parseZwo(zwoImport);
      setName(data.name);
      setDescription(data.description ?? '');
      setCategory(data.category);
      setTargetZone(data.targetZone);
      setIsPublic(data.isPublic);
      setTags(data.tags ?? '');
      setSteps(
        data.steps.map((s, i) => ({
          ...s,
          tempId: crypto.randomUUID(),
          order: i + 1,
        }))
      );
      setZwoImport('');
      setShowImport(false);
    } catch {
      // leave textarea as is on error
    }
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('creatorWorkoutNamePlaceholder')}
              className="min-w-0 flex-1 rounded-lg border border-border-default bg-surface px-3 py-2 text-lg font-semibold text-primary placeholder-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {WORKOUT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(CATEGORY_I18N_KEYS[c] ?? 'categoryMixed')}
                </option>
              ))}
            </select>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TRAINING_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-tertiary">{totalMinutes} {tCommon('min')}</span>
            <button
              onClick={() => navigate('/workouts')}
              className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {t('creatorCancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            >
              {saving ? t('creatorSaving') : isEditing ? t('creatorSave') : t('creatorCreate')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column: Chart + Steps (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sticky chart */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-secondary">
                    {t('creatorZonePreview')}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-opacity duration-200 ${highlightedStepOrder != null ? 'bg-accent/15 text-accent' : 'invisible'}`}
                    role="status"
                    aria-hidden={highlightedStepOrder == null}
                  >
                    {highlightedStepOrder != null ? (() => {
                      const step = steps.find((s) => Number(s.order) === highlightedStepOrder);
                      return step ? t('stepHighlightLabel', { order: step.order, type: t(STEP_TYPE_I18N_KEYS[step.type] ?? step.type) }) : '';
                    })() : t('stepHighlightLabel', { order: 1, type: t('stepWarmup') })}
                  </span>
                </div>
                <IntervalChart steps={stepsForChart} height={200} highlightedStepOrder={highlightedStepOrder} />
              </div>
            </div>

            {/* Steps list */}
            <div className="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-secondary">
                  {t('creatorWorkoutSteps')}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {t('creatorImportZwo')}
                  </button>
                  <button
                    onClick={addStep}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
                  >
                    + {t('creatorAddStep')}
                  </button>
                </div>
              </div>

              {showImport && (
                <div className="mb-4 rounded-lg border border-border-default bg-state-active-bg p-4">
                  <textarea
                    value={zwoImport}
                    onChange={(e) => setZwoImport(e.target.value)}
                    rows={4}
                    className="mb-2 w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={t('creatorImportPaste')}
                  />
                  <button
                    onClick={handleImport}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                  >
                    {t('creatorImportButton')}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.tempId}
                    className={`rounded-lg transition-[box-shadow] duration-200 ease-out ${Number(step.order) === highlightedStepOrder ? 'ring-2 ring-accent/70 ring-offset-2 ring-offset-page' : ''}`}
                    onMouseEnter={() => setHighlight(Number(step.order))}
                    onMouseLeave={scheduleClearHighlight}
                  >
                    <WorkoutStepCard
                      step={step}
                      index={idx}
                      isFirst={idx === 0}
                      isLast={idx === steps.length - 1}
                      onUpdate={updateStep}
                      onRemove={removeStep}
                      onMove={moveStep}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Presets + Metadata (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default">
              <PresetBlockBar onAdd={addPresetBlocks} />
            </div>

            <div className="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default">
              <h3 className="mb-3 text-sm font-semibold text-secondary">
                {t('creatorDescriptionSettings')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('creatorDescription')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={t('creatorDescriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertiary">
                    {t('creatorTags')}
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={t('creatorTagsPlaceholder')}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium text-primary"
                  >
                    {t('creatorPublicWorkout')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
