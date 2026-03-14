import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workoutsApi } from '../services/api';
import { WorkoutCard } from '../components/workouts/WorkoutCard';
import type { WorkoutSummaryDto } from '../types/workout';
import { WORKOUT_CATEGORIES, TRAINING_ZONES } from '../types/workout';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};

type TabFilter = 'all' | 'system' | 'mine';

const SORT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'default',       labelKey: 'sortDefault' },
  { value: 'name_asc',      labelKey: 'sortNameAsc' },
  { value: 'name_desc',     labelKey: 'sortNameDesc' },
  { value: 'duration_asc',  labelKey: 'sortDurationAsc' },
  { value: 'duration_desc', labelKey: 'sortDurationDesc' },
  { value: 'tss_asc',       labelKey: 'sortTssAsc' },
  { value: 'tss_desc',      labelKey: 'sortTssDesc' },
];

export const WorkoutLibraryPage = () => {
  const { t } = useTranslation('workouts');
  const [workouts, setWorkouts] = useState<WorkoutSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabFilter>('all');
  const [category, setCategory] = useState('');
  const [zone, setZone] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 24 };
      if (category) params.category = category;
      if (zone) params.zone = zone;
      if (search) params.search = search;
      if (tab === 'system') params.source = 'System';
      if (tab === 'mine') params.source = 'UserCreated';
      if (sortBy && sortBy !== 'default') params.sortBy = sortBy;

      const { data } = await workoutsApi.search(params as never);
      setWorkouts(data.items);
      setTotalCount(data.totalCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, category, zone, search, tab, sortBy]);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  const handleRequestDelete = (id: string, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await workoutsApi.delete(deleteId);
      setDeleteId(null);
      setDeleteName(null);
      fetchWorkouts();
    } catch {
      // ignore
    }
  };

  const handleCancelDelete = () => {
    setDeleteId(null);
    setDeleteName(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 24);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('library')}</h1>
          <p className="text-gray-600">{t('librarySubtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/workouts/create"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + {t('createWorkout')}
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['all', 'system', 'mine'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setPage(1); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === tabKey ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tabKey === 'all' ? t('allWorkouts') : tabKey === 'system' ? t('systemLibrary') : t('myWorkouts')}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button type="submit" className="rounded-lg bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">
            {t('search')}
          </button>
        </form>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">{t('allCategories')}</option>
          {WORKOUT_CATEGORIES.map(c => (
            <option key={c} value={c}>{t(CATEGORY_I18N_KEYS[c] ?? 'categoryMixed')}</option>
          ))}
        </select>

        <select
          value={zone}
          onChange={(e) => { setZone(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">{t('allZones')}</option>
          {TRAINING_ZONES.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
          ))}
        </select>

        {(category || zone || search || sortBy !== 'default') && (
          <button
            onClick={() => { setCategory(''); setZone(''); setSearch(''); setSearchInput(''); setSortBy('default'); setPage(1); }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('clearFilters')}
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">{t('workoutsFound', { count: totalCount })}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">{t('loadingWorkouts')}</p>
        </div>
      ) : workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-gray-500">{t('noWorkoutsFound')}</p>
          <p className="text-gray-400">{t('noWorkoutsHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workouts.map(w => (
            <WorkoutCard
              key={w.id}
              workout={w}
              showActions
                onDelete={() => handleRequestDelete(w.id, w.name)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            {t('previous')}
          </button>
          <span className="px-3 text-sm text-gray-600">
            {t('pageOf', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">{t('deleteWorkout')}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {t('deleteWorkoutConfirm', { name: deleteName ?? '' })}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
