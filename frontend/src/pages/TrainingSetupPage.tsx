import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingPreferenceApi } from '../services/api';
import type { SaveTrainingPreferenceRequest } from '../types/workout';
import { TRAINING_GOALS, FITNESS_LEVELS } from '../types/workout';

const GOAL_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  GeneralFitness: { label: 'General Fitness', desc: 'Overall cycling fitness and health', icon: '🎯' },
  FtpImprovement: { label: 'Increase FTP', desc: 'Raise your functional threshold power', icon: '⚡' },
  Endurance: { label: 'Build Endurance', desc: 'Longer rides with more stamina', icon: '🏔️' },
  SprintPower: { label: 'Sprint Power', desc: 'Short, explosive power development', icon: '💨' },
  RacePrep: { label: 'Race Preparation', desc: 'Get ready for race day', icon: '🏆' },
  WeightLoss: { label: 'Weight Loss', desc: 'Burn calories effectively', icon: '🔥' },
};

const LEVEL_LABELS: Record<string, { label: string; desc: string }> = {
  Beginner: { label: 'Beginner', desc: 'New to structured training' },
  Intermediate: { label: 'Intermediate', desc: '1-3 years of training experience' },
  Advanced: { label: 'Advanced', desc: '3+ years, comfortable with high intensity' },
};

export const TrainingSetupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SaveTrainingPreferenceRequest>({
    goal: 'GeneralFitness',
    daysPerWeek: 4,
    weeklyHoursAvailable: 8,
    planDurationWeeks: 12,
    level: 'Intermediate',
    targetEventDate: null,
    preferredWorkoutMinutes: 60,
    considerNonCycling: true,
  });

  useEffect(() => {
    trainingPreferenceApi.get()
      .then(({ data }) => {
        setForm({
          goal: data.goal,
          daysPerWeek: data.daysPerWeek,
          weeklyHoursAvailable: data.weeklyHoursAvailable,
          planDurationWeeks: data.planDurationWeeks,
          level: data.level,
          targetEventDate: data.targetEventDate,
          preferredWorkoutMinutes: data.preferredWorkoutMinutes,
          considerNonCycling: data.considerNonCycling,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await trainingPreferenceApi.save(form);
      navigate('/workout/today');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Training Plan Setup</h1>
          <p className="mt-2 text-gray-600">Customize your workout recommendations</p>
        </header>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">What is your primary training goal?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRAINING_GOALS.map(g => {
                const info = GOAL_LABELS[g];
                return (
                  <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      form.goal === g ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-2xl">{info.icon}</span>
                    <p className="mt-1 font-semibold text-gray-900">{info.label}</p>
                    <p className="text-sm text-gray-500">{info.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Your Weekly Schedule</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Training days per week</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7].map(d => (
                    <button key={d} onClick={() => setForm(f => ({ ...f, daysPerWeek: d }))}
                      className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        form.daysPerWeek === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Weekly hours available: <span className="text-blue-600">{form.weeklyHoursAvailable}h</span>
                </label>
                <input type="range" min={2} max={20} step={0.5} value={form.weeklyHoursAvailable}
                  onChange={e => setForm(f => ({ ...f, weeklyHoursAvailable: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>2h</span><span>20h</span></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preferred workout duration: <span className="text-blue-600">{form.preferredWorkoutMinutes} min</span>
                </label>
                <input type="range" min={20} max={180} step={5} value={form.preferredWorkoutMinutes}
                  onChange={e => setForm(f => ({ ...f, preferredWorkoutMinutes: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>20 min</span><span>3 hrs</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Your Experience Level</h2>
            <div className="mb-6 space-y-3">
              {FITNESS_LEVELS.map(l => {
                const info = LEVEL_LABELS[l];
                return (
                  <button key={l} onClick={() => setForm(f => ({ ...f, level: l }))}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                      form.level === l ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className="font-semibold text-gray-900">{info.label}</p>
                    <p className="text-sm text-gray-500">{info.desc}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Target event date (optional)</label>
              <input type="date" value={form.targetEventDate ?? ''}
                onChange={e => setForm(f => ({ ...f, targetEventDate: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Additional Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Plan duration: <span className="text-blue-600">{form.planDurationWeeks} weeks</span>
                </label>
                <input type="range" min={4} max={52} step={1} value={form.planDurationWeeks}
                  onChange={e => setForm(f => ({ ...f, planDurationWeeks: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>4 weeks</span><span>52 weeks</span></div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input type="checkbox" id="nonCycling" checked={form.considerNonCycling}
                  onChange={e => setForm(f => ({ ...f, considerNonCycling: e.target.checked }))}
                  className="mt-1" />
                <label htmlFor="nonCycling" className="text-sm">
                  <span className="font-medium text-gray-900">Suggest non-cycling alternatives</span>
                  <p className="text-gray-500">When highly fatigued, suggest a walk or complete rest instead of a ride</p>
                </label>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Your Plan Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Goal:</div>
                  <div className="font-medium">{GOAL_LABELS[form.goal]?.label}</div>
                  <div className="text-gray-500">Schedule:</div>
                  <div className="font-medium">{form.daysPerWeek} days/week, {form.weeklyHoursAvailable}h</div>
                  <div className="text-gray-500">Level:</div>
                  <div className="font-medium">{form.level}</div>
                  <div className="text-gray-500">Duration:</div>
                  <div className="font-medium">{form.planDurationWeeks} weeks</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Back
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              Next
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save & Start'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
