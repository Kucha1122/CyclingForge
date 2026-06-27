import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Dimensions, Alert,
  LayoutChangeEvent, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { WORKOUT_CATEGORIES, TRAINING_ZONES } from '@cyclingforge/shared';
import type { CreateWorkoutStepDto, WorkoutStepDto } from '@cyclingforge/shared';
import { workoutsApi } from '../services/api';
import { IntervalChart } from '../components/workoutViz';
import { CATEGORY_I18N } from '../components/workoutCard';
import type { WorkoutCreatorScreenProps } from '../navigation/types';

const STEP_TYPES = ['Warmup', 'SteadyState', 'Ramp', 'Intervals', 'FreeRide', 'Cooldown'] as const;
const STEP_TYPE_I18N: Record<string, string> = {
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

interface EditableStep extends CreateWorkoutStepDto { tempId: string; }

let tempCounter = 0;
const nextTempId = () => `tmp-${Date.now()}-${tempCounter++}`;

const baseStep = (order: number): EditableStep => ({
  tempId: nextTempId(), order, type: 'SteadyState', durationSeconds: 300,
  powerLow: 0.7, powerHigh: 0.7, cadence: null, repeat: null,
  onDurationSeconds: null, offDurationSeconds: null, onPower: null, offPower: null,
  onCadence: null, offCadence: null,
});

// Quick preset blocks (mirrors the web PresetBlockBar).
const PRESETS: { id: string; labelKey: string; make: (order: number) => EditableStep }[] = [
  { id: 'warmup', labelKey: 'presets.warmupShort', make: (o) => ({ ...baseStep(o), type: 'Warmup', durationSeconds: 600, powerLow: 0.4, powerHigh: 0.7 }) },
  { id: 'zone1', labelKey: 'presets.zone1Short', make: (o) => ({ ...baseStep(o), durationSeconds: 900, powerLow: 0.45, powerHigh: 0.55 }) },
  { id: 'zone2', labelKey: 'presets.zone2Short', make: (o) => ({ ...baseStep(o), durationSeconds: 1200, powerLow: 0.65, powerHigh: 0.75 }) },
  { id: 'zone3', labelKey: 'presets.zone3Short', make: (o) => ({ ...baseStep(o), durationSeconds: 900, powerLow: 0.76, powerHigh: 0.9 }) },
  { id: 'zone4', labelKey: 'presets.zone4Short', make: (o) => ({ ...baseStep(o), durationSeconds: 600, powerLow: 0.91, powerHigh: 1.0 }) },
  { id: 'zone5', labelKey: 'presets.zone5Short', make: (o) => ({ ...baseStep(o), durationSeconds: 480, powerLow: 1.06, powerHigh: 1.15 }) },
  { id: 'zone6', labelKey: 'presets.zone6Short', make: (o) => ({ ...baseStep(o), durationSeconds: 180, powerLow: 1.21, powerHigh: 1.35 }) },
  { id: 'cooldown', labelKey: 'presets.cooldownShort', make: (o) => ({ ...baseStep(o), type: 'Cooldown', durationSeconds: 300, powerLow: 0.6, powerHigh: 0.4 }) },
  { id: 'interval', labelKey: 'presets.intervalShort', make: (o) => ({ ...baseStep(o), type: 'Intervals', durationSeconds: 480, powerLow: 0.5, powerHigh: 1.0, repeat: 4, onDurationSeconds: 60, offDurationSeconds: 60, onPower: 1.0, offPower: 0.5 }) },
];

export function WorkoutCreatorScreen({ navigation, route }: WorkoutCreatorScreenProps) {
  const editId = route.params?.id;
  const isEditing = !!editId;
  const { t } = useTranslation('workouts');
  const tCommon = useTranslation('common').t;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Endurance');
  const [targetZone, setTargetZone] = useState('Z2');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [steps, setSteps] = useState<EditableStep[]>([
    { ...baseStep(1), type: 'Warmup', durationSeconds: 600, powerLow: 0.4, powerHigh: 0.7 },
    { ...baseStep(2), durationSeconds: 1200, powerLow: 0.7, powerHigh: 0.7 },
    { ...baseStep(3), type: 'Cooldown', durationSeconds: 300, powerLow: 0.6, powerHigh: 0.4 },
  ]);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [zwoText, setZwoText] = useState('');
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 64);
  const onChartLayout = (e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? t('creatorSave') : t('createWorkout') });
  }, [navigation, isEditing, t]);

  useEffect(() => {
    if (!editId) return;
    workoutsApi.getById(editId).then(({ data }) => {
      setName(data.name); setDescription(data.description); setCategory(data.category);
      setTargetZone(data.targetZone); setIsPublic(data.isPublic); setTags(data.tags || '');
      setSteps(data.steps.map((s) => ({ ...s, tempId: nextTempId() })));
    }).catch(() => {});
  }, [editId]);

  const reorder = (arr: EditableStep[]) => arr.map((s, i) => ({ ...s, order: i + 1 }));
  const addStep = () => setSteps((p) => reorder([...p, baseStep(p.length + 1)]));
  const addPreset = (mk: (o: number) => EditableStep) => setSteps((p) => reorder([...p, { ...mk(p.length + 1), tempId: nextTempId() }]));
  const removeStep = (id: string) => setSteps((p) => reorder(p.filter((s) => s.tempId !== id)));
  const updateStep = (id: string, u: Partial<EditableStep>) => setSteps((p) => p.map((s) => (s.tempId === id ? { ...s, ...u } : s)));
  const moveStep = (id: string, dir: -1 | 1) => setSteps((p) => {
    const i = p.findIndex((s) => s.tempId === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= p.length) return p;
    const c = [...p];
    [c[i], c[j]] = [c[j], c[i]];
    return reorder(c);
  });

  const stepsForChart: WorkoutStepDto[] = steps.map((s, i) => ({
    id: s.tempId, order: i + 1, type: s.type,
    durationSeconds: s.type === 'Intervals' && s.repeat && s.onDurationSeconds && s.offDurationSeconds
      ? s.repeat * (s.onDurationSeconds + s.offDurationSeconds) : s.durationSeconds,
    powerLow: s.powerLow, powerHigh: s.powerHigh, cadence: s.cadence ?? null, repeat: s.repeat ?? null,
    onDurationSeconds: s.onDurationSeconds ?? null, offDurationSeconds: s.offDurationSeconds ?? null,
    onPower: s.onPower ?? null, offPower: s.offPower ?? null, onCadence: s.onCadence ?? null, offCadence: s.offCadence ?? null,
  }));
  const totalMinutes = Math.ceil(stepsForChart.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('creatorWorkoutNamePlaceholder')); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), description, category, targetZone, isPublic, tags: tags || null,
        steps: steps.map(({ tempId, ...rest }) => rest),
      };
      if (isEditing) await workoutsApi.update(editId!, payload);
      else await workoutsApi.create(payload);
      navigation.goBack();
    } catch { Alert.alert(t('importErrorUnknown')); } finally { setSaving(false); }
  };

  const handleImportZwo = async () => {
    if (!zwoText.trim()) return;
    try {
      const { data } = await workoutsApi.parseZwo(zwoText);
      setName(data.name); setDescription(data.description ?? ''); setCategory(data.category);
      setTargetZone(data.targetZone); setIsPublic(data.isPublic); setTags(data.tags ?? '');
      setSteps(data.steps.map((s, i) => ({ ...s, tempId: nextTempId(), order: i + 1 })));
      setZwoText(''); setShowImport(false);
    } catch { Alert.alert(t('importErrorUnknown')); }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-slate-50 dark:bg-slate-900" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <TextInput
          value={name} onChangeText={setName}
          placeholder={t('creatorWorkoutNamePlaceholder')} placeholderTextColor="#94a3b8"
          className="rounded-xl bg-white dark:bg-slate-800 px-4 py-3 text-lg font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
        />

        {/* Category */}
        <Text className="text-xs font-medium text-slate-400 mt-4 mb-2 uppercase">{t('allCategories')}</Text>
        <ChipRow items={WORKOUT_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_I18N[c] ?? 'categoryMixed') }))} value={category} onChange={setCategory} />

        {/* Zone */}
        <Text className="text-xs font-medium text-slate-400 mt-4 mb-2 uppercase">{t('allZones')}</Text>
        <ChipRow items={TRAINING_ZONES.map((z) => ({ value: z, label: z }))} value={targetZone} onChange={setTargetZone} />

        {/* Chart preview */}
        <View className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('creatorZonePreview')}</Text>
            <Text className="text-xs text-slate-400">{totalMinutes} {tCommon('min')}</Text>
          </View>
          <View onLayout={onChartLayout}>
            <IntervalChart steps={stepsForChart} width={chartWidth} height={180} />
          </View>
        </View>

        {/* Quick blocks */}
        <Text className="text-xs font-medium text-slate-400 mt-5 mb-2 uppercase">{t('quickBlocks')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => addPreset(p.make)} className="flex-row items-center gap-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
              <Ionicons name="add" size={14} color="#3b82f6" />
              <Text className="text-sm text-slate-700 dark:text-slate-200">{t(p.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Steps */}
        <View className="flex-row items-center justify-between mt-5 mb-2">
          <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('creatorWorkoutSteps')}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => setShowImport((v) => !v)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5">
              <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('creatorImportZwo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addStep} className="rounded-lg bg-blue-500 px-3 py-1.5">
              <Text className="text-xs font-medium text-white">+ {t('creatorAddStep')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showImport && (
          <View className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 mb-3">
            <TextInput
              value={zwoText} onChangeText={setZwoText} multiline
              placeholder={t('creatorImportPaste')} placeholderTextColor="#94a3b8"
              className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <TouchableOpacity onPress={handleImportZwo} className="self-start rounded-lg bg-blue-500 px-4 py-2 mt-2">
              <Text className="text-sm font-medium text-white">{t('creatorImportButton')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {steps.map((step, idx) => (
          <StepCard
            key={step.tempId} step={step} index={idx} isFirst={idx === 0} isLast={idx === steps.length - 1}
            onUpdate={updateStep} onRemove={removeStep} onMove={moveStep}
          />
        ))}

        {/* Description & settings */}
        <View className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
          <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{t('creatorDescriptionSettings')}</Text>
          <Text className="text-xs font-medium text-slate-400 mb-1">{t('creatorDescription')}</Text>
          <TextInput
            value={description} onChangeText={setDescription} multiline
            placeholder={t('creatorDescriptionPlaceholder')} placeholderTextColor="#94a3b8"
            className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2 text-sm text-slate-900 dark:text-white mb-3"
            style={{ minHeight: 48, textAlignVertical: 'top' }}
          />
          <Text className="text-xs font-medium text-slate-400 mb-1">{t('creatorTags')}</Text>
          <TextInput
            value={tags} onChangeText={setTags}
            placeholder={t('creatorTagsPlaceholder')} placeholderTextColor="#94a3b8"
            className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2 text-sm text-slate-900 dark:text-white mb-3"
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('creatorPublicWorkout')}</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#3b82f6' }} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="flex-row gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-3 items-center">
          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('creatorCancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving || !name.trim()} className="flex-1 rounded-xl bg-blue-500 py-3 items-center" style={{ opacity: saving || !name.trim() ? 0.5 : 1 }}>
          <Text className="text-sm font-medium text-white">{saving ? t('creatorSaving') : isEditing ? t('creatorSave') : t('creatorCreate')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Chip row selector ───────────────────────────────────────────
function ChipRow({ items, value, onChange }: { items: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {items.map((it) => {
        const active = value === it.value;
        return (
          <TouchableOpacity
            key={it.value} onPress={() => onChange(it.value)}
            className={`rounded-full px-3.5 py-1.5 border ${active ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
          >
            <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Numeric field ───────────────────────────────────────────────
function NumField({ label, value, onChange, width = 'flex-1' }: { label: string; value: number; onChange: (n: number) => void; width?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(value === 0 ? '' : String(value)); }, [value]);
  return (
    <View className={width}>
      <Text className="text-[11px] text-slate-400 mb-1" numberOfLines={1}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(v) => { setText(v); const n = parseFloat(v.replace(',', '.')); if (!isNaN(n)) onChange(n); }}
        onBlur={() => { if (text === '' || isNaN(parseFloat(text))) { setText('0'); onChange(0); } }}
        keyboardType="numeric"
        className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2 text-sm text-slate-900 dark:text-white"
      />
    </View>
  );
}

// ── Step editor card ────────────────────────────────────────────
function StepCard({ step, index, isFirst, isLast, onUpdate, onRemove, onMove }: {
  step: EditableStep; index: number; isFirst: boolean; isLast: boolean;
  onUpdate: (id: string, u: Partial<EditableStep>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const { t } = useTranslation('workouts');
  const isIntervals = step.type === 'Intervals';

  return (
    <View className="rounded-2xl bg-white dark:bg-slate-800 p-3 mb-2.5 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-slate-400">{t('stepNumber', { num: index + 1 })}</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={() => onMove(step.tempId, -1)} disabled={isFirst} hitSlop={6} className="p-1" style={{ opacity: isFirst ? 0.3 : 1 }}>
            <Ionicons name="chevron-up" size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onMove(step.tempId, 1)} disabled={isLast} hitSlop={6} className="p-1" style={{ opacity: isLast ? 0.3 : 1 }}>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(step.tempId)} hitSlop={6} className="p-1">
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 6 }} className="mb-2">
        {STEP_TYPES.map((ty) => {
          const active = step.type === ty;
          return (
            <TouchableOpacity
              key={ty}
              onPress={() => onUpdate(step.tempId, ty === 'Intervals'
                ? { type: ty, repeat: step.repeat ?? 4, onDurationSeconds: step.onDurationSeconds ?? 60, offDurationSeconds: step.offDurationSeconds ?? 60, onPower: step.onPower ?? 1.0, offPower: step.offPower ?? 0.5 }
                : { type: ty })}
              className={`rounded-full px-2.5 py-1 border ${active ? 'bg-blue-500 border-blue-500' : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'}`}
            >
              <Text className={`text-xs ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{t(STEP_TYPE_I18N[ty] ?? ty)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isIntervals ? (
        <>
          <View className="flex-row gap-2 mb-2">
            <NumField label={t('stepLabelRepeat')} value={step.repeat ?? 0} onChange={(n) => onUpdate(step.tempId, { repeat: Math.max(1, Math.round(n)) })} />
            <NumField label={t('stepLabelOnMin')} value={(step.onDurationSeconds ?? 0) / 60} onChange={(n) => onUpdate(step.tempId, { onDurationSeconds: Math.round(n * 60) })} />
            <NumField label={t('stepLabelOffMin')} value={(step.offDurationSeconds ?? 0) / 60} onChange={(n) => onUpdate(step.tempId, { offDurationSeconds: Math.round(n * 60) })} />
          </View>
          <View className="flex-row gap-2">
            <NumField label={t('stepLabelOnPower')} value={Math.round((step.onPower ?? 0) * 100)} onChange={(n) => onUpdate(step.tempId, { onPower: n / 100 })} />
            <NumField label={t('stepLabelOffPower')} value={Math.round((step.offPower ?? 0) * 100)} onChange={(n) => onUpdate(step.tempId, { offPower: n / 100 })} />
          </View>
        </>
      ) : (
        <View className="flex-row gap-2">
          <NumField label={t('stepLabelDuration')} value={step.durationSeconds / 60} onChange={(n) => onUpdate(step.tempId, { durationSeconds: Math.round(n * 60) })} />
          <NumField label={t('stepLabelPowerLow')} value={Math.round(step.powerLow * 100)} onChange={(n) => onUpdate(step.tempId, { powerLow: n / 100 })} />
          <NumField label={t('stepLabelPowerHigh')} value={Math.round(step.powerHigh * 100)} onChange={(n) => onUpdate(step.tempId, { powerHigh: n / 100 })} />
        </View>
      )}
    </View>
  );
}
