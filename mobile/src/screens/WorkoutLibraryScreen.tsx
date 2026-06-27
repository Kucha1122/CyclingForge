import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator,
  Modal, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
// Lazy-loaded to avoid crash if the native module isn't ready at import time.
import { WORKOUT_CATEGORIES, TRAINING_ZONES } from '@cyclingforge/shared';
import type { WorkoutSummaryDto } from '@cyclingforge/shared';
import { workoutsApi } from '../services/api';
import { WorkoutCard, CATEGORY_I18N } from '../components/workoutCard';
import type { WorkoutLibraryScreenProps } from '../navigation/types';

type TabFilter = 'all' | 'system' | 'mine';

const SORT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'default', labelKey: 'sortDefault' },
  { value: 'name_asc', labelKey: 'sortNameAsc' },
  { value: 'name_desc', labelKey: 'sortNameDesc' },
  { value: 'duration_asc', labelKey: 'sortDurationAsc' },
  { value: 'duration_desc', labelKey: 'sortDurationDesc' },
  { value: 'tss_asc', labelKey: 'sortTssAsc' },
  { value: 'tss_desc', labelKey: 'sortTssDesc' },
];

const PAGE_SIZE = 24;

export function WorkoutLibraryScreen({ navigation }: WorkoutLibraryScreenProps) {
  const { t } = useTranslation('workouts');

  const [tab, setTab] = useState<TabFilter>('all');
  const [workouts, setWorkouts] = useState<WorkoutSummaryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [zone, setZone] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Monotonic request id: responses from a superseded query are ignored, so a
  // fast tab/filter switch can never apply a stale (or undefined) payload.
  const reqIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const buildParams = useCallback((pageToLoad: number) => {
    const params: Record<string, unknown> = { page: pageToLoad, pageSize: PAGE_SIZE };
    if (category) params.category = category;
    if (zone) params.zone = zone;
    if (search) params.search = search;
    if (tab === 'system') params.source = 'System';
    if (tab === 'mine') params.source = 'UserCreated';
    if (sortBy && sortBy !== 'default') params.sortBy = sortBy;
    return params;
  }, [category, zone, search, tab, sortBy]);

  // Load page 1 for the current query, replacing the list. `silent` skips the
  // full-screen spinner (used for pull-to-refresh and focus refetch).
  const reload = useCallback(async (silent = false) => {
    const myReq = ++reqIdRef.current;
    if (!silent) setLoading(true);
    try {
      const { data } = await workoutsApi.search(buildParams(1) as never);
      if (myReq !== reqIdRef.current) return;
      setWorkouts(data?.items ?? []);
      setTotalCount(data?.totalCount ?? 0);
      setPage(1);
    } catch {
      if (myReq === reqIdRef.current) { setWorkouts([]); setTotalCount(0); }
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [buildParams]);

  // Reload whenever the query (tab/search/filters) changes.
  useEffect(() => { reload(); }, [reload]);

  // Silent refetch when returning from creator/detail (after create/copy/delete).
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      // Skip the initial mount focus — reload() already handles that.
      if (reqIdRef.current > 0) reload(true);
    });
    return unsub;
  }, [navigation, reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading) return;
    if (workouts.length >= totalCount) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const next = page + 1;
    const myReq = reqIdRef.current; // tie to the active query
    try {
      const { data } = await workoutsApi.search(buildParams(next) as never);
      if (myReq !== reqIdRef.current) return; // query changed mid-flight
      const incoming = data?.items ?? [];
      setWorkouts((prev) => {
        const seen = new Set(prev.map((w) => w.id));
        return [...prev, ...incoming.filter((w) => !seen.has(w.id))];
      });
      setPage(next);
    } catch { /* ignore */ } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, workouts.length, totalCount, page, buildParams]);

  const applySearch = () => { setSearch(searchInput.trim()); };

  const clearFilters = () => {
    setCategory(''); setZone(''); setSortBy('default'); setSearch(''); setSearchInput('');
  };

  const requestDelete = (w: WorkoutSummaryDto) => {
    Alert.alert(
      t('deleteWorkout'),
      t('deleteWorkoutConfirm', { name: w.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => {
            try { await workoutsApi.delete(w.id); setWorkouts((p) => p.filter((x) => x.id !== w.id)); setTotalCount((c) => Math.max(0, c - 1)); }
            catch { /* ignore */ }
          },
        },
      ],
    );
  };

  const requestDeleteAll = () => {
    Alert.alert(
      t('deleteAllMyWorkouts'),
      t('deleteAllMyWorkoutsConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => { try { await workoutsApi.deleteAllMine(); reload(); } catch { /* ignore */ } },
        },
      ],
    );
  };

  const handleImport = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', 'application/zip', 'text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name = asset.name ?? 'workout';
      const lower = name.toLowerCase();
      setImporting(true);
      setImportMsg(null);

      if (lower.endsWith('.zip')) {
        const { data } = await workoutsApi.importZwoZip({ uri: asset.uri, name });
        setImportMsg({ text: t('importZipSuccess', { count: data.importedCount }) + (data.failedCount > 0 ? ' ' + t('importZipFailed', { count: data.failedCount }) : '') });
      } else if (lower.endsWith('.fit')) {
        await workoutsApi.importFit({ uri: asset.uri, name });
        setImportMsg({ text: t('importZipSuccess', { count: 1 }) });
      } else if (lower.endsWith('.zwo') || lower.endsWith('.xml')) {
        const resp = await fetch(asset.uri);
        const text = await resp.text();
        await workoutsApi.importZwo(text);
        setImportMsg({ text: t('importZipSuccess', { count: 1 }) });
      } else {
        setImportMsg({ text: t('importErrorUnknown'), error: true });
        return;
      }
      setTab('mine');
    } catch {
      setImportMsg({ text: t('importErrorUnknown'), error: true });
    } finally {
      setImporting(false);
    }
  };

  const hasActiveFilters = !!(category || zone || search || sortBy !== 'default');

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => navigation.getParent()?.navigate('WorkoutDetail', { id: item.id })}
            onDelete={() => requestDelete(item)}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="mb-3">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">{t('library')}</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{t('librarySubtitle')}</Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                onPress={handleImport}
                disabled={importing}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5"
                style={{ opacity: importing ? 0.6 : 1 }}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#3b82f6" />
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {importing ? t('importingZwo') : t('importZwoOrFitFile')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.getParent()?.navigate('WorkoutCreator', {})}
                className="flex-row items-center justify-center gap-1 rounded-xl bg-blue-500 px-4 py-2.5"
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text className="text-sm font-medium text-white">{t('createWorkout')}</Text>
              </TouchableOpacity>
            </View>

            {importMsg && (
              <View className={`flex-row items-start justify-between gap-2 rounded-xl px-3 py-2 mb-3 ${importMsg.error ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                <Text className={`flex-1 text-sm ${importMsg.error ? 'text-red-700 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>{importMsg.text}</Text>
                <TouchableOpacity onPress={() => setImportMsg(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={importMsg.error ? '#b91c1c' : '#1d4ed8'} />
                </TouchableOpacity>
              </View>
            )}

            {/* Tabs */}
            <View className="flex-row rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 mb-3">
              {(['all', 'system', 'mine'] as const).map((tk) => (
                <TouchableOpacity
                  key={tk}
                  onPress={() => setTab(tk)}
                  // NOTE: the active "shadow" is applied via `style`, not className.
                  // Toggling a `shadow-*` class after the first render makes NativeWind
                  // attempt a component "upgrade" + warning, whose serializer walks the
                  // navigation prop tree and throws "Couldn't find a navigation context".
                  className={`flex-1 rounded-lg h-9 items-center justify-center ${tab === tk ? 'bg-white dark:bg-slate-700' : ''}`}
                  style={tab === tk ? { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
                >
                  <Text
                    numberOfLines={1}
                    className={`text-[13px] font-medium ${tab === tk ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {tk === 'all' ? t('tabAll') : tk === 'system' ? t('tabSystem') : t('tabMine')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search + filters */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 flex-row items-center rounded-xl bg-white dark:bg-slate-800 px-3 border border-slate-200 dark:border-slate-700">
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={applySearch}
                  returnKeyType="search"
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  className="flex-1 py-2.5 px-2 text-sm text-slate-900 dark:text-white"
                />
                {searchInput.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setFiltersOpen(true)}
                className="flex-row items-center gap-1 rounded-xl bg-white dark:bg-slate-800 px-3 border border-slate-200 dark:border-slate-700"
              >
                <Ionicons name="options-outline" size={18} color={hasActiveFilters ? '#3b82f6' : '#64748b'} />
                {hasActiveFilters && <View className="w-2 h-2 rounded-full bg-blue-500" />}
              </TouchableOpacity>
            </View>

            {/* Count + delete all */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs text-slate-400">{t('workoutsFound', { count: totalCount })}</Text>
              {tab === 'mine' && totalCount > 0 && (
                <TouchableOpacity onPress={requestDeleteAll}>
                  <Text className="text-xs font-medium text-red-500">{t('deleteAllMyWorkouts')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center justify-center py-20">
              <Ionicons name="barbell-outline" size={40} color="#cbd5e1" />
              <Text className="text-base font-medium text-slate-400 mt-3">{t('noWorkoutsFound')}</Text>
              <Text className="text-sm text-slate-400">{t('noWorkoutsHint')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading ? (
            <View className="py-16 items-center"><ActivityIndicator size="large" color="#3b82f6" /></View>
          ) : loadingMore ? (
            <View className="py-4 items-center"><ActivityIndicator color="#3b82f6" /></View>
          ) : null
        }
      />

      <FilterModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        category={category} setCategory={setCategory}
        zone={zone} setZone={setZone}
        sortBy={sortBy} setSortBy={setSortBy}
        onClear={clearFilters}
      />
    </View>
  );
}

// ── Filter modal ────────────────────────────────────────────────
function FilterModal({
  visible, onClose, category, setCategory, zone, setZone, sortBy, setSortBy, onClear,
}: {
  visible: boolean; onClose: () => void;
  category: string; setCategory: (v: string) => void;
  zone: string; setZone: (v: string) => void;
  sortBy: string; setSortBy: (v: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('workouts');

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 border ${active ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
    >
      <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-slate-50 dark:bg-slate-900 rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">{t('filters')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color="#94a3b8" /></TouchableOpacity>
          </View>

          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('allCategories')}</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <Chip active={category === ''} label={t('allCategories')} onPress={() => setCategory('')} />
            {WORKOUT_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} label={t(CATEGORY_I18N[c] ?? 'categoryMixed')} onPress={() => setCategory(c)} />
            ))}
          </View>

          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('allZones')}</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <Chip active={zone === ''} label={t('allZones')} onPress={() => setZone('')} />
            {TRAINING_ZONES.map((z) => (
              <Chip key={z} active={zone === z} label={z} onPress={() => setZone(z)} />
            ))}
          </View>

          <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('sortDefault')}</Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.value} active={sortBy === o.value} label={t(o.labelKey)} onPress={() => setSortBy(o.value)} />
            ))}
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onClear} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 items-center">
              <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('clearFilters')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="flex-1 rounded-xl bg-blue-500 py-3 items-center">
              <Text className="text-sm font-medium text-white">{t('search')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
