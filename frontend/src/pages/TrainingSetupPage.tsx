import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trainingPreferenceApi } from '../services/api';
import type { SaveTrainingPreferenceRequest } from '../types/workout';
import { TRAINING_GOALS, FITNESS_LEVELS } from '../types/workout';

const GOAL_ICONS: Record<string, string> = {
  GeneralFitness: '🎯',
  FtpImprovement: '⚡',
  Endurance: '🏔️',
  SprintPower: '💨',
  RacePrep: '🏆',
  WeightLoss: '🔥',
};

const GOAL_I18N_KEYS: Record<string, { label: string; desc: string }> = {
  GeneralFitness: { label: 'goalGeneralFitness', desc: 'goalGeneralFitnessDesc' },
  FtpImprovement: { label: 'goalFtpImprovement', desc: 'goalFtpImprovementDesc' },
  Endurance: { label: 'goalEndurance', desc: 'goalEnduranceDesc' },
  SprintPower: { label: 'goalSprintPower', desc: 'goalSprintPowerDesc' },
  RacePrep: { label: 'goalRacePrep', desc: 'goalRacePrepDesc' },
  WeightLoss: { label: 'goalWeightLoss', desc: 'goalWeightLossDesc' },
};

const LEVEL_I18N_KEYS: Record<string, { label: string; desc: string }> = {
  Beginner: { label: 'levelBeginner', desc: 'levelBeginnerDesc' },
  Intermediate: { label: 'levelIntermediate', desc: 'levelIntermediateDesc' },
  Advanced: { label: 'levelAdvanced', desc: 'levelAdvancedDesc' },
};

export const TrainingSetupPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('trainingSetup');
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
    planMode: 'DailyRecommendations',
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
          planMode: data.planMode ?? 'DailyRecommendations',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await trainingPreferenceApi.save(form);
      navigate(form.planMode === 'FullPlan' ? '/workout/plan' : '/workout/today');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">{t('loading')}</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">{t('subtitle')}</p>
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
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('primaryGoal')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRAINING_GOALS.map(g => {
                const keys = GOAL_I18N_KEYS[g];
                return (
                  <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      form.goal === g ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-2xl">{GOAL_ICONS[g]}</span>
                    <p className="mt-1 font-semibold text-gray-900">{keys ? t(keys.label) : g}</p>
                    <p className="text-sm text-gray-500">{keys ? t(keys.desc) : ''}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('howReceivePlan')}</h2>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, planMode: 'DailyRecommendations' }))}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  form.planMode === 'DailyRecommendations' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{t('dailyRecommendations')}</p>
                <p className="text-sm text-gray-500">{t('dailyRecommendationsDesc')}</p>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, planMode: 'FullPlan' }))}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  form.planMode === 'FullPlan' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{t('fullPlan')}</p>
                <p className="text-sm text-gray-500">{t('fullPlanDesc', { weeks: form.planDurationWeeks })}</p>
              </button>
            </div>
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('weeklySchedule')}</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('trainingDaysPerWeek')}</label>
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
                  {t('weeklyHoursAvailable')} <span className="text-blue-600">{form.weeklyHoursAvailable}{t('hoursShort')}</span>
                </label>
                <input type="range" min={2} max={20} step={0.5} value={form.weeklyHoursAvailable}
                  onChange={e => setForm(f => ({ ...f, weeklyHoursAvailable: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>2{t('hoursShort')}</span><span>20{t('hoursShort')}</span></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('preferredDuration')} <span className="text-blue-600">{form.preferredWorkoutMinutes} {t('range20min')}</span>
                </label>
                <input type="range" min={20} max={180} step={5} value={form.preferredWorkoutMinutes}
                  onChange={e => setForm(f => ({ ...f, preferredWorkoutMinutes: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>{t('range20min')}</span><span>{t('range3hrs')}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('experienceLevel')}</h2>
            <div className="mb-6 space-y-3">
              {FITNESS_LEVELS.map(l => {
                const keys = LEVEL_I18N_KEYS[l];
                return (
                  <button key={l} onClick={() => setForm(f => ({ ...f, level: l }))}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                      form.level === l ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className="font-semibold text-gray-900">{keys ? t(keys.label) : l}</p>
                    <p className="text-sm text-gray-500">{keys ? t(keys.desc) : ''}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{t('targetEventDate')}</label>
              <input type="date" value={form.targetEventDate ?? ''}
                onChange={e => setForm(f => ({ ...f, targetEventDate: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('additionalPreferences')}</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('planDuration')} <span className="text-blue-600">{form.planDurationWeeks} {t('weeks')}</span>
                </label>
                <input type="range" min={4} max={52} step={1} value={form.planDurationWeeks}
                  onChange={e => setForm(f => ({ ...f, planDurationWeeks: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>4 {t('weeks')}</span><span>52 {t('weeks')}</span></div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input type="checkbox" id="nonCycling" checked={form.considerNonCycling}
                  onChange={e => setForm(f => ({ ...f, considerNonCycling: e.target.checked }))}
                  className="mt-1" />
                <label htmlFor="nonCycling" className="text-sm">
                  <span className="font-medium text-gray-900">{t('suggestNonCycling')}</span>
                  <p className="text-gray-500">{t('suggestNonCyclingDesc')}</p>
                </label>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('planSummary')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">{t('goal')}</div>
                  <div className="font-medium">{GOAL_I18N_KEYS[form.goal] ? t(GOAL_I18N_KEYS[form.goal].label) : form.goal}</div>
                  <div className="text-gray-500">{t('schedule')}</div>
                  <div className="font-medium">{form.daysPerWeek} {t('daysPerWeek')}, {form.weeklyHoursAvailable}{t('hoursShort')}</div>
                  <div className="text-gray-500">{t('level')}</div>
                  <div className="font-medium">{LEVEL_I18N_KEYS[form.level] ? t(LEVEL_I18N_KEYS[form.level].label) : form.level}</div>
                  <div className="text-gray-500">{t('duration')}</div>
                  <div className="font-medium">{form.planDurationWeeks} {t('weeks')}</div>
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
            {t('back')}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              {t('next')}
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('saving') : t('saveAndStart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
