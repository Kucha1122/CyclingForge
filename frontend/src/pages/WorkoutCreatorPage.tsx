import { useState, useEffect } from 'react';
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
      const newId = (await workoutsApi.importZwo(zwoImport)).data;
      navigate(`/workouts/${newId}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('creatorWorkoutNamePlaceholder')}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRAINING_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{totalMinutes} {tCommon('min')}</span>
            <button
              onClick={() => navigate('/workouts')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('creatorCancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">
                  {t('creatorZonePreview')}
                </h2>
                <IntervalChart steps={stepsForChart} height={200} />
              </div>
            </div>

            {/* Steps list */}
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {t('creatorWorkoutSteps')}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {t('creatorImportZwo')}
                  </button>
                  <button
                    onClick={addStep}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    + {t('creatorAddStep')}
                  </button>
                </div>
              </div>

              {showImport && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                  <textarea
                    value={zwoImport}
                    onChange={(e) => setZwoImport(e.target.value)}
                    rows={4}
                    className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('creatorImportPaste')}
                  />
                  <button
                    onClick={handleImport}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t('creatorImportButton')}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <WorkoutStepCard
                    key={step.tempId}
                    step={step}
                    index={idx}
                    isFirst={idx === 0}
                    isLast={idx === steps.length - 1}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                    onMove={moveStep}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Presets + Metadata (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <PresetBlockBar onAdd={addPresetBlocks} />
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                {t('creatorDescriptionSettings')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('creatorDescription')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('creatorDescriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {t('creatorTags')}
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('creatorTagsPlaceholder')}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium text-gray-700"
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
