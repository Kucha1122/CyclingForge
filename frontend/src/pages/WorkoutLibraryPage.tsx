import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabFilter = (tabParam === 'mine' || tabParam === 'system' || tabParam === 'all') ? tabParam : 'all';

  const [workouts, setWorkouts] = useState<WorkoutSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [zone, setZone] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [importingZwo, setImportingZwo] = useState(false);
  const [importingFit, setImportingFit] = useState(false);
  const [importingZip, setImportingZip] = useState(false);
  const [importZipResult, setImportZipResult] = useState<{ imported: number; failed: number; errors: { fileName: string; message: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts, listRefreshKey]);

  // After ZIP import, refresh list so "My workouts" shows new items
  useEffect(() => {
    if (importZipResult && importZipResult.imported > 0) {
      fetchWorkouts();
    }
  }, [importZipResult, fetchWorkouts]);

  // Auto-hide import result message after 8 seconds
  useEffect(() => {
    if (!importZipResult) return;
    const timer = setTimeout(() => setImportZipResult(null), 8000);
    return () => clearTimeout(timer);
  }, [importZipResult]);

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

  const handleImportZwoOrFitFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFit = file.name.toLowerCase().endsWith('.fit');
    if (isFit) setImportingFit(true);
    else setImportingZwo(true);
    setImportZipResult(null);
    setImportError(null);
    try {
      if (isFit) {
        await workoutsApi.importFit(file);
      } else {
        const text = await file.text();
        await workoutsApi.importZwo(text);
      }
      setSearchParams({ tab: 'mine' });
      setPage(1);
      setListRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
        ? (err.response as { data?: unknown }).data
        : undefined;
      const message = typeof data === 'string'
        ? data
        : data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : data && typeof data === 'object' && 'detail' in data && typeof (data as { detail?: unknown }).detail === 'string'
            ? (data as { detail: string }).detail
            : data && typeof data === 'object' && 'title' in data && typeof (data as { title?: unknown }).title === 'string'
              ? (data as { title: string }).title
              : err instanceof Error
                ? err.message
                : t('importErrorUnknown');
      setImportError(message);
    } finally {
      setImportingFit(false);
      setImportingZwo(false);
      e.target.value = '';
    }
  };

  const handleImportZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingZip(true);
    setImportZipResult(null);
    try {
      const { data } = await workoutsApi.importZwoZip(file);
      setImportZipResult({
        imported: data.importedCount,
        failed: data.failedCount,
        errors: data.errors,
      });
      setSearchParams({ tab: 'mine' });
      setPage(1);
      setListRefreshKey((k) => k + 1);
    } catch {
      setImportZipResult({ imported: 0, failed: 0, errors: [{ fileName: '', message: t('importZipErrorNetwork') }] });
    } finally {
      setImportingZip(false);
      e.target.value = '';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 24);

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('library')}</h1>
          <p className="text-secondary">{t('librarySubtitle')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zwo,.fit"
              className="hidden"
              onChange={handleImportZwoOrFitFile}
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleImportZipFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importingZwo || importingFit || importingZip}
              className="rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              {(importingZwo || importingFit) ? t('importingZwo') : t('importZwoOrFitFile')}
            </button>
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              disabled={importingZwo || importingZip}
              className="rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              {importingZip ? t('importingZip') : t('importZwoZip')}
            </button>
            <Link
            to="/workouts/create"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            + {t('createWorkout')}
          </Link>
          </div>
          {importError && (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-state-danger bg-state-danger/10 px-3 py-2 text-sm text-state-danger-text">
              <p>{importError}</p>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="shrink-0 rounded p-1 hover:bg-state-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t('close')}
              >
                ×
              </button>
            </div>
          )}
          {importZipResult && (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-border-default bg-muted/50 px-3 py-2 text-sm text-primary">
              <div>
                {importZipResult.imported > 0 && <p>{t('importZipSuccess', { count: importZipResult.imported })}</p>}
                {importZipResult.failed > 0 && (
                  <p className="mt-1 text-state-danger-text">{t('importZipFailed', { count: importZipResult.failed })}</p>
                )}
                {importZipResult.errors.length > 0 && importZipResult.errors.length <= 5 && (
                  <ul className="mt-1 list-inside list-disc text-tertiary">
                    {importZipResult.errors.map((err, i) => (
                      <li key={i}>{err.fileName ? `${err.fileName}: ${err.message}` : err.message}</li>
                    ))}
                  </ul>
                )}
                {importZipResult.errors.length > 5 && (
                  <p className="mt-1 text-tertiary">{t('importZipErrorsMore', { count: importZipResult.errors.length })}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setImportZipResult(null)}
                className="shrink-0 rounded p-1 text-tertiary hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t('close')}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        {(['all', 'system', 'mine'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setSearchParams({ tab: tabKey }); setPage(1); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === tabKey ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
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
            className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button type="submit" className="rounded-lg bg-muted px-3 py-2 text-sm text-primary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t('search')}
          </button>
        </form>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{t('allCategories')}</option>
          {WORKOUT_CATEGORIES.map(c => (
            <option key={c} value={c}>{t(CATEGORY_I18N_KEYS[c] ?? 'categoryMixed')}</option>
          ))}
        </select>

        <select
          value={zone}
          onChange={(e) => { setZone(e.target.value); setPage(1); }}
          className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{t('allZones')}</option>
          {TRAINING_ZONES.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
          ))}
        </select>

        {(category || zone || search || sortBy !== 'default') && (
          <button
            onClick={() => { setCategory(''); setZone(''); setSearch(''); setSearchInput(''); setSortBy('default'); setPage(1); }}
            className="text-sm text-accent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            {t('clearFilters')}
          </button>
        )}

        <span className="ml-auto text-sm text-tertiary">{t('workoutsFound', { count: totalCount })}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-tertiary">{t('loadingWorkouts')}</p>
        </div>
      ) : workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-tertiary">{t('noWorkoutsFound')}</p>
          <p className="text-tertiary">{t('noWorkoutsHint')}</p>
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
            className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('previous')}
          </button>
          <span className="px-3 text-sm text-secondary">
            {t('pageOf', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border-default">
            <h2 className="text-lg font-semibold text-primary">{t('deleteWorkout')}</h2>
            <p className="mt-2 text-sm text-secondary">
              {t('deleteWorkoutConfirm', { name: deleteName ?? '' })}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-state-danger-bg px-4 py-2 text-sm font-medium text-state-danger-text hover:bg-state-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
