import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SaveTrainingPreferenceRequest } from '@cyclingforge/shared';
import { TRAINING_GOALS, FITNESS_LEVELS, PERIODIZATION_MODELS } from '@cyclingforge/shared';
import { trainingPreferenceApi } from '../services/api';
import type { TrainingSetupScreenProps } from '../navigation/types';

const GOAL_ICONS: Record<string, string> = {
  GeneralFitness: '🎯', FtpImprovement: '⚡', Endurance: '🏔️',
  SprintPower: '💨', RacePrep: '🏆', WeightLoss: '🔥',
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

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function TrainingSetupScreen({ navigation }: TrainingSetupScreenProps) {
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
      navigation.goBack();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-sm text-slate-400 mt-3">{t('loading')}</Text>
      </View>
    );
  }

  const isFullPlan = form.planMode === 'FullPlan';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Progress bar */}
      <View className="flex-row gap-2 px-4 pt-3 pb-2">
        {[1, 2, 3, 4].map((s) => (
          <View key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 16, paddingTop: 8 }}>
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('title')}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t('subtitle')}</Text>

        {/* Step 1: Goal */}
        {step === 1 && (
          <Card>
            <SectionTitle>{t('primaryGoal')}</SectionTitle>
            {TRAINING_GOALS.map((g) => {
              const keys = GOAL_I18N_KEYS[g];
              return (
                <SelectCard key={g} selected={form.goal === g} onPress={() => setForm((f) => ({ ...f, goal: g }))}>
                  <Text className="text-2xl">{GOAL_ICONS[g]}</Text>
                  <Text className="mt-1 font-semibold text-slate-900 dark:text-white">{keys ? t(keys.label) : g}</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">{keys ? t(keys.desc) : ''}</Text>
                </SelectCard>
              );
            })}
          </Card>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <Card>
            <SectionTitle>{t('howReceivePlan')}</SectionTitle>
            <SelectCard selected={form.planMode === 'DailyRecommendations'} onPress={() => setForm((f) => ({ ...f, planMode: 'DailyRecommendations' }))}>
              <Text className="font-semibold text-slate-900 dark:text-white">{t('dailyRecommendations')}</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{t('dailyRecommendationsDesc')}</Text>
            </SelectCard>
            <SelectCard selected={isFullPlan} onPress={() => setForm((f) => ({ ...f, planMode: 'FullPlan' }))}>
              <Text className="font-semibold text-slate-900 dark:text-white">{t('fullPlan')}</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{t('fullPlanDesc', { weeks: form.planDurationWeeks })}</Text>
            </SelectCard>

            {isFullPlan && (
              <>
                <SubTitle>{t('periodizationModel')}</SubTitle>
                <HintText>{t('periodizationModelDesc')}</HintText>
                {PERIODIZATION_MODELS.map((m) => (
                  <SelectCard key={m} selected={form.periodizationModel === m} onPress={() => setForm((f) => ({ ...f, periodizationModel: m }))}>
                    <Text className="font-semibold text-slate-900 dark:text-white">{t(`periodization_${m}`)}</Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400">{t(`periodization_${m}_desc`)}</Text>
                  </SelectCard>
                ))}

                <SubTitle>{t('mesocycle')}</SubTitle>
                <HintText>{t('mesocycleDesc')}</HintText>
                <View className="flex-row gap-2">
                  {[3, 4, 5, 6].map((w) => (
                    <PillButton key={w} selected={form.mesocycleWeeks === w} onPress={() => setForm((f) => ({ ...f, mesocycleWeeks: w }))} flex>
                      {t('mesocycleOption', { build: w - 1, total: w })}
                    </PillButton>
                  ))}
                </View>

                <SubTitle>{t('longRide')}</SubTitle>
                <HintText>{t('longRideDesc')}</HintText>
                <View className="flex-row flex-wrap gap-2">
                  <PillButton selected={form.longRideDay === null} onPress={() => setForm((f) => ({ ...f, longRideDay: null }))}>
                    {t('longRideNone')}
                  </PillButton>
                  {WEEKDAYS.map((d) => (
                    <PillButton key={d} selected={form.longRideDay === d} onPress={() => setForm((f) => ({ ...f, longRideDay: d }))}>
                      {t(`weekday_${d}`)}
                    </PillButton>
                  ))}
                </View>
                {form.longRideDay !== null && (
                  <View className="mt-4">
                    <Stepper
                      label={t('maxLongRide', { hours: (form.maxLongRideMinutes / 60).toFixed(1) })}
                      value={form.maxLongRideMinutes} min={60} max={360} step={30}
                      onChange={(v) => setForm((f) => ({ ...f, maxLongRideMinutes: v }))}
                    />
                  </View>
                )}

                <SubTitle>{t('restDays')}</SubTitle>
                <HintText>{t('restDaysDesc')}</HintText>
                <View className="flex-row flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <PillButton
                      key={d}
                      selected={form.restDays.includes(d)}
                      onPress={() => setForm((f) => ({
                        ...f,
                        restDays: f.restDays.includes(d) ? f.restDays.filter((x) => x !== d) : [...f.restDays, d],
                      }))}
                    >
                      {t(`weekday_${d}`)}
                    </PillButton>
                  ))}
                </View>
              </>
            )}

            <SubTitle>{t('weekStartDay')}</SubTitle>
            <HintText>{t('weekStartDayDesc')}</HintText>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <PillButton key={d} selected={form.weekStartDay === d} onPress={() => setForm((f) => ({ ...f, weekStartDay: d }))}>
                  {t(`weekday_${d}`)}
                </PillButton>
              ))}
            </View>

            <SubTitle>{t('weeklySchedule')}</SubTitle>
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('trainingDaysPerWeek')}</Text>
            <View className="flex-row gap-2">
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <PillButton key={d} selected={form.daysPerWeek === d} onPress={() => setForm((f) => ({ ...f, daysPerWeek: d }))} flex>
                  {String(d)}
                </PillButton>
              ))}
            </View>
            <View className="mt-4">
              <Stepper
                label={t('weeklyHoursAvailable')}
                value={form.weeklyHoursAvailable} min={2} max={20} step={0.5}
                onChange={(v) => setForm((f) => ({ ...f, weeklyHoursAvailable: v }))}
                unit={t('hoursShort')}
              />
            </View>
            <View className="mt-4">
              <Stepper
                label={t('preferredDuration')}
                value={form.preferredWorkoutMinutes} min={20} max={180} step={5}
                onChange={(v) => setForm((f) => ({ ...f, preferredWorkoutMinutes: v }))}
                unit="min"
              />
            </View>
          </Card>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <Card>
            <SectionTitle>{t('experienceLevel')}</SectionTitle>
            {FITNESS_LEVELS.map((l) => {
              const keys = LEVEL_I18N_KEYS[l];
              return (
                <SelectCard key={l} selected={form.level === l} onPress={() => setForm((f) => ({ ...f, level: l }))}>
                  <Text className="font-semibold text-slate-900 dark:text-white">{keys ? t(keys.label) : l}</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">{keys ? t(keys.desc) : ''}</Text>
                </SelectCard>
              );
            })}
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-4 mb-2">{t('targetEventDate')}</Text>
            <TextInput
              value={form.targetEventDate ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, targetEventDate: v || null }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </Card>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <Card>
            <SectionTitle>{t('additionalPreferences')}</SectionTitle>
            <Stepper
              label={t('planDuration')}
              value={form.planDurationWeeks} min={4} max={52} step={1}
              onChange={(v) => setForm((f) => ({ ...f, planDurationWeeks: v }))}
              unit={t('weeks')}
            />

            <View className="flex-row items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mt-5">
              <Switch
                value={form.considerNonCycling}
                onValueChange={(v) => setForm((f) => ({ ...f, considerNonCycling: v }))}
                trackColor={{ true: '#3b82f6' }}
              />
              <View className="flex-1">
                <Text className="font-medium text-slate-900 dark:text-white">{t('suggestNonCycling')}</Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400">{t('suggestNonCyclingDesc')}</Text>
              </View>
            </View>

            {/* Summary */}
            <View className="rounded-xl bg-slate-100 dark:bg-slate-800 p-4 mt-5">
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{t('planSummary')}</Text>
              <SummaryRow label={t('goal')} value={GOAL_I18N_KEYS[form.goal] ? t(GOAL_I18N_KEYS[form.goal].label) : form.goal} />
              <SummaryRow label={t('schedule')} value={`${form.daysPerWeek} ${t('daysPerWeek')}, ${form.weeklyHoursAvailable}${t('hoursShort')}`} />
              <SummaryRow label={t('level')} value={LEVEL_I18N_KEYS[form.level] ? t(LEVEL_I18N_KEYS[form.level].label) : form.level} />
              <SummaryRow label={t('duration')} value={`${form.planDurationWeeks} ${t('weeks')}`} />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Navigation footer */}
      <View className="flex-row justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-3"
          style={{ opacity: step === 1 ? 0.5 : 1 }}
        >
          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('back')}</Text>
        </TouchableOpacity>
        {step < 4 ? (
          <TouchableOpacity onPress={() => setStep((s) => s + 1)} className="flex-1 rounded-xl bg-blue-500 px-6 py-3 items-center">
            <Text className="text-sm font-medium text-white">{t('next')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSave} disabled={saving} className="flex-1 rounded-xl bg-blue-500 px-6 py-3 items-center" style={{ opacity: saving ? 0.6 : 1 }}>
            <Text className="text-sm font-medium text-white">{saving ? t('saving') : t('saveAndStart')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Building blocks ─────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">{children}</View>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{children}</Text>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-base font-semibold text-slate-900 dark:text-white mt-5 mb-1">{children}</Text>;
}

function HintText({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">{children}</Text>;
}

function SelectCard({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`rounded-xl border-2 p-4 mb-2.5 ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
    >
      {children}
    </TouchableOpacity>
  );
}

function PillButton({ selected, onPress, children, flex }: { selected: boolean; onPress: () => void; children: React.ReactNode; flex?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${flex ? 'flex-1' : ''} rounded-lg px-3 py-2.5 items-center ${selected ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{children}</Text>
    </TouchableOpacity>
  );
}

function Stepper({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string;
}) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  return (
    <View>
      <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{label}</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={dec} disabled={value <= min} className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-700 items-center justify-center" style={{ opacity: value <= min ? 0.4 : 1 }}>
          <Text className="text-xl font-bold text-slate-600 dark:text-slate-200">−</Text>
        </TouchableOpacity>
        <View className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/40 py-2.5 items-center">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{value}{unit ? ` ${unit}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={inc} disabled={value >= max} className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-700 items-center justify-center" style={{ opacity: value >= max ? 0.4 : 1 }}>
          <Text className="text-xl font-bold text-slate-600 dark:text-slate-200">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-sm text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}
