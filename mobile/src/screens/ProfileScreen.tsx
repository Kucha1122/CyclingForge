import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, RefreshControl, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { UserProfile, AthleteProfileDto, AthleteZonesDto, ActivitySyncFilterDto, GarminStatusDto, GarminSyncPreferenceDto } from '@cyclingforge/shared';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { usersApi, stravaApi, garminApi, authApi } from '../services/api';
import { formatDate } from '../utils/format';
import { HR_ZONE_COLORS } from '../components/dashboardCards';
import i18n from '../i18n';

const ACTIVITY_TYPES = ['Ride', 'Run', 'Walk', 'Hike', 'Swim', 'VirtualRide', 'VirtualRun'];
const POWER_ZONE_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
const TIME_RE = /^\d{2}:\d{2}$/;
const deviceTimeZone = (): string => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

// ───────── helper components ─────────

function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      {(title || right) && (
        <View className="flex-row items-center justify-between mb-3">
          {title ? <Text className="text-base font-semibold text-slate-900 dark:text-white">{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-700">
      <Text className="text-sm text-slate-600 dark:text-slate-400 flex-1 mr-2">{label}</Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  const bg = connected ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.18)';
  const color = connected ? '#16a34a' : '#64748b';
  return (
    <View className="flex-row items-center px-2.5 py-0.5 rounded-full" style={{ backgroundColor: bg }}>
      <Text style={{ color }} className="text-xs font-semibold">● {label}</Text>
    </View>
  );
}

function MetricInput({ label, hint, value, onChange, unit, placeholder }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</Text>
      {hint ? <Text className="text-xs text-slate-400 mb-2">{hint}</Text> : null}
      <View className="flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-base font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
        />
        {unit ? <Text className="text-sm text-slate-400 ml-3 w-12">{unit}</Text> : null}
      </View>
    </View>
  );
}

function ZoneRow({ label, range, color }: { label: string; range: string; color: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-lg overflow-hidden mb-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-700/40" style={{ borderLeftWidth: 6, borderLeftColor: color }}>
      <Text className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</Text>
      <Text className="text-xs font-semibold text-slate-900 dark:text-white" style={{ fontVariant: ['tabular-nums'] }}>{range}</Text>
    </View>
  );
}

// ───────── screen ─────────

export function ProfileScreen() {
  const { t } = useTranslation('profile');
  const tCommon = useTranslation('common').t;
  const tNav = useTranslation('nav').t;
  const { userId, logout } = useAuthStore();

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      // Revoke server-side; ignore failures (token may already be invalid).
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
  };
  const { theme, toggleTheme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // editable metric fields (strings to allow empty)
  const [ftp, setFtp] = useState('');
  const [eftpMin, setEftpMin] = useState('');
  const [weight, setWeight] = useState('');
  const [lthr, setLthr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [rpe, setRpe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // strava
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [zones, setZones] = useState<AthleteZonesDto | null>(null);
  const [syncFilters, setSyncFilters] = useState<ActivitySyncFilterDto[]>([]);
  const [newFilterType, setNewFilterType] = useState('Ride');
  const [newFilterDevice, setNewFilterDevice] = useState('');
  const [filterSaving, setFilterSaving] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);

  // garmin
  const [garminStatus, setGarminStatus] = useState<GarminStatusDto | null>(null);
  const [garminPrefs, setGarminPrefs] = useState<GarminSyncPreferenceDto | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [prefSaving, setPrefSaving] = useState(false);
  const [gEmail, setGEmail] = useState('');
  const [gPassword, setGPassword] = useState('');
  const [gConnecting, setGConnecting] = useState(false);
  const [gError, setGError] = useState<string | null>(null);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const applyProfile = useCallback((p: UserProfile) => {
    setProfile(p);
    setFtp(p.functionalThresholdPower != null ? String(p.functionalThresholdPower) : '');
    setEftpMin(p.eftpMinDurationSeconds != null ? String(Math.round(p.eftpMinDurationSeconds / 60)) : '');
    setWeight(p.weightKg != null ? String(p.weightKg) : '');
    setLthr(p.lactateThresholdHeartRate != null ? String(p.lactateThresholdHeartRate) : '');
    setMaxHr(p.maxHeartRate != null ? String(p.maxHeartRate) : '');
    setRestingHr(p.restingHeartRate != null ? String(p.restingHeartRate) : '');
    setGender(p.gender ?? null);
    setRpe(!!p.enableRpeFeedback);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    const [profR, sProfR, zonesR, filtersR, gStatusR, gPrefsR] = await Promise.allSettled([
      usersApi.getProfile(userId),
      stravaApi.getProfile(),
      stravaApi.getZones(),
      stravaApi.getSyncFilters(),
      garminApi.getStatus(),
      garminApi.getSyncPreferences(),
    ]);
    if (profR.status === 'fulfilled') applyProfile(profR.value.data);
    setStravaProfile(sProfR.status === 'fulfilled' ? sProfR.value.data : null);
    if (zonesR.status === 'fulfilled') setZones(zonesR.value.data);
    if (filtersR.status === 'fulfilled') setSyncFilters(filtersR.value.data);
    if (gStatusR.status === 'fulfilled') setGarminStatus(gStatusR.value.data);
    if (gPrefsR.status === 'fulfilled') setGarminPrefs(gPrefsR.value.data);
  }, [userId, applyProfile]);

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // ── save metrics ──
  const numOrNull = (s: string): number | null => {
    const t2 = s.trim();
    if (t2 === '') return null;
    const n = Number(t2);
    return Number.isFinite(n) ? n : null;
  };
  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const eftpM = numOrNull(eftpMin);
      await usersApi.updateProfile(userId, {
        ftp: numOrNull(ftp),
        weightKg: numOrNull(weight),
        lthr: numOrNull(lthr),
        maxHeartRate: numOrNull(maxHr),
        restingHeartRate: numOrNull(restingHr),
        gender,
        eftpMinDurationSeconds: eftpM != null ? Math.min(30, Math.max(3, Math.round(eftpM))) * 60 : null,
        enableRpeFeedback: rpe,
      });
      const { data } = await usersApi.getProfile(userId);
      applyProfile(data);
      setSaveMsg({ ok: true, text: t('profileUpdated') });
    } catch {
      setSaveMsg({ ok: false, text: t('profileUpdateFailed') });
    } finally {
      setSaving(false);
    }
  };

  // ── strava ──
  const doStravaSync = async () => {
    setStravaSyncing(true);
    try { await stravaApi.sync(); } catch { /* surfaced by interceptor */ } finally { setStravaSyncing(false); }
  };
  const addFilter = async () => {
    if (!newFilterDevice.trim()) return;
    setFilterSaving(true);
    try {
      await stravaApi.addSyncFilter(newFilterType, newFilterDevice.trim());
      setNewFilterDevice('');
      const { data } = await stravaApi.getSyncFilters();
      setSyncFilters(data);
    } catch { /* ignore */ } finally { setFilterSaving(false); }
  };
  const removeFilter = async (id: string) => {
    setSyncFilters((prev) => prev.filter((f) => f.id !== id));
    try { await stravaApi.deleteSyncFilter(id); } catch { /* ignore */ }
  };

  // ── garmin ──
  const persistPrefs = async (next: GarminSyncPreferenceDto) => {
    setGarminPrefs(next);
    setPrefSaving(true);
    try { await garminApi.saveSyncPreferences(next); } catch { /* ignore */ } finally { setPrefSaving(false); }
  };
  const toggleAutoSync = () => {
    const base = garminPrefs ?? { syncTimes: [], enabled: false, timeZoneId: deviceTimeZone() };
    persistPrefs({ ...base, enabled: !base.enabled });
  };
  const addTimeStr = (v: string) => {
    if (!TIME_RE.test(v)) return;
    const base = garminPrefs ?? { syncTimes: [], enabled: true, timeZoneId: deviceTimeZone() };
    if (base.syncTimes.includes(v)) return;
    const syncTimes = [...base.syncTimes, v].sort();
    persistPrefs({ ...base, syncTimes, timeZoneId: base.timeZoneId || deviceTimeZone() });
  };
  const dateToHm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const onPickTime = (event: DateTimePickerEvent, date?: Date) => {
    // Android fires once and dismisses itself; iOS updates live inside the inline spinner.
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && date) addTimeStr(dateToHm(date));
    } else if (date) {
      setPickerDate(date);
    }
  };
  const removeTime = (time: string) => {
    if (!garminPrefs) return;
    persistPrefs({ ...garminPrefs, syncTimes: garminPrefs.syncTimes.filter((x) => x !== time) });
  };
  const connectGarmin = async () => {
    setGConnecting(true);
    setGError(null);
    try {
      const { data } = await garminApi.connect(gEmail.trim(), gPassword);
      if (data?.sessionId) {
        setMfaSessionId(data.sessionId);
      } else {
        const { data: st } = await garminApi.getStatus();
        setGarminStatus(st);
        setGEmail(''); setGPassword('');
      }
    } catch {
      setGError(t('garminConnectError'));
    } finally { setGConnecting(false); }
  };
  const confirmMfa = async () => {
    if (!mfaSessionId) return;
    setGConnecting(true);
    setGError(null);
    try {
      await garminApi.connectMfa(mfaSessionId, mfaCode.trim());
      const { data: st } = await garminApi.getStatus();
      setGarminStatus(st);
      setMfaSessionId(null); setMfaCode(''); setGEmail(''); setGPassword('');
      const pr = await garminApi.getSyncPreferences().catch(() => null);
      if (pr) setGarminPrefs(pr.data);
    } catch {
      setGError(t('garminConnectError'));
    } finally { setGConnecting(false); }
  };
  const disconnectGarmin = () => {
    Alert.alert(t('disconnectGarminTitle'), t('disconnectGarminConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('disconnect'), style: 'destructive',
        onPress: async () => {
          try {
            await garminApi.disconnect();
            setGarminStatus({ isConnected: false, connectedAt: null });
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const ftpN = numOrNull(ftp);
  const weightN = numOrNull(weight);
  const pwr = ftpN != null && weightN != null && weightN > 0 ? ftpN / weightN : null;
  const pwrLabel = pwr == null ? '' : pwr > 4.5 ? t('pwrExcellent') : pwr > 3.5 ? t('pwrVeryGood') : pwr > 2.5 ? t('pwrGood') : t('pwrBuilding');
  const garminConnected = !!garminStatus?.isConnected;
  const prefs = garminPrefs ?? { syncTimes: [], enabled: false, timeZoneId: deviceTimeZone() };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-5">{t('title')}</Text>

        {/* Account */}
        {profile && (
          <Card title={t('accountInfo')}>
            <Field label={t('name')} value={`${profile.firstName} ${profile.lastName}`.trim() || '–'} />
            <Field label={t('email')} value={profile.email} />
            <Field label={t('memberSince')} value={profile.createdAt ? formatDate(profile.createdAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '–'} />
          </Card>
        )}

        {/* Strava */}
        <Card title={t('stravaConnection')} right={<StatusBadge connected={!!stravaProfile} label={stravaProfile ? t('connected') : t('notConnected')} />}>
          {stravaProfile ? (
            <>
              <View className="flex-row items-center mb-3">
                {stravaProfile.profileImageUrl ? (
                  <Image source={{ uri: stravaProfile.profileImageUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : null}
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-slate-900 dark:text-white">{stravaProfile.firstName} {stravaProfile.lastName}</Text>
                  {(stravaProfile.city || stravaProfile.country) ? (
                    <Text className="text-xs text-slate-400">{[stravaProfile.city, stravaProfile.country].filter(Boolean).join(', ')}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={doStravaSync} disabled={stravaSyncing} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FC4C02', opacity: stravaSyncing ? 0.6 : 1 }}>
                  <Text className="text-xs font-semibold text-white">{stravaSyncing ? t('syncing') : t('syncNow')}</Text>
                </TouchableOpacity>
              </View>

              {/* Sync filters */}
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">{t('syncFiltersTitle')}</Text>
              <Text className="text-xs text-slate-400 mb-2">{t('syncFiltersHint')}</Text>
              {syncFilters.length === 0 ? (
                <Text className="text-xs text-slate-400 mb-2">{t('noFilters')}</Text>
              ) : (
                syncFilters.map((f) => (
                  <View key={f.id} className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2 mb-1.5">
                    <Text className="text-xs text-slate-700 dark:text-slate-200 flex-1 mr-2">
                      <Text className="font-semibold">{f.activityType}</Text> · {t('syncFilterDevice')} “{f.excludedDevicePattern}”
                    </Text>
                    <TouchableOpacity onPress={() => removeFilter(f.id)} hitSlop={8}>
                      <Text className="text-slate-400 text-lg">×</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {ACTIVITY_TYPES.map((type) => {
                  const active = newFilterType === type;
                  return (
                    <TouchableOpacity key={type} onPress={() => setNewFilterType(type)} className={`rounded-full px-3 py-1.5 border ${active ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <Text className={`text-xs ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View className="flex-row items-center gap-2 mt-2">
                <TextInput
                  value={newFilterDevice}
                  onChangeText={setNewFilterDevice}
                  placeholder={t('syncFilterDevicePlaceholder')}
                  placeholderTextColor="#94a3b8"
                  className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                />
                <TouchableOpacity onPress={addFilter} disabled={filterSaving || !newFilterDevice.trim()} className="rounded-xl bg-blue-500 px-4 py-2.5" style={{ opacity: filterSaving || !newFilterDevice.trim() ? 0.5 : 1 }}>
                  <Text className="text-sm font-semibold text-white">{t('syncFilterAdd')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text className="text-sm text-slate-500 dark:text-slate-400">{t('stravaAccountDisconnected')}</Text>
          )}
        </Card>

        {/* Garmin */}
        <Card title={t('garminConnect')} right={<StatusBadge connected={garminConnected} label={garminConnected ? t('connected') : t('notConnected')} />}>
          {garminConnected ? (
            <>
              {garminStatus?.connectedAt ? (
                <Text className="text-xs text-slate-400 mb-3">{t('connectedSince')} {formatDate(garminStatus.connectedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
              ) : null}

              {/* Auto-sync */}
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('garminAutoSyncTitle')}</Text>
                <Switch value={prefs.enabled} onValueChange={toggleAutoSync} disabled={prefSaving} />
              </View>
              <Text className="text-xs text-slate-400 mb-2">{t('garminAutoSyncHint')}</Text>
              {prefs.syncTimes.length === 0 ? (
                <Text className="text-xs text-slate-400 mb-2">{t('garminAutoSyncNoTimes')}</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {prefs.syncTimes.map((time) => (
                    <View key={time} className="flex-row items-center bg-slate-100 dark:bg-slate-700 rounded-full px-3 py-1">
                      <Text className="text-xs font-medium text-slate-700 dark:text-slate-200">{time}</Text>
                      <TouchableOpacity onPress={() => removeTime(time)} hitSlop={8} className="ml-1.5">
                        <Text className="text-slate-400">×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setPickerDate(new Date()); setShowTimePicker(true); }}
                className="flex-row items-center justify-center rounded-xl bg-blue-500 px-4 py-2.5 self-start"
              >
                <Text className="text-sm font-semibold text-white">＋ {t('garminAutoSyncAdd')}</Text>
              </TouchableOpacity>
              {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker value={pickerDate} mode="time" is24Hour display="default" onChange={onPickTime} />
              )}
              {showTimePicker && Platform.OS === 'ios' && (
                <View className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-700/40 p-2">
                  <DateTimePicker value={pickerDate} mode="time" is24Hour display="spinner" onChange={onPickTime} />
                  <View className="flex-row gap-2 mt-1">
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-700 py-2.5 items-center">
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { addTimeStr(dateToHm(pickerDate)); setShowTimePicker(false); }} className="flex-1 rounded-xl bg-blue-500 py-2.5 items-center">
                      <Text className="text-sm font-semibold text-white">{t('garminAutoSyncAdd')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity onPress={disconnectGarmin} className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 py-2.5 items-center">
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">{t('disconnect')}</Text>
              </TouchableOpacity>
            </>
          ) : mfaSessionId ? (
            <>
              <Text className="text-xs text-slate-400 mb-2">{t('garminMfaHint')}</Text>
              <TextInput
                value={mfaCode}
                onChangeText={setMfaCode}
                keyboardType="numeric"
                placeholder={t('garminMfaCode')}
                placeholderTextColor="#94a3b8"
                className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-base text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 mb-2"
              />
              {gError ? <Text className="text-xs text-red-500 mb-2">{gError}</Text> : null}
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => { setMfaSessionId(null); setMfaCode(''); }} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 py-3 items-center">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmMfa} disabled={gConnecting || !mfaCode.trim()} className="flex-1 rounded-xl bg-blue-500 py-3 items-center" style={{ opacity: gConnecting || !mfaCode.trim() ? 0.6 : 1 }}>
                  <Text className="text-sm font-semibold text-white">{gConnecting ? t('connectingGarmin') : t('confirmMfa')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xs text-slate-400 mb-3">{t('connectGarminHint')}</Text>
              <TextInput
                value={gEmail}
                onChangeText={setGEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('garminEmail')}
                placeholderTextColor="#94a3b8"
                className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-base text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 mb-2"
              />
              <TextInput
                value={gPassword}
                onChangeText={setGPassword}
                secureTextEntry
                placeholder={t('garminPassword')}
                placeholderTextColor="#94a3b8"
                className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-base text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 mb-1"
              />
              <Text className="text-[11px] text-slate-400 mb-2">{t('garminPasswordNotice')}</Text>
              {gError ? <Text className="text-xs text-red-500 mb-2">{gError}</Text> : null}
              <TouchableOpacity onPress={connectGarmin} disabled={gConnecting || !gEmail.trim() || !gPassword} className="rounded-xl py-3 items-center" style={{ backgroundColor: '#007CC3', opacity: gConnecting || !gEmail.trim() || !gPassword ? 0.6 : 1 }}>
                <Text className="text-sm font-semibold text-white">{gConnecting ? t('connectingGarmin') : t('connectWithGarmin')}</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Strava zones */}
        {zones && (zones.heartRateZones.length > 0 || zones.powerZones.length > 0) && (
          <Card title={t('trainingZones')} right={<StatusBadge connected label={t('fromStrava')} />}>
            {zones.heartRateZones.length > 0 && (
              <>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('heartRateZones')}</Text>
                {zones.heartRateZones.map((z, i) => (
                  <ZoneRow key={i} label={`HR Z${i + 1}`} range={`${z.min}–${z.max < 0 ? '∞' : z.max} bpm`} color={HR_ZONE_COLORS[i] ?? '#94a3b8'} />
                ))}
              </>
            )}
            {zones.powerZones.length > 0 && (
              <>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 mt-3">{t('powerZones')}</Text>
                {zones.powerZones.map((z, i) => (
                  <ZoneRow key={i} label={`PWR Z${i + 1}`} range={`${z.min}–${z.max < 0 ? '∞' : z.max} W`} color={POWER_ZONE_COLORS[i] ?? '#94a3b8'} />
                ))}
              </>
            )}
          </Card>
        )}

        {/* Editable metrics */}
        <Card title={t('trainingMetrics')}>
          <MetricInput label={t('ftpLabel')} hint={t('ftpHint')} value={ftp} onChange={setFtp} unit={t('watts')} placeholder={t('placeholderFtp')} />
          <MetricInput label={t('eftpMinLabel')} hint={t('eftpMinHint')} value={eftpMin} onChange={setEftpMin} unit={t('min')} />
          <MetricInput label={t('weightLabel')} hint={t('weightHint')} value={weight} onChange={setWeight} unit={t('kg')} placeholder={t('placeholderWeight')} />
          <MetricInput label={t('lthrLabel')} hint={t('lthrHint')} value={lthr} onChange={setLthr} unit={t('bpm')} placeholder={t('placeholderBpm')} />
          <MetricInput label={t('maxHrLabel')} hint={t('maxHrHint')} value={maxHr} onChange={setMaxHr} unit={t('bpm')} placeholder={t('placeholderMaxHr')} />
          <MetricInput label={t('restingHrLabel')} hint={t('restingHrHint')} value={restingHr} onChange={setRestingHr} unit={t('bpm')} placeholder={t('placeholderRestingHr')} />

          {/* Gender */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('genderLabel')}</Text>
          <View className="flex-row gap-2 mb-4">
            {[{ v: 'male', l: t('male') }, { v: 'female', l: t('female') }].map((g) => {
              const active = gender === g.v;
              return (
                <TouchableOpacity key={g.v} onPress={() => setGender(active ? null : g.v)} className={`flex-1 rounded-xl py-2.5 items-center ${active ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{g.l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* RPE toggle */}
          <View className="flex-row items-center justify-between py-1 mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('rpeFeedbackLabel')}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{t('rpeFeedbackHint')}</Text>
            </View>
            <Switch value={rpe} onValueChange={setRpe} />
          </View>

          {/* Power-to-weight */}
          {pwr != null && (
            <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-3">
              <Text className="text-xs text-slate-500 dark:text-slate-400">{t('powerToWeight')}</Text>
              <Text className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pwr.toFixed(2)} <Text className="text-base">W/{t('kg')}</Text></Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pwrLabel}</Text>
            </View>
          )}

          {saveMsg && (
            <View className={`rounded-xl p-3 mb-3 ${saveMsg.ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <Text className={`text-sm ${saveMsg.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{saveMsg.text}</Text>
            </View>
          )}

          <TouchableOpacity onPress={saveProfile} disabled={saving} className="rounded-xl bg-blue-500 py-3.5 items-center" style={{ opacity: saving ? 0.6 : 1 }}>
            <Text className="text-base font-semibold text-white">{saving ? t('saving') : t('saveProfile')}</Text>
          </TouchableOpacity>
        </Card>

        {/* Pro tip */}
        <View className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 mb-4">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">💡 {t('proTip')}</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">{t('proTipText')}</Text>
        </View>

        {/* App settings */}
        <Card title={tCommon('settings')}>
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-slate-700 dark:text-slate-300">{tCommon('themeDark')}</Text>
            <Switch value={theme === 'dark'} onValueChange={toggleTheme} />
          </View>
          <TouchableOpacity className="flex-row justify-between items-center py-3" onPress={() => i18n.changeLanguage(i18n.language === 'pl' ? 'en' : 'pl')}>
            <Text className="text-sm text-slate-700 dark:text-slate-300">{tNav('language')}</Text>
            <Text className="text-sm font-medium text-blue-600">{i18n.language === 'pl' ? tNav('polish') : tNav('english')}</Text>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-8 items-center" onPress={handleLogout}>
          <Text className="text-red-600 dark:text-red-400 font-semibold">{tCommon('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
