import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workoutsApi } from '../services/api';
import { IntervalChart } from '../components/workouts/IntervalChart';
import type { CreateWorkoutStepDto, WorkoutStepDto } from '../types/workout';
import { WORKOUT_CATEGORIES, TRAINING_ZONES, STEP_TYPES } from '../types/workout';

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
    { ...newStep(1), type: 'Warmup', durationSeconds: 600, powerLow: 0.4, powerHigh: 0.7 },
    { ...newStep(2), type: 'SteadyState', durationSeconds: 1200, powerLow: 0.7, powerHigh: 0.7 },
    { ...newStep(3), type: 'Cooldown', durationSeconds: 300, powerLow: 0.6, powerHigh: 0.4 },
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
      setSteps(data.steps.map(s => ({ ...s, tempId: crypto.randomUUID() })));
    });
  }, [id]);

  const addStep = () => {
    setSteps(prev => [...prev, newStep(prev.length + 1)]);
  };

  const removeStep = (tempId: string) => {
    setSteps(prev => prev.filter(s => s.tempId !== tempId).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (tempId: string, updates: Partial<EditableStep>) => {
    setSteps(prev => prev.map(s => s.tempId === tempId ? { ...s, ...updates } : s));
  };

  const moveStep = (tempId: string, direction: 'up' | 'down') => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.tempId === tempId);
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
    durationSeconds: s.type === 'Intervals' && s.repeat && s.onDurationSeconds && s.offDurationSeconds
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

  const totalDuration = stepsForChart.reduce((sum, s) => sum + s.durationSeconds, 0);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Workout' : 'Create Workout'}</h1>
        <p className="text-gray-600">Design your custom structured workout</p>
      </header>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Metadata */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="endurance, base, climbing" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {WORKOUT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Target Zone</label>
              <select value={targetZone} onChange={e => setTargetZone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {TRAINING_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              <label htmlFor="isPublic" className="text-sm text-gray-700">Public workout</label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <span className="text-sm text-gray-500">{totalMinutes} min total</span>
          </div>
          <IntervalChart steps={stepsForChart} height={140} />
        </div>

        {/* Steps Editor */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Workout Steps</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowImport(!showImport)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                Import .zwo
              </button>
              <button onClick={addStep}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                + Add Step
              </button>
            </div>
          </div>

          {showImport && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <textarea value={zwoImport} onChange={e => setZwoImport(e.target.value)} rows={4}
                className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Paste ZWO XML content here..." />
              <button onClick={handleImport}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                Import
              </button>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.tempId} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Step {idx + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveStep(step.tempId, 'up')} disabled={idx === 0}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                    <button onClick={() => moveStep(step.tempId, 'down')} disabled={idx === steps.length - 1}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                    <button onClick={() => removeStep(step.tempId)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">✕</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Type</label>
                    <select value={step.type} onChange={e => updateStep(step.tempId, { type: e.target.value })}
                      className="w-full rounded border px-2 py-1.5 text-sm">
                      {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {step.type !== 'Intervals' ? (
                    <>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Duration (sec)</label>
                        <input type="number" value={step.durationSeconds}
                          onChange={e => updateStep(step.tempId, { durationSeconds: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Power Low (% FTP)</label>
                        <input type="number" step="0.01" value={step.powerLow}
                          onChange={e => updateStep(step.tempId, { powerLow: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Power High (% FTP)</label>
                        <input type="number" step="0.01" value={step.powerHigh}
                          onChange={e => updateStep(step.tempId, { powerHigh: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Repeat</label>
                        <input type="number" value={step.repeat ?? 4}
                          onChange={e => updateStep(step.tempId, { repeat: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">On (sec)</label>
                        <input type="number" value={step.onDurationSeconds ?? 60}
                          onChange={e => updateStep(step.tempId, { onDurationSeconds: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Off (sec)</label>
                        <input type="number" value={step.offDurationSeconds ?? 60}
                          onChange={e => updateStep(step.tempId, { offDurationSeconds: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">On Power</label>
                        <input type="number" step="0.01" value={step.onPower ?? 1.0}
                          onChange={e => updateStep(step.tempId, { onPower: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Off Power</label>
                        <input type="number" step="0.01" value={step.offPower ?? 0.5}
                          onChange={e => updateStep(step.tempId, { offPower: +e.target.value })}
                          className="w-full rounded border px-2 py-1.5 text-sm" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Cadence (opt)</label>
                    <input type="number" value={step.cadence ?? ''}
                      onChange={e => updateStep(step.tempId, { cadence: e.target.value ? +e.target.value : null })}
                      className="w-full rounded border px-2 py-1.5 text-sm" placeholder="-" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <button onClick={() => navigate('/workouts')}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : isEditing ? 'Update Workout' : 'Create Workout'}
          </button>
        </div>
      </div>
    </div>
  );
};
