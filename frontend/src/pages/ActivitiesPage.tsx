import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { activitiesApi, metricsApi, type FtpChangeDto } from '../services/api';
import type { ActivityDto } from '../types/activity';
import { formatDate, formatTime } from '../utils/format';

const PER_PAGE = 30;

export const ActivitiesPage = () => {
  useAuth();
  const { t, i18n } = useTranslation('activities');
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ride' | 'run' | 'walk'>('all');
  const [ftpChanges, setFtpChanges] = useState<FtpChangeDto[] | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [activitiesResponse, pmcResponse] = await Promise.all([
          activitiesApi.getActivities(1, PER_PAGE),
          // Pobierz zmiany FTP z ostatniego roku, żeby móc opisać źródło FTP przy aktywnościach.
          metricsApi.getPmcSummary(undefined, undefined, 365),
        ]);

        const data = activitiesResponse.data;
        setActivities(data);
        setPage(1);
        setHasMore(data.length === PER_PAGE);

        if (pmcResponse.data.ftpChanges && pmcResponse.data.ftpChanges.length > 0) {
          // ftpChanges są już posortowane rosnąco po dacie po stronie backendu.
          setFtpChanges(pmcResponse.data.ftpChanges);
        } else {
          setFtpChanges(null);
        }
      } catch {
        // Failed to fetch activities
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await activitiesApi.getActivities(nextPage, PER_PAGE);
      const data = response.data;
      setActivities(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PER_PAGE);
    } catch {
      // Failed to load more
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading, loadingMore]);

  const formatTssLabel = (activity: ActivityDto) => {
    if (activity.trainingStressScore == null) return null;
    const isPowerBased = activity.normalizedPower != null || activity.deviceWatts === true;
    return isPowerBased ? 'TSS' : 'HRSS';
  };

  const getFtpSourceLabel = (activity: ActivityDto): string | null => {
    if (activity.ftpUsed == null || !ftpChanges || ftpChanges.length === 0) {
      return null;
    }

    const activityDate = new Date(activity.startDate);
    let lastChange: FtpChangeDto | null = null;

    for (const change of ftpChanges) {
      const changeDate = new Date(change.date);
      if (changeDate <= activityDate && (!lastChange || changeDate > new Date(lastChange.date))) {
        lastChange = change;
      }
    }

    if (!lastChange) {
      return null;
    }

    if (lastChange.source === 'Manual') {
      return 'ftpFromProfile';
    }

    if (lastChange.source === 'EstimatedFromActivity') {
      return 'eftpFromActivity';
    }

    return null;
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'ride') return activity.type.toLowerCase().includes('ride');
    if (filter === 'run') return activity.type.toLowerCase().includes('run');
    if (filter === 'walk') return activity.type.toLowerCase().includes('walk');
    return true;
  });

  const getActivityIcon = (type: string) => {
    if (type.toLowerCase().includes('ride')) return '🚴';
    if (type.toLowerCase().includes('run')) return '🏃';
    if (type.toLowerCase().includes('walk')) return '🚶';
    return '⚡';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-xl font-semibold text-secondary">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div key={i18n.language} className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-secondary">{t('subtitle')}</p>
      </header>

      {/* Filters – counts from API (all activities), fallback to loaded when counts not available */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            filter === 'all'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface text-secondary ring-1 ring-border-default hover:bg-muted'
          }`}
        >
          {t('all')} ({activities.length})
        </button>
        <button
          onClick={() => setFilter('ride')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            filter === 'ride'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface text-secondary ring-1 ring-border-default hover:bg-muted'
          }`}
        >
          {t('rides')} ({activities.filter(a => a.type.toLowerCase().includes('ride')).length})
        </button>
        <button
          onClick={() => setFilter('run')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            filter === 'run'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface text-secondary ring-1 ring-border-default hover:bg-muted'
          }`}
        >
          {t('runs')} ({activities.filter(a => a.type.toLowerCase().includes('run')).length})
        </button>
        <button
          onClick={() => setFilter('walk')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            filter === 'walk'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface text-secondary ring-1 ring-border-default hover:bg-muted'
          }`}
        >
          {t('walks')} ({activities.filter(a => a.type.toLowerCase().includes('walk')).length})
        </button>
      </div>

      {/* Activities List */}
      {filteredActivities.length > 0 ? (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Link
              key={activity.id}
              to={`/activities/${activity.id}`}
              className="block rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default transition-all hover:shadow-md hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-state-active-bg text-2xl">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold text-primary">{activity.name}</h3>
                    <p className="mb-2 text-sm text-tertiary">
                      {formatDate(activity.startDate, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} • {formatTime(activity.startDate)}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-secondary">{t('distance')}</span>
                        <span className="font-medium text-primary">{((activity.distance ?? 0) / 1000).toFixed(2)} km</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-secondary">{t('time')}</span>
                        <span className="font-medium text-primary">
                          {Math.floor((activity.movingTime ?? 0) / 3600)}h {Math.floor(((activity.movingTime ?? 0) % 3600) / 60)}m
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-secondary">{t('elevation')}</span>
                        <span className="font-medium text-primary">{(activity.totalElevationGain ?? 0).toFixed(0)} m</span>
                      </div>

                      {activity.averageHeartRate && (
                        <div className="flex items-center gap-1">
                          <span className="text-secondary">{t('avgHr')}</span>
                          <span className="font-medium text-state-danger-text">{activity.averageHeartRate.toFixed(0)} bpm</span>
                        </div>
                      )}

                      {activity.averagePower && (
                        <div className="flex items-center gap-1">
                          <span className="text-secondary">{t('avgPower')}</span>
                          <span className="font-medium text-primary">{activity.averagePower.toFixed(0)} W</span>
                        </div>
                      )}

                      {activity.trainingStressScore != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-secondary">{formatTssLabel(activity) ?? 'TSS'}:</span>
                          <span className="font-medium text-accent">{activity.trainingStressScore.toFixed(0)}</span>
                        </div>
                      )}

                      {activity.intensityFactor && (
                        <div className="flex items-center gap-1">
                          <span className="text-secondary">{t('if')}</span>
                          <span className="font-medium text-accent">{activity.intensityFactor.toFixed(2)}</span>
                        </div>
                      )}

                      {activity.ftpUsed != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-secondary">{t('ftp')}</span>
                          <span className="font-medium text-primary">{activity.ftpUsed} W</span>
                          {(() => {
                            const src = getFtpSourceLabel(activity);
                            return src ? (
                              <span className="text-[11px] text-tertiary">({t(src)})</span>
                            ) : null;
                          })()}
                        </div>
                      )}

                      {activity.deviceWatts != null && (
                        <span
                          className={`inline-flex items-center rounded-full border border-border-default px-2 py-0.5 text-xs font-medium ${
                            activity.deviceWatts
                              ? 'bg-muted text-state-active-text'
                              : 'bg-state-danger-bg text-state-danger-text'
                          }`}
                        >
                          {activity.deviceWatts ? t('powerMeter') : t('estimatedOrHr')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-4 text-right">
                  {activity.normalizedPower && (
                    <div className="mb-1">
                      <p className="text-xs text-tertiary">{t('np')}</p>
                      <p className="text-lg font-bold text-accent">{activity.normalizedPower.toFixed(0)} W</p>
                    </div>
                  )}
                  {activity.averageSpeed && (
                    <div>
                      <p className="text-xs text-tertiary">{t('avgSpeed')}</p>
                      <p className="text-sm font-medium text-primary">{activity.averageSpeed.toFixed(1)} km/h</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
          <div ref={sentinelRef} className="h-4" aria-hidden />
          {loadingMore && (
            <p className="py-4 text-center text-sm text-tertiary">{t('loadingMore')}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface p-12 text-center ring-1 ring-border-default">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-primary">{t('noActivities')}</h3>
          <p className="text-tertiary">
            {filter !== 'all' ? t('noMatchFilter') : t('syncStravaToSee')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
