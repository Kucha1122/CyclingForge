import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { metricsApi, stravaApi, activitiesApi, garminApi } from '../services/api';
import type { PmcSummary, WeeklySummary, MonthlySummary, DailyTssPoint } from '../services/api';
import type { AthleteProfileDto } from '../types/strava';
import type { SleepDataDto, WellnessDataDto, GarminStatusDto } from '../types/garmin';
import { PMCChart } from '../components/PMCChart';
import { DailyTssChart } from '../components/DailyTssChart';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { MonthlySummaryCard } from '../components/MonthlySummaryCard';
import { ReadinessCard } from '../components/ReadinessCard';
import { TrendsCard } from '../components/TrendsCard';
import { SleepSummaryCard } from '../components/garmin/SleepSummaryCard';
import { TrainingReadinessCard } from '../components/garmin/TrainingReadinessCard';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { recommendationsApi } from '../services/api';
import type { DailyRecommendationDto } from '../types/workout';
import { CATEGORY_COLORS } from '../types/workout';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const tCommon = useTranslation('common').t;
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

        try {
          const garminStatusRes = await garminApi.getStatus();
          setGarminStatus(garminStatusRes.data);
          if (garminStatusRes.data.isConnected) {
            const today = new Date().toISOString().slice(0, 10);
            const weekAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
            const [sleepRes, wellnessRes] = await Promise.all([
              garminApi.getSleepData(weekAgo, today),
              garminApi.getWellness(today).catch(() => null),
            ]);
            if (sleepRes.data.length > 0) {
              setLastSleep(sleepRes.data[0]);
            }
            if (wellnessRes?.data) {
              setTodayWellness(wellnessRes.data);
            }
          }
        } catch {
          // Garmin data not available
        }

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
  }, [location.pathname, pmcCtlDays, pmcAtlDays, pmcHistoryDays, fetchMetrics]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/dashboard') {
        fetchMetrics();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [location.pathname, fetchMetrics]);

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
      await fetchMetrics();
      await fetchSummaries(selectedWeekOffset, selectedMonthOffset);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">{t('loadingDashboard')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600">{t('welcomeBack', { email: user?.email ?? '' })}</p>
          </div>
          
          {stravaProfile && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
            >
              {syncing ? tCommon('syncing') : t('syncActivities')}
            </button>
          )}
        </div>

        {/* Strava Connection Banner */}
        {!stravaProfile && (
          <div className="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-900">{t('connectStravaTitle')}</h3>
                <p className="text-sm text-orange-700">{t('connectStravaDesc')}</p>
              </div>
              <button
                onClick={handleConnectStrava}
                className="rounded-lg bg-[#FC4C02] px-4 py-2 font-medium text-white transition-colors hover:bg-[#e34402]"
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
            <div className="grid gap-6 md:grid-cols-2">
              <SleepSummaryCard sleep={lastSleep} />
              <TrainingReadinessCard wellness={todayWellness} />
            </div>
          )}

          {/* Garmin Connect Prompt */}
          {!garminStatus?.isConnected && (
            <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{t('connectGarminTitle')}</h3>
                  <p className="text-sm text-blue-700">{t('connectGarminDesc')}</p>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="rounded-lg bg-[#007CC3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006AAF]"
                >
                  {t('connectGarmin')}
                </button>
              </div>
            </div>
          )}

          {/* Today's Workout Card */}
          {todayRecommendation && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center gap-6">
                <ReadinessGauge score={todayRecommendation.readinessScore} size="sm" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{t('todaysWorkout')}</h2>
                  {todayRecommendation.recommendationType === 'RestDay' ? (
                    <p className="text-gray-600">{t('restDayRecommended')}</p>
                  ) : todayRecommendation.recommendationType === 'AlternativeActivity' ? (
                    <p className="text-gray-600">{t('considerLightWalk')}</p>
                  ) : todayRecommendation.recommendedWorkout ? (
                    <div className="mt-1">
                      <p className="font-medium text-gray-900">{todayRecommendation.recommendedWorkout.name}</p>
                      <div className="mt-1 flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[todayRecommendation.recommendedWorkout.category] || 'bg-gray-100 text-gray-800'}`}>
                          {todayRecommendation.recommendedWorkout.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {todayRecommendation.recommendedWorkout.durationMinutes} {tCommon('min')} / TSS {todayRecommendation.recommendedWorkout.estimatedTSS}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
                <Link to="/workout/today"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
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
                    <span className="text-sm text-gray-600">{t('rangeLabel')}</span>
                    <select
                      value={pmcHistoryDays}
                      onChange={(e) => setPmcHistoryDays(Number(e.target.value))}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    <span className="text-sm text-gray-600">{t('ctlAtlConstants')}</span>
                    <select
                      value={`${pmcCtlDays}/${pmcAtlDays}`}
                      onChange={(e) => {
                        const [ctl, atl] = e.target.value.split('/').map(Number);
                        setPmcCtlDays(ctl);
                        setPmcAtlDays(atl);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  ? 'bg-amber-50 ring-amber-200'
                  : 'bg-white ring-gray-200'
              }`}
            >
              <p className="text-sm font-medium text-gray-700">
                {t('rampRate')} <span className="font-semibold">{pmcData.rampRateCtlPerWeek >= 0 ? '+' : ''}{pmcData.rampRateCtlPerWeek.toFixed(1)}</span> {t('ctlPerWeek')}
              </p>
              {pmcData.rampRateCtlPerWeek > 7 && (
                <p className="mt-1 text-xs text-amber-800">{t('loadRisingQuickly')}</p>
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
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('quickActions')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => navigate('/activities')}
                className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <span className="mb-2 block text-2xl">🚴</span>
                <p className="font-semibold text-blue-900">{t('viewActivities')}</p>
                <p className="text-sm text-blue-700">{t('browseHistory')}</p>
              </button>
              
              <button
                onClick={() => navigate('/analysis')}
                className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100"
              >
                <span className="mb-2 block text-2xl">📈</span>
                <p className="font-semibold text-purple-900">{t('advancedAnalysis')}</p>
                <p className="text-sm text-purple-700">{t('deepDive')}</p>
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-left transition-colors hover:bg-green-100"
              >
                <span className="mb-2 block text-2xl">⚙️</span>
                <p className="font-semibold text-green-900">{t('updateProfile')}</p>
                <p className="text-sm text-green-700">{t('setFtpWeight')}</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t('noDataYet')}</h3>
          <p className="text-gray-500">{t('connectStravaToStart')}</p>
        </div>
      )}
    </div>
  );
};

export default NewDashboardPage;
