import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { metricsApi, stravaApi, activitiesApi, garminApi } from '../services/api';
import type { PmcSummary, WeeklySummary, MonthlySummary, DailyTssPoint } from '../services/api';
import type { AthleteProfileDto } from '../types/strava';
import type { SleepDataDto, WellnessDataDto, GarminStatusDto, HrvDataDto } from '../types/garmin';
import { PMCChart } from '../components/PMCChart';
import { DailyTssChart } from '../components/DailyTssChart';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { MonthlySummaryCard } from '../components/MonthlySummaryCard';
import { ReadinessCard } from '../components/ReadinessCard';
import { TrendsCard } from '../components/TrendsCard';
import { SleepSummaryCard } from '../components/garmin/SleepSummaryCard';
import { TrainingReadinessCard } from '../components/garmin/TrainingReadinessCard';
import { WellnessStatsRow } from '../components/garmin/WellnessStatsRow';
import { WeeklyZonesCard } from '../components/WeeklyZonesCard';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { recommendationsApi } from '../services/api';
import type { DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';

const CATEGORY_I18N_KEYS: Record<string, string> = {
  Recovery: 'categoryRecovery', Endurance: 'categoryEndurance', Tempo: 'categoryTempo',
  SweetSpot: 'categorySweetSpot', Threshold: 'categoryThreshold', VO2Max: 'categoryVO2Max',
  Anaerobic: 'categoryAnaerobic', Sprint: 'categorySprint', Mixed: 'categoryMixed',
};
import { ReadinessGauge } from '../components/workouts/ReadinessGauge';

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStartForOffset(offset: number): string {
  const now = new Date();
  const weekStart = getStartOfWeek(now);
  weekStart.setDate(weekStart.getDate() + offset * 7);
  return weekStart.toISOString().slice(0, 10);
}

function getYearMonthForOffset(offset: number): { year: number; month: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export const NewDashboardPage = () => {
  const { user } = useAuth();
  const { syncVersion, notifySynced } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const tCommon = useTranslation('common').t;
  const tWorkouts = useTranslation('workouts').t;
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [pmcData, setPmcData] = useState<PmcSummary | null>(null);
  const [dailyTssData, setDailyTssData] = useState<DailyTssPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [pmcCtlDays, setPmcCtlDays] = useState(42);
  const [pmcAtlDays, setPmcAtlDays] = useState(7);
  const [garminStatus, setGarminStatus] = useState<GarminStatusDto | null>(null);
  const [lastSleep, setLastSleep] = useState<SleepDataDto | null>(null);
  const [todayWellness, setTodayWellness] = useState<WellnessDataDto | null>(null);
  const [todayHrv, setTodayHrv] = useState<HrvDataDto | null>(null);
  const [weeklyZones, setWeeklyZones] = useState<number[] | null>(null);
  const [todayRecommendation, setTodayRecommendation] = useState<DailyRecommendationDto | null>(null);
  const [pmcHistoryDays, setPmcHistoryDays] = useState(() => {
    const stored = localStorage.getItem('pmcHistoryDays');
    return stored ? Number(stored) : 365;
  });

  const fetchSummaries = useCallback(async (weekOffset: number, monthOffset: number) => {
    const weekStart = getWeekStartForOffset(weekOffset);
    const { year, month } = getYearMonthForOffset(monthOffset);
    const [weekly, monthlyResult] = await Promise.all([
      metricsApi.getWeeklySummary(weekStart),
      metricsApi.getMonthlySummary(year, month),
    ]);
    setWeeklyData(weekly.data);
    setMonthlyData(monthlyResult.data);
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const [pmc, dailyTss] = await Promise.all([
        metricsApi.getPmcSummary(pmcCtlDays, pmcAtlDays, pmcHistoryDays),
        metricsApi.getDailyTss(30),
      ]);
      setPmcData(pmc.data);
      setDailyTssData(dailyTss.data);
    } catch {
      // Failed to fetch metrics
    }
  }, [pmcCtlDays, pmcAtlDays, pmcHistoryDays]);

  const refreshWellness = useCallback(async () => {
    try {
      const status = await garminApi.getStatus();
      setGarminStatus(status.data);
      if (!status.data.isConnected) return;

      const today = new Date().toISOString().slice(0, 10);
      const sleepFrom = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const hrvFrom = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
      const [sleepRes, wellnessRes, hrvRes] = await Promise.all([
        garminApi.getSleepData(sleepFrom, today),
        garminApi.getLatestWellness().catch(() => null),
        garminApi.getHrvData(hrvFrom, today).catch(() => null),
      ]);
      if (sleepRes.data.length > 0) setLastSleep(sleepRes.data[0]);
      if (wellnessRes?.data) setTodayWellness(wellnessRes.data);
      if (hrvRes?.data?.length) {
        const latestHrv = [...hrvRes.data]
          .sort((a, b) => b.date.localeCompare(a.date))
          .find((h) => h.lastNightAvgMs != null) ?? null;
        setTodayHrv(latestHrv);
      }
    } catch {
      // Garmin data not available
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const res = await activitiesApi.getRealizedWeek();
      setWeeklyZones(res.data.weeklyHrZoneSeconds);
    } catch {
      // Zone data not available
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Strava profile
        try {
          const profileResponse = await stravaApi.getProfile();
          setStravaProfile(profileResponse.data);
        } catch {
          // Ignore error if profile not connected
        }

        await Promise.all([refreshWellness(), fetchZones()]);

        await fetchMetrics();

        try {
          const recoRes = await recommendationsApi.getToday();
          if (recoRes.data && !('message' in (recoRes.data as object))) {
            setTodayRecommendation(recoRes.data as DailyRecommendationDto);
          }
        } catch {
          // Recommendations not available
        }
      } catch {
        // Error fetching dashboard data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.pathname, pmcCtlDays, pmcAtlDays, pmcHistoryDays, syncVersion, fetchMetrics, refreshWellness, fetchZones]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/dashboard') {
        fetchMetrics();
        refreshWellness();
        fetchZones();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [location.pathname, fetchMetrics, refreshWellness, fetchZones]);

  useEffect(() => {
    localStorage.setItem('pmcHistoryDays', String(pmcHistoryDays));
  }, [pmcHistoryDays]);

  useEffect(() => {
    if (!stravaProfile) return;
    fetchSummaries(selectedWeekOffset, selectedMonthOffset).catch(() => {
      // Ignore fetch errors when navigating
    });
  }, [selectedWeekOffset, selectedMonthOffset, stravaProfile, fetchSummaries]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await stravaApi.sync(false);
      await activitiesApi.sync(true);
      if (garminStatus?.isConnected) {
        await garminApi.sync().catch(() => null);
      }
      await fetchMetrics();
      await fetchSummaries(selectedWeekOffset, selectedMonthOffset);
      await Promise.all([refreshWellness(), fetchZones()]);
      // Powiadom pozostałe strony (analiza, sen…), żeby odświeżyły swoje dane.
      notifySynced();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectStrava = () => {
    const redirectUri = `${window.location.origin}/strava/callback`;
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=172328&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=read,activity:read_all,profile:read_all`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-xl font-semibold text-secondary">{t('loadingDashboard')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
            <p className="text-secondary">{t('welcomeBack', { email: user?.email ?? '' })}</p>
          </div>
          
          {stravaProfile && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {syncing ? tCommon('syncing') : t('syncActivities')}
            </button>
          )}
        </div>

        {/* Strava Connection Banner */}
        {!stravaProfile && (
          <div className="rounded-lg bg-muted p-4 ring-1 ring-border-default">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary">{t('connectStravaTitle')}</h3>
                <p className="text-sm text-secondary">{t('connectStravaDesc')}</p>
              </div>
              <button
                onClick={handleConnectStrava}
                className="rounded-lg bg-[#FC4C02] px-4 py-2 font-medium text-white transition-colors hover:bg-[#e34402] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('connectWithStrava')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      {stravaProfile ? (
        <div className="space-y-6">
          {/* Garmin Wellness Row */}
          {garminStatus?.isConnected && (lastSleep || todayWellness) && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <SleepSummaryCard sleep={lastSleep} />
                <TrainingReadinessCard wellness={todayWellness} />
              </div>
              <WellnessStatsRow wellness={todayWellness} hrv={todayHrv} />
            </div>
          )}

          {/* Weekly time-in-zones */}
          {weeklyZones && weeklyZones.some((s) => s > 0) && (
            <WeeklyZonesCard weeklyHrZoneSeconds={weeklyZones} />
          )}

          {/* Garmin Connect Prompt */}
          {!garminStatus?.isConnected && (
            <div className="rounded-lg bg-state-active-bg p-4 ring-1 ring-border-default">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-state-active-text">{t('connectGarminTitle')}</h3>
                  <p className="text-sm text-secondary">{t('connectGarminDesc')}</p>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="rounded-lg bg-[#007CC3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006AAF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('connectGarmin')}
                </button>
              </div>
            </div>
          )}

          {/* Today's Workout Card */}
          {todayRecommendation && (
            <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <ReadinessGauge score={todayRecommendation.readinessScore} size="sm" />
                  <p className="mt-1 text-center text-[10px] font-medium text-tertiary">{t('compositeReadiness')}</p>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-primary">{t('todaysWorkout')}</h2>
                  {todayRecommendation.recommendationType === 'RestDay' ? (
                    <p className="text-secondary">{t('restDayRecommended')}</p>
                  ) : todayRecommendation.recommendationType === 'AlternativeActivity' ? (
                    <p className="text-secondary">{t('considerLightWalk')}</p>
                  ) : todayRecommendation.recommendedWorkout ? (
                    <div className="mt-1">
                      <p className="font-medium text-primary">{todayRecommendation.recommendedWorkout.name}</p>
                      <div className="mt-1 flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[todayRecommendation.recommendedWorkout.category] || 'bg-muted text-primary'}`}>
                          {tWorkouts(CATEGORY_I18N_KEYS[todayRecommendation.recommendedWorkout.category] ?? 'categoryMixed')}
                        </span>
                        <span className="text-xs text-tertiary">
                          {todayRecommendation.recommendedWorkout.durationMinutes} {tCommon('min')} / TSS {todayRecommendation.recommendedWorkout.estimatedTSS}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
                <Link to="/workout/today"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {tCommon('viewDetails')}
                </Link>
              </div>
            </div>
          )}

          {/* Top Row - Readiness and Trends */}
          <div className="grid gap-6 lg:grid-cols-2">
            {pmcData && (
              <>
                <ReadinessCard
                  currentTSB={pmcData.currentTSB}
                  formStatus={pmcData.formStatus}
                  recommendation={pmcData.recommendation}
                  rampRateCtlPerWeek={pmcData.rampRateCtlPerWeek}
                />
                <TrendsCard
                  currentCTL={pmcData.currentCTL}
                  currentATL={pmcData.currentATL}
                  currentWeekAvgCtl={pmcData.currentWeekAvgCtl}
                  currentWeekAvgAtl={pmcData.currentWeekAvgAtl}
                  previousWeekAvgCtl={pmcData.previousWeekAvgCtl}
                  previousWeekAvgAtl={pmcData.previousWeekAvgAtl}
                />
              </>
            )}
          </div>

          {/* PMC Chart */}
          {pmcData && pmcData.history.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary">{t('rangeLabel')}</span>
                    <select
                      value={pmcHistoryDays}
                      onChange={(e) => setPmcHistoryDays(Number(e.target.value))}
                      className="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value={7}>{t('days7')}</option>
                      <option value={30}>{t('days30')}</option>
                      <option value={42}>{t('days42')}</option>
                      <option value={90}>{t('days90')}</option>
                      <option value={180}>{t('days180')}</option>
                      <option value={365}>{t('year')}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary">{t('ctlAtlConstants')}</span>
                    <select
                      value={`${pmcCtlDays}/${pmcAtlDays}`}
                      onChange={(e) => {
                        const [ctl, atl] = e.target.value.split('/').map(Number);
                        setPmcCtlDays(ctl);
                        setPmcAtlDays(atl);
                      }}
                      className="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="42/7">{t('days42_7')}</option>
                      <option value="42/14">{t('days42_14')}</option>
                      <option value="30/7">{t('days30_7')}</option>
                      <option value="25/7">{t('days25_7')}</option>
                    </select>
                  </div>
                </div>
              </div>
              <PMCChart chartId="dashboard" data={pmcData.history} ftpChanges={pmcData.ftpChanges} ctlDays={pmcCtlDays} atlDays={pmcAtlDays} />
            </div>
          )}

          {/* Ramp rate */}
          {pmcData && pmcData.rampRateCtlPerWeek != null && (
            <div
              className={`rounded-xl p-4 shadow-sm ring-1 ${
                pmcData.rampRateCtlPerWeek > 7
                  ? 'bg-state-danger-bg ring-border-default'
                  : 'bg-surface ring-border-default'
              }`}
            >
              <p className="text-sm font-medium text-primary">
                {t('rampRate')} <span className="font-semibold">{pmcData.rampRateCtlPerWeek >= 0 ? '+' : ''}{pmcData.rampRateCtlPerWeek.toFixed(1)}</span> {t('ctlPerWeek')}
              </p>
              {pmcData.rampRateCtlPerWeek > 7 && (
                <p className="mt-1 text-xs text-state-danger-text">{t('loadRisingQuickly')}</p>
              )}
            </div>
          )}

          {/* Daily TSS */}
          {dailyTssData.length > 0 && (
            <DailyTssChart data={dailyTssData} days={30} />
          )}

          {/* Weekly and Monthly Summaries */}
          <div className="grid gap-6 lg:grid-cols-2">
            {weeklyData && (
              <WeeklySummaryCard
                {...weeklyData}
                isCurrentWeek={selectedWeekOffset === 0}
                onPrevWeek={() => setSelectedWeekOffset((o) => o - 1)}
                onNextWeek={() => setSelectedWeekOffset((o) => Math.min(0, o + 1))}
                canGoNext={selectedWeekOffset < 0}
              />
            )}
            {monthlyData && (
              <MonthlySummaryCard
                {...monthlyData}
                isCurrentMonth={selectedMonthOffset === 0}
                onPrevMonth={() => setSelectedMonthOffset((o) => o - 1)}
                onNextMonth={() => setSelectedMonthOffset((o) => Math.min(0, o + 1))}
                canGoNext={selectedMonthOffset < 0}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('quickActions')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => navigate('/activities')}
                className="rounded-lg border-2 border-border-default bg-muted p-4 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="mb-2 block text-2xl">🚴</span>
                <p className="font-semibold text-primary">{t('viewActivities')}</p>
                <p className="text-sm text-secondary">{t('browseHistory')}</p>
              </button>
              
              <button
                onClick={() => navigate('/analysis')}
                className="rounded-lg border-2 border-border-default bg-muted p-4 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="mb-2 block text-2xl">📈</span>
                <p className="font-semibold text-primary">{t('advancedAnalysis')}</p>
                <p className="text-sm text-secondary">{t('deepDive')}</p>
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="rounded-lg border-2 border-border-default bg-muted p-4 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="mb-2 block text-2xl">⚙️</span>
                <p className="font-semibold text-primary">{t('updateProfile')}</p>
                <p className="text-sm text-secondary">{t('setFtpWeight')}</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-primary">{t('noDataYet')}</h3>
          <p className="text-tertiary">{t('connectStravaToStart')}</p>
        </div>
      )}
    </div>
  );
};

export default NewDashboardPage;
