import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { metricsApi, stravaApi, activitiesApi } from '../services/api';
import type { PmcSummary, WeeklySummary, MonthlySummary } from '../services/api';
import type { AthleteProfileDto } from '../types/strava';
import { PMCChart } from '../components/PMCChart';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { MonthlySummaryCard } from '../components/MonthlySummaryCard';
import { ReadinessCard } from '../components/ReadinessCard';
import { TrendsCard } from '../components/TrendsCard';
import { useNavigate } from 'react-router-dom';

export const NewDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [pmcData, setPmcData] = useState<PmcSummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Strava profile
        try {
          const profileResponse = await stravaApi.getProfile();
          setStravaProfile(profileResponse.data);
        } catch {
          // Ignore error if profile not connected
        }

        // Fetch metrics data
        try {
          const [pmc, weekly, monthly] = await Promise.all([
            metricsApi.getPmcSummary(),
            metricsApi.getWeeklySummary(),
            metricsApi.getMonthlySummary(),
          ]);
          
          setPmcData(pmc.data);
          setWeeklyData(weekly.data);
          setMonthlyData(monthly.data);
        } catch (err) {
          console.error('Failed to fetch metrics', err);
        }
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await stravaApi.sync();
      await activitiesApi.sync();
      
      // Refresh metrics after sync
      const [pmc, weekly, monthly] = await Promise.all([
        metricsApi.getPmcSummary(),
        metricsApi.getWeeklySummary(),
        metricsApi.getMonthlySummary(),
      ]);
      
      setPmcData(pmc.data);
      setWeeklyData(weekly.data);
      setMonthlyData(monthly.data);
      
      alert('Synced successfully!');
    } catch (error) {
      console.error('Sync failed', error);
      alert('Failed to sync activities.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectStrava = () => {
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=172328&response_type=code&redirect_uri=http://localhost:5173/strava/callback&scope=activity:read_all`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.email}</p>
          </div>
          
          {stravaProfile && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Activities'}
            </button>
          )}
        </div>

        {/* Strava Connection Banner */}
        {!stravaProfile && (
          <div className="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-900">Connect Strava to Get Started</h3>
                <p className="text-sm text-orange-700">Sync your activities to see your training metrics and performance data.</p>
              </div>
              <button
                onClick={handleConnectStrava}
                className="rounded-lg bg-[#FC4C02] px-4 py-2 font-medium text-white transition-colors hover:bg-[#e34402]"
              >
                Connect with Strava
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      {stravaProfile ? (
        <div className="space-y-6">
          {/* Top Row - Readiness and Trends */}
          <div className="grid gap-6 lg:grid-cols-2">
            {pmcData && (
              <>
                <ReadinessCard
                  currentTSB={pmcData.currentTSB}
                  formStatus={pmcData.formStatus}
                  recommendation={pmcData.recommendation}
                />
                <TrendsCard
                  currentCTL={pmcData.currentCTL}
                  currentATL={pmcData.currentATL}
                  previousCTL={pmcData.history.length > 7 ? pmcData.history[pmcData.history.length - 8].ctl : undefined}
                  previousATL={pmcData.history.length > 7 ? pmcData.history[pmcData.history.length - 8].atl : undefined}
                />
              </>
            )}
          </div>

          {/* PMC Chart */}
          {pmcData && pmcData.history.length > 0 && (
            <PMCChart data={pmcData.history} />
          )}

          {/* Weekly and Monthly Summaries */}
          <div className="grid gap-6 lg:grid-cols-2">
            {weeklyData && <WeeklySummaryCard {...weeklyData} />}
            {monthlyData && <MonthlySummaryCard {...monthlyData} />}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => navigate('/activities')}
                className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <span className="mb-2 block text-2xl">🚴</span>
                <p className="font-semibold text-blue-900">View Activities</p>
                <p className="text-sm text-blue-700">Browse your training history</p>
              </button>
              
              <button
                onClick={() => navigate('/analysis')}
                className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100"
              >
                <span className="mb-2 block text-2xl">📈</span>
                <p className="font-semibold text-purple-900">Advanced Analysis</p>
                <p className="text-sm text-purple-700">Deep dive into your data</p>
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-left transition-colors hover:bg-green-100"
              >
                <span className="mb-2 block text-2xl">⚙️</span>
                <p className="font-semibold text-green-900">Update Profile</p>
                <p className="text-sm text-green-700">Set your FTP and weight</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Data Yet</h3>
          <p className="text-gray-500">Connect your Strava account to start tracking your training.</p>
        </div>
      )}
    </div>
  );
};

export default NewDashboardPage;
