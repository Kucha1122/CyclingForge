import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stravaApi, type ActivityCountsDto } from '../services/api';
import type { ActivityDto } from '../types/activity';

const PER_PAGE = 30;

export const ActivitiesPage = () => {
  useAuth();
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [counts, setCounts] = useState<ActivityCountsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ride' | 'run' | 'walk'>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [activitiesRes, countsRes] = await Promise.all([
          stravaApi.getActivities(1, PER_PAGE),
          stravaApi.getActivityCounts().catch(() => ({ data: null })),
        ]);
        const data = activitiesRes.data;
        setActivities(data);
        setPage(1);
        setHasMore(data.length === PER_PAGE);
        if (countsRes.data) setCounts(countsRes.data);
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
      const response = await stravaApi.getActivities(nextPage, PER_PAGE);
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl font-semibold text-gray-700">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-600">Your complete training history</p>
      </header>

      {/* Filters – counts from API (all activities), fallback to loaded when counts not available */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({counts?.total ?? activities.length})
        </button>
        <button
          onClick={() => setFilter('ride')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'ride'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          Rides ({counts?.ride ?? activities.filter(a => a.type.toLowerCase().includes('ride')).length})
        </button>
        <button
          onClick={() => setFilter('run')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'run'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          Runs ({counts?.run ?? activities.filter(a => a.type.toLowerCase().includes('run')).length})
        </button>
        <button
          onClick={() => setFilter('walk')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'walk'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          Walks ({counts?.walk ?? activities.filter(a => a.type.toLowerCase().includes('walk')).length})
        </button>
      </div>

      {/* Activities List */}
      {filteredActivities.length > 0 ? (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Link
              key={activity.externalId}
              to={`/activities/${activity.externalId}`}
              className="block rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">{activity.name}</h3>
                    <p className="mb-2 text-sm text-gray-500">
                      {new Date(activity.startDate).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })} • {new Date(activity.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium text-gray-900">{((activity.distance ?? 0) / 1000).toFixed(2)} km</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium text-gray-900">
                          {Math.floor((activity.movingTime ?? 0) / 3600)}h {Math.floor(((activity.movingTime ?? 0) % 3600) / 60)}m
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">Elevation:</span>
                        <span className="font-medium text-gray-900">{(activity.totalElevationGain ?? 0).toFixed(0)} m</span>
                      </div>

                      {activity.averagePower && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Avg Power:</span>
                          <span className="font-medium text-gray-900">{activity.averagePower.toFixed(0)} W</span>
                        </div>
                      )}

                      {activity.trainingStressScore && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">TSS:</span>
                          <span className="font-medium text-orange-600">{activity.trainingStressScore.toFixed(0)}</span>
                        </div>
                      )}

                      {activity.intensityFactor && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">IF:</span>
                          <span className="font-medium text-purple-600">{activity.intensityFactor.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-4 text-right">
                  {activity.normalizedPower && (
                    <div className="mb-1">
                      <p className="text-xs text-gray-500">NP</p>
                      <p className="text-lg font-bold text-blue-600">{activity.normalizedPower.toFixed(0)} W</p>
                    </div>
                  )}
                  {activity.averageSpeed && (
                    <div>
                      <p className="text-xs text-gray-500">Avg Speed</p>
                      <p className="text-sm font-medium text-gray-900">{activity.averageSpeed.toFixed(1)} km/h</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
          <div ref={sentinelRef} className="h-4" aria-hidden />
          {loadingMore && (
            <p className="py-4 text-center text-sm text-gray-500">Loading more...</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Activities Found</h3>
          <p className="text-gray-500">
            {filter !== 'all' 
              ? 'No activities match your current filter. Try changing the filter above.'
              : 'Sync with Strava to see your activities here.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
