import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Dimensions, Modal, TextInput, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { DailyRecommendationDto, ReadinessBreakdownDto } from '@cyclingforge/shared';
import { recommendationsApi, usersApi, activitiesApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDate, formatDuration } from '../utils/format';
import { ReadinessGauge, IntervalChart } from '../components/workoutViz';

const CATEGORY_I18N: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};
const STATUS_I18N: Record<string, string> = {
  Pending: 'statusPending', Accepted: 'statusAccepted', Skipped: 'statusSkipped', Completed: 'statusCompleted',
};
const WORKOUT_NAME_KEYS: Record<string, string> = {
  'Progressive endurance with ramp finish': 'nameProgressiveEnduranceRamp',
};
const CATEGORY_HEX: Record<string, string> = {
  Recovery: '#10b981', Endurance: '#3b82f6', Tempo: '#f59e0b', SweetSpot: '#f97316',
  Threshold: '#ef4444', VO2Max: '#a855f7', Anaerobic: '#ec4899', Sprint: '#6366f1', Mixed: '#64748b',
};

/** Parse backend reason string into translated text (ported from the web page). */
function translateReason(reason: string, t: (k: string, o?: object) => string, tWorkouts: (k: string) => string): string {
  const cat = (raw: string) => tWorkouts(CATEGORY_I18N[raw] ?? 'categoryMixed');
  const parts: string[] = [];
  let m: RegExpMatchArray | null;
  if (reason.includes('Rest day recommended') || reason.includes('Rest day - readiness is very low') || reason.includes('Rest day - part of your recovery')) {
    parts.push(t('reasonRestDay'));
  } else if (reason.includes('Consider a light walk')) {
    parts.push(t('reasonLightWalk'));
  } else if ((m = reason.match(/Adjusted today's plan down to a (\w+) workout because of low readiness\./))) {
    parts.push(t('reasonAdjustedDown', { category: cat(m[1]) }));
  } else if ((m = reason.match(/(\w+) workout - recovery \(deload\) week/))) {
    parts.push(t('reasonDeload', { category: cat(m[1]) }));
  } else if ((m = reason.match(/(\w+) workout - tapering before your target event\./))) {
    parts.push(t('reasonTaper', { category: cat(m[1]) }));
  } else if ((m = reason.match(/(\w+) workout from your (\w+) plan\./))) {
    parts.push(t('reasonPlanWorkout', { category: cat(m[1]), model: m[2] }));
  } else {
    const wm = reason.match(/Recommended a (\w+) workout based on your current readiness\./);
    if (wm) parts.push(t('reasonRecommendedWorkout', { category: cat(wm[1]) }));
    else parts.push(reason.split('.')[0] || reason);
  }
  const score = reason.match(/Readiness score: (\d+)\/100\.?/);
  if (score) parts.push(t('reasonReadinessScore', { score: score[1] }));
  const form = reason.match(/Form \(TSB\): (-?\d+(?:\.\d+)?)/);
  if (form) parts.push(t('reasonFormTsb', { value: form[1] }));
  const bb = reason.match(/Body Battery: ([\d]+)\/100\.?/);
  if (bb) parts.push(t('reasonBodyBattery', { value: bb[1] }));
  const sleep = reason.match(/Sleep Score: ([\d]+)\/100\.?/);
  if (sleep) parts.push(t('reasonSleepScore', { value: sleep[1] }));
  const tr = reason.match(/Training Readiness: ([\d]+)\/100\.?/);
  if (tr) parts.push(t('reasonTrainingReadiness', { value: tr[1] }));
  return parts.join(' ');
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm ${className}`}>{children}</View>;
}

function CategoryBadge({ category, label }: { category: string; label: string }) {
  const color = CATEGORY_HEX[category] ?? '#64748b';
  return (
    <View style={{ backgroundColor: color + '22' }} className="rounded-full px-2.5 py-1">
      <Text style={{ color }} className="text-xs font-medium">{label}</Text>
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1">
      <Text className="text-xs text-slate-600 dark:text-slate-300">{children}</Text>
    </View>
  );
}

/** A readiness component cell with value + score bar. `wide` spans the full row. */
function MetricCard({ label, value, score, wide }: { label: string; value: string; score: number | null; wide?: boolean }) {
  return (
    <View className={`${wide ? 'w-full' : 'w-1/2'} px-1 mb-2`}>
      <View className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2.5">
        {wide ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-400">{label}</Text>
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">{value}</Text>
          </View>
        ) : (
          <>
            <Text className="text-[11px] text-slate-400" numberOfLines={1}>{label}</Text>
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">{value}</Text>
          </>
        )}
        {score != null && (
          <View className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mt-1.5">
            <View className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
          </View>
        )}
      </View>
    </View>
  );
}

function ReadinessBar({ label, score }: { label: string; score: number | null }) {
  if (score == null) return null;
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-slate-600 dark:text-slate-400">{label}</Text>
        <Text className="text-sm font-medium text-slate-900 dark:text-white">{score}</Text>
      </View>
      <View className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
        <View className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </View>
    </View>
  );
}

const LEGS = ['Fresh', 'Normal', 'Heavy'] as const;
const QUALITY = ['Great', 'Ok', 'Poor'] as const;

/** Post-workout RPE / feel feedback as a bottom-anchored modal. */
function FeedbackModal({ visible, recommendationId, onClose, onSubmitted }: {
  visible: boolean; recommendationId: string;
  onClose: () => void; onSubmitted: (fb: { rpe: number; legsFeel: string; sessionQuality: string; note: string }) => void;
}) {
  const { t } = useTranslation('todayWorkout');
  const [rpe, setRpe] = useState(5);
  const [legsFeel, setLegsFeel] = useState<string>('Normal');
  const [quality, setQuality] = useState<string>('Ok');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await recommendationsApi.submitFeedback(recommendationId, { rpe, legsFeel, sessionQuality: quality, note });
      onSubmitted({ rpe, legsFeel, sessionQuality: quality, note });
    } catch { /* keep open to retry */ } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-5 pb-8">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{t('feedbackTitle')}</Text>
          <Text className="text-sm text-slate-400 mb-4">{t('feedbackSubtitle')}</Text>

          {/* RPE 1–10 */}
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('feedbackRpe')}</Text>
            <Text className="text-sm font-bold text-blue-500">{rpe}/10</Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5 mb-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity key={n} onPress={() => setRpe(n)} className={`w-8 h-8 rounded-lg items-center justify-center ${rpe === n ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-sm font-semibold ${rpe === n ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs text-slate-400 mb-4">{t(`feedbackRpe${rpe}`, { defaultValue: '' })}</Text>

          {/* Legs */}
          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('feedbackLegs')}</Text>
          <View className="flex-row gap-2 mb-4">
            {LEGS.map((opt) => (
              <TouchableOpacity key={opt} onPress={() => setLegsFeel(opt)} className={`flex-1 rounded-lg py-2.5 items-center ${legsFeel === opt ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-sm ${legsFeel === opt ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{t(`feedbackLegs${opt}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quality */}
          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('feedbackQuality')}</Text>
          <View className="flex-row gap-2 mb-4">
            {QUALITY.map((opt) => (
              <TouchableOpacity key={opt} onPress={() => setQuality(opt)} className={`flex-1 rounded-lg py-2.5 items-center ${quality === opt ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-sm ${quality === opt ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{t(`feedbackQuality${opt}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('feedbackNotePlaceholder')}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
            className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 text-sm text-slate-900 dark:text-white mb-5"
            style={{ minHeight: 56, textAlignVertical: 'top' }}
          />

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onClose} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 py-3 items-center">
              <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('feedbackSkip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={saving} className="flex-1 rounded-lg bg-blue-500 py-3 items-center" style={{ opacity: saving ? 0.6 : 1 }}>
              <Text className="text-sm font-medium text-white">{saving ? t('feedbackSaving') : t('feedbackSubmit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WorkoutTitle(name: string, tWorkouts: (k: string) => string): string {
  return WORKOUT_NAME_KEYS[name] ? tWorkouts(WORKOUT_NAME_KEYS[name]) : name;
}

export function TodayWorkoutScreen() {
  const { t } = useTranslation('todayWorkout');
  const tCommon = useTranslation('common').t;
  const tWorkouts = useTranslation('workouts').t;
  const userId = useAuthStore((s) => s.userId);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 64);
  const onChartLayout = useCallback((e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width), []);

  const [reco, setReco] = useState<DailyRecommendationDto | null>(null);
  const [readiness, setReadiness] = useState<ReadinessBreakdownDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noPreference, setNoPreference] = useState(false);
  const [rpeEnabled, setRpeEnabled] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [actualTss, setActualTss] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [recoR, readyR] = await Promise.allSettled([recommendationsApi.getToday(), recommendationsApi.getReadiness()]);
    if (recoR.status === 'fulfilled') {
      const data = recoR.value.data as DailyRecommendationDto & { message?: string };
      if (data && 'message' in data && data.message) { setNoPreference(true); setReco(null); }
      else { setNoPreference(false); setReco(data); }
    }
    if (readyR.status === 'fulfilled') setReadiness(readyR.value.data);
  }, []);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);

  useEffect(() => {
    if (!userId) return;
    usersApi.getProfile(userId).then((r) => setRpeEnabled(r.data.enableRpeFeedback ?? true)).catch(() => {});
  }, [userId]);

  // Pull actual TSS for planned-vs-actual once a session is linked to an activity.
  useEffect(() => {
    const id = reco?.completedActivityId;
    if (!id) { setActualTss(null); return; }
    activitiesApi.getActivityDetails(id).then((r) => setActualTss(r.data.trainingStressScore ?? null)).catch(() => setActualTss(null));
  }, [reco?.completedActivityId]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  const updateStatus = async (status: string) => {
    if (!reco) return;
    try {
      await recommendationsApi.updateStatus(reco.id, status);
      setReco((p) => (p ? { ...p, status } : null));
      if (status === 'Completed' && rpeEnabled && reco.rpe == null) setFeedbackOpen(true);
    } catch { /* ignore */ }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try { const { data } = await recommendationsApi.regenerateToday(); setReco(data); setNoPreference(false); }
    catch { /* ignore */ } finally { setRegenerating(false); }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (noPreference) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center px-8">
        <Text className="text-5xl mb-4">🎯</Text>
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">{t('setUpTitle')}</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">{t('setUpDesc')}</Text>
      </View>
    );
  }

  const workout = reco?.recommendedWorkout;
  const alt = reco?.alternativeWorkout;
  const overall = readiness?.overallScore ?? reco?.readinessScore ?? 50;
  const status = reco?.status;
  const statusColor = status === 'Accepted' ? '#22c55e' : status === 'Completed' ? '#3b82f6' : '#64748b';

  const metrics: { label: string; value: string; score: number | null; wide?: boolean }[] = [];
  if (readiness?.tsbValue != null) metrics.push({ label: t('formTsb'), value: readiness.tsbValue.toFixed(1), score: readiness.tsbScore, wide: true });
  if (readiness?.bodyBatteryValue != null) metrics.push({ label: t('bodyBattery'), value: `${readiness.bodyBatteryValue}/100`, score: readiness.bodyBatteryScore });
  if (readiness?.sleepScoreValue != null) metrics.push({ label: t('sleepScore'), value: `${readiness.sleepScoreValue}/100`, score: readiness.sleepScore });
  if (readiness?.trainingReadinessValue != null) metrics.push({ label: t('trainingReadiness'), value: `${readiness.trainingReadinessValue}/100`, score: readiness.trainingReadinessScore });
  if (readiness?.stressValue != null) metrics.push({ label: t('stressLevel'), value: `${readiness.stressValue}/100`, score: readiness.stressScore });
  if (readiness?.hrvLastNightMs != null) metrics.push({ label: t('hrv'), value: readiness.hrvBaselineMs != null ? `${readiness.hrvLastNightMs}/${readiness.hrvBaselineMs} ms` : `${readiness.hrvLastNightMs} ms`, score: readiness.hrvScore });

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3 capitalize">
          {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* Readiness */}
        <Card>
          <View className="items-center mb-3">
            <ReadinessGauge score={overall} size={150} />
            <Text className="text-xs text-slate-400 mt-1">{t('readinessCompositeLabel')}</Text>
          </View>
          <Text className="text-base font-semibold text-slate-900 dark:text-white">{t('readinessBreakdown')}</Text>
          <Text className="text-xs text-slate-400 mb-3">{t('readinessCompositeHint')}</Text>
          {metrics.length > 0 ? (
            <View className="flex-row flex-wrap -mx-1">
              {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
            </View>
          ) : (
            <>
              <ReadinessBar label={t('formTsb')} score={readiness?.tsbScore ?? null} />
              <ReadinessBar label={t('bodyBattery')} score={readiness?.bodyBatteryScore ?? null} />
              <ReadinessBar label={t('sleepScore')} score={readiness?.sleepScore ?? null} />
              <ReadinessBar label={t('hrv')} score={readiness?.hrvScore ?? null} />
            </>
          )}
        </Card>

        {/* Reason */}
        {reco?.reason ? (
          <View className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 mb-4">
            <Text className="text-sm text-blue-900 dark:text-blue-200">{translateReason(reco.reason, t as (k: string, o?: object) => string, tWorkouts)}</Text>
          </View>
        ) : null}

        {/* Rest / Active recovery */}
        {reco?.recommendationType === 'RestDay' && (
          <Card className="items-center">
            <Text className="text-4xl">😴</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-3">{t('restDay')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">{t('restDayDesc')}</Text>
          </Card>
        )}
        {reco?.recommendationType === 'AlternativeActivity' && (
          <Card className="items-center">
            <Text className="text-4xl">🚶</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-3">{t('activeRecovery')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">{t('activeRecoveryDesc')}</Text>
          </Card>
        )}

        {/* Recommended workout */}
        {workout && (
          <Card>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">{WorkoutTitle(workout.name, tWorkouts)}</Text>
            <View className="flex-row flex-wrap gap-2 mt-2">
              <CategoryBadge category={workout.category} label={tWorkouts(CATEGORY_I18N[workout.category] ?? 'categoryMixed')} />
              <Chip>{workout.durationMinutes} {tCommon('min')}</Chip>
              <Chip>{tCommon('tssLabel')} {workout.estimatedTSS}</Chip>
            </View>

            {/* Status actions */}
            <View className="flex-row items-center flex-wrap gap-2 mt-3">
              {status === 'Pending' ? (
                <>
                  <TouchableOpacity onPress={() => updateStatus('Accepted')} className="rounded-lg bg-blue-500 px-4 py-2">
                    <Text className="text-sm font-medium text-white">{tCommon('accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => updateStatus('Skipped')} className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2">
                    <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{tCommon('skip')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {status === 'Accepted' && (
                    <TouchableOpacity onPress={() => updateStatus('Completed')} className="rounded-lg bg-blue-500 px-3 py-1.5">
                      <Text className="text-xs font-medium text-white">{t('markCompleted')}</Text>
                    </TouchableOpacity>
                  )}
                  {status === 'Completed' && rpeEnabled && reco?.rpe == null && (
                    <TouchableOpacity onPress={() => setFeedbackOpen(true)} className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5">
                      <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('addFeedback')}</Text>
                    </TouchableOpacity>
                  )}
                  {reco?.rpe != null && (
                    <View className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1">
                      <Text className="text-xs font-medium text-slate-700 dark:text-slate-200">{t('feedbackRpe')}: {reco.rpe}/10</Text>
                    </View>
                  )}
                  {status && (
                    <View style={{ backgroundColor: statusColor + '22' }} className="rounded-full px-3 py-1">
                      <Text style={{ color: statusColor }} className="text-xs font-medium">{tWorkouts(STATUS_I18N[status] ?? status)}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {workout.description ? <Text className="text-sm text-slate-500 dark:text-slate-400 mt-3">{workout.description}</Text> : null}

            {workout.steps?.length > 0 && (
              <View className="mt-3" onLayout={onChartLayout}>
                <IntervalChart steps={workout.steps} width={chartWidth} />
              </View>
            )}

            {/* Planned vs actual compliance */}
            {actualTss != null && workout.estimatedTSS > 0 && (() => {
              const compliance = Math.round((actualTss / workout.estimatedTSS) * 100);
              const onTarget = compliance >= 85 && compliance <= 115;
              const color = onTarget ? '#22c55e' : compliance < 85 ? '#3b82f6' : '#f97316';
              return (
                <View className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 mt-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('complianceTitle')}</Text>
                    <Text className="text-sm font-semibold text-slate-900 dark:text-white">{compliance}%</Text>
                  </View>
                  <View className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <View className="h-2 rounded-full" style={{ width: `${Math.min(compliance, 100)}%`, backgroundColor: color }} />
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-xs text-slate-400">{t('compliancePlanned')}: {Math.round(workout.estimatedTSS)} {tCommon('tssLabel')}</Text>
                    <Text className="text-xs text-slate-400">{t('complianceActual')}: {Math.round(actualTss)} {tCommon('tssLabel')}</Text>
                  </View>
                </View>
              );
            })()}
          </Card>
        )}

        {/* Alternative workout */}
        {alt && (
          <Card>
            <Text className="text-xs font-medium text-slate-400 mb-2">{t('alternativeOption')}</Text>
            <Text className="text-base font-semibold text-slate-900 dark:text-white">{WorkoutTitle(alt.name, tWorkouts)}</Text>
            <View className="flex-row items-center gap-2 mt-1.5">
              <CategoryBadge category={alt.category} label={tWorkouts(CATEGORY_I18N[alt.category] ?? 'categoryMixed')} />
              <Text className="text-xs text-slate-400">{alt.durationMinutes} {tCommon('min')} · {tCommon('tssLabel')} {alt.estimatedTSS}</Text>
            </View>
          </Card>
        )}

        {/* How recommendations work (collapsible) */}
        <Card>
          <TouchableOpacity onPress={() => setHowOpen((o) => !o)} className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">{t('howRecommended')}</Text>
            <Ionicons name={howOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
          </TouchableOpacity>
          {howOpen && (
            <View className="mt-3 gap-2">
              {['howRecommendedIntro', 'howRecommendedToday', 'howRecommendedGoal', 'howRecommendedDuration', 'howRecommendedFullPlan'].map((k) => (
                <Text key={k} className="text-xs text-slate-500 dark:text-slate-400 leading-5">{t(k)}</Text>
              ))}
            </View>
          )}
        </Card>

        {/* Regenerate */}
        <TouchableOpacity onPress={regenerate} disabled={regenerating} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 items-center" style={{ opacity: regenerating ? 0.6 : 1 }}>
          <Text className="text-sm font-medium text-slate-900 dark:text-white">{regenerating ? t('regenerating') : tCommon('regenerate')}</Text>
          <Text className="text-xs text-slate-400 mt-0.5">{t('getNewRecommendation')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {reco && (
        <FeedbackModal
          visible={feedbackOpen}
          recommendationId={reco.id}
          onClose={() => setFeedbackOpen(false)}
          onSubmitted={(fb) => { setReco((p) => (p ? { ...p, rpe: fb.rpe, legsFeel: fb.legsFeel, sessionQuality: fb.sessionQuality, feedbackNote: fb.note } : null)); setFeedbackOpen(false); }}
        />
      )}
    </View>
  );
}
