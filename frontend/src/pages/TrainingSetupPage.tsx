import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trainingPreferenceApi } from '../services/api';
import type { SaveTrainingPreferenceRequest } from '../types/workout';
import { TRAINING_GOALS, FITNESS_LEVELS, PERIODIZATION_MODELS } from '../types/workout';

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
    periodizationModel: 'Auto',
    longRideDay: null,
    maxLongRideMinutes: 180,
    mesocycleWeeks: 4,
    restDays: [],
    weekStartDay: 0,
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
          periodizationModel: data.periodizationModel ?? 'Auto',
          longRideDay: data.longRideDay ?? null,
          maxLongRideMinutes: data.maxLongRideMinutes ?? 180,
          mesocycleWeeks: data.mesocycleWeeks ?? 4,
          restDays: data.restDays ?? [],
          weekStartDay: data.weekStartDay ?? 0,
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
    return <div className="flex min-h-screen items-center justify-center"><p className="text-tertiary">{t('loading')}</p></div>;
  }

  return (
    <div className="min-h-screen bg-page p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
          <p className="mt-2 text-secondary">{t('subtitle')}</p>
        </header>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? 'bg-accent' : 'bg-muted'}`} />
          ))}
        </div>

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="rounded-xl bg-surface p-8 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('primaryGoal')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRAINING_GOALS.map(g => {
                const keys = GOAL_I18N_KEYS[g];
                return (
                  <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      form.goal === g ? 'border-accent bg-state-active-bg' : 'border-border-default hover:border-accent'
                    }`}>
                    <span className="text-2xl">{GOAL_ICONS[g]}</span>
                    <p className="mt-1 font-semibold text-primary">{keys ? t(keys.label) : g}</p>
                    <p className="text-sm text-tertiary">{keys ? t(keys.desc) : ''}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="rounded-xl bg-surface p-8 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('howReceivePlan')}</h2>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, planMode: 'DailyRecommendations' }))}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  form.planMode === 'DailyRecommendations' ? 'border-accent bg-state-active-bg' : 'border-border-default hover:border-accent'
                }`}
              >
                <p className="font-semibold text-primary">{t('dailyRecommendations')}</p>
                <p className="text-sm text-tertiary">{t('dailyRecommendationsDesc')}</p>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, planMode: 'FullPlan' }))}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  form.planMode === 'FullPlan' ? 'border-accent bg-state-active-bg' : 'border-border-default hover:border-accent'
                }`}
              >
                <p className="font-semibold text-primary">{t('fullPlan')}</p>
                <p className="text-sm text-tertiary">{t('fullPlanDesc', { weeks: form.planDurationWeeks })}</p>
              </button>
            </div>
            {form.planMode === 'FullPlan' && (
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold text-primary">{t('periodizationModel')}</h3>
                <p className="mb-3 text-sm text-tertiary">{t('periodizationModelDesc')}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PERIODIZATION_MODELS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, periodizationModel: m }))}
                      className={`rounded-xl border-2 p-4 text-left transition-colors ${
                        form.periodizationModel === m ? 'border-accent bg-state-active-bg' : 'border-border-default hover:border-accent'
                      }`}
                    >
                      <p className="font-semibold text-primary">{t(`periodization_${m}`)}</p>
                      <p className="text-sm text-tertiary">{t(`periodization_${m}_desc`)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.planMode === 'FullPlan' && (
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold text-primary">{t('mesocycle')}</h3>
                <p className="mb-3 text-sm text-tertiary">{t('mesocycleDesc')}</p>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mesocycleWeeks: w }))}
                      className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        form.mesocycleWeeks === w ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                      }`}
                    >
                      {t('mesocycleOption', { build: w - 1, total: w })}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.planMode === 'FullPlan' && (
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold text-primary">{t('longRide')}</h3>
                <p className="mb-3 text-sm text-tertiary">{t('longRideDesc')}</p>
                <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, longRideDay: null }))}
                    className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      form.longRideDay === null ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                    }`}
                  >
                    {t('longRideNone')}
                  </button>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, longRideDay: d }))}
                      className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        form.longRideDay === d ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                      }`}
                    >
                      {t(`weekday_${d}`)}
                    </button>
                  ))}
                </div>
                {form.longRideDay !== null && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-secondary">
                      {t('maxLongRide', { hours: (form.maxLongRideMinutes / 60).toFixed(1) })}
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={360}
                      step={30}
                      value={form.maxLongRideMinutes}
                      onChange={e => setForm(f => ({ ...f, maxLongRideMinutes: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
            {form.planMode === 'FullPlan' && (
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold text-primary">{t('restDays')}</h3>
                <p className="mb-3 text-sm text-tertiary">{t('restDaysDesc')}</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {[0, 1, 2, 3, 4, 5, 6].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        restDays: f.restDays.includes(d) ? f.restDays.filter(x => x !== d) : [...f.restDays, d],
                      }))}
                      className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        form.restDays.includes(d) ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                      }`}
                    >
                      {t(`weekday_${d}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-6">
              <h3 className="mb-1 text-lg font-semibold text-primary">{t('weekStartDay')}</h3>
              <p className="mb-3 text-sm text-tertiary">{t('weekStartDayDesc')}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[0, 1, 2, 3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, weekStartDay: d }))}
                    className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      form.weekStartDay === d ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                    }`}
                  >
                    {t(`weekday_${d}`)}
                  </button>
                ))}
              </div>
            </div>
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('weeklySchedule')}</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-secondary">{t('trainingDaysPerWeek')}</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7].map(d => (
                    <button key={d} onClick={() => setForm(f => ({ ...f, daysPerWeek: d }))}
                      className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        form.daysPerWeek === d ? 'bg-accent text-accent-foreground' : 'bg-muted text-secondary hover:bg-state-active-bg'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-secondary">
                  {t('weeklyHoursAvailable')} <span className="text-accent">{form.weeklyHoursAvailable}{t('hoursShort')}</span>
                </label>
                <input type="range" min={2} max={20} step={0.5} value={form.weeklyHoursAvailable}
                  onChange={e => setForm(f => ({ ...f, weeklyHoursAvailable: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-tertiary"><span>2{t('hoursShort')}</span><span>20{t('hoursShort')}</span></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-secondary">
                  {t('preferredDuration')} <span className="text-accent">{form.preferredWorkoutMinutes} {t('range20min')}</span>
                </label>
                <input type="range" min={20} max={180} step={5} value={form.preferredWorkoutMinutes}
                  onChange={e => setForm(f => ({ ...f, preferredWorkoutMinutes: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-tertiary"><span>{t('range20min')}</span><span>{t('range3hrs')}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <div className="rounded-xl bg-surface p-8 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('experienceLevel')}</h2>
            <div className="mb-6 space-y-3">
              {FITNESS_LEVELS.map(l => {
                const keys = LEVEL_I18N_KEYS[l];
                return (
                  <button key={l} onClick={() => setForm(f => ({ ...f, level: l }))}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                      form.level === l ? 'border-accent bg-state-active-bg' : 'border-border-default hover:border-accent'
                    }`}>
                    <p className="font-semibold text-primary">{keys ? t(keys.label) : l}</p>
                    <p className="text-sm text-tertiary">{keys ? t(keys.desc) : ''}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-secondary">{t('targetEventDate')}</label>
              <input type="date" value={form.targetEventDate ?? ''}
                onChange={e => setForm(f => ({ ...f, targetEventDate: e.target.value || null }))}
                className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none" />
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <div className="rounded-xl bg-surface p-8 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('additionalPreferences')}</h2>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-secondary">
                  {t('planDuration')} <span className="text-accent">{form.planDurationWeeks} {t('weeks')}</span>
                </label>
                <input type="range" min={4} max={52} step={1} value={form.planDurationWeeks}
                  onChange={e => setForm(f => ({ ...f, planDurationWeeks: +e.target.value }))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-tertiary"><span>4 {t('weeks')}</span><span>52 {t('weeks')}</span></div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border-default p-4">
                <input type="checkbox" id="nonCycling" checked={form.considerNonCycling}
                  onChange={e => setForm(f => ({ ...f, considerNonCycling: e.target.checked }))}
                  className="mt-1" />
                <label htmlFor="nonCycling" className="text-sm">
                  <span className="font-medium text-primary">{t('suggestNonCycling')}</span>
                  <p className="text-tertiary">{t('suggestNonCyclingDesc')}</p>
                </label>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-3 text-sm font-semibold text-secondary">{t('planSummary')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-tertiary">{t('goal')}</div>
                  <div className="font-medium text-primary">{GOAL_I18N_KEYS[form.goal] ? t(GOAL_I18N_KEYS[form.goal].label) : form.goal}</div>
                  <div className="text-tertiary">{t('schedule')}</div>
                  <div className="font-medium text-primary">{form.daysPerWeek} {t('daysPerWeek')}, {form.weeklyHoursAvailable}{t('hoursShort')}</div>
                  <div className="text-tertiary">{t('level')}</div>
                  <div className="font-medium text-primary">{LEVEL_I18N_KEYS[form.level] ? t(LEVEL_I18N_KEYS[form.level].label) : form.level}</div>
                  <div className="text-tertiary">{t('duration')}</div>
                  <div className="font-medium text-primary">{form.planDurationWeeks} {t('weeks')}</div>
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
            className="rounded-lg border border-border-default px-6 py-2.5 text-sm font-medium text-secondary hover:bg-page disabled:opacity-50"
          >
            {t('back')}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90">
              {t('next')}
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? t('saving') : t('saveAndStart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
