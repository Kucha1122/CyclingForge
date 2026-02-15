import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { stravaApi, activitiesApi } from '../services/api';
import type { UserDto } from '../types/user';
import type { AthleteProfileDto } from '../types/strava';
import type { ActivityDto } from '../types/activity';
import { useNavigate, Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [userDetails, setUserDetails] = useState<UserDto | null>(null);
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Strava profile
        try {
          const profileResponse = await stravaApi.getProfile();
          setStravaProfile(profileResponse.data);
        } catch {
          // Ignore error if profile not found (not connected)
        }

        // Fetch activities
        try {
          const activitiesResponse = await stravaApi.getActivities();
          setActivities(activitiesResponse.data);
        } catch {
          // Failed to fetch activities
        }

      } catch {
        // Error fetching dashboard data
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
      const activitiesResponse = await stravaApi.getActivities();
      setActivities(activitiesResponse.data);
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleConnectStrava = () => {
    const redirectUri = `${window.location.origin}/strava/callback`;
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=172328&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all`;
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
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout
        </button>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Profile & Strava Status */}
        <div className="space-y-8">
          {/* User Profile Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Your Profile</h2>
            <div className="space-y-3 text-sm text-gray-700">
               <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-medium">Email</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="font-medium">User ID</span>
                <span className="font-mono text-xs">{user?.userId}</span>
              </div>
            </div>
          </div>

          {/* Strava Connection Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Strava Connection</h2>
            {stravaProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {stravaProfile.profileImageUrl ? (
                    <img
                      src={stravaProfile.profileImageUrl}
                      alt="Strava Profile"
                      className="h-16 w-16 rounded-full border-2 border-orange-500"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <span className="text-xl font-bold">S</span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900">
                      {stravaProfile.firstName} {stravaProfile.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {stravaProfile.city}, {stravaProfile.country}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
                  ✓ Connected to Strava
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync Activities'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4 text-sm text-gray-600">
                  Connect your Strava account to sync your activities.
                </p>
                <button
                  onClick={handleConnectStrava}
                  className="w-full rounded-lg bg-[#FC4C02] px-4 py-2 font-medium text-white transition-colors hover:bg-[#e34402]"
                >
                  Connect with Strava
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="md:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {activities.length} Activities
              </span>
            </div>

            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Link
                    to={`/activities/${activity.externalId}`}
                    key={activity.externalId}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        {activity.type === 'Ride' ? '🚴' : activity.type === 'Run' ? '🏃' : '⚡'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{activity.name}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.startDate).toLocaleDateString()} • {new Date(activity.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{(activity.distance / 1000).toFixed(2)} km</p>
                      <p className="text-xs text-gray-500">
                        {Math.floor(activity.movingTime / 3600)}h {Math.floor((activity.movingTime % 3600) / 60)}m
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 text-4xl">📭</div>
                <h3 className="text-lg font-medium text-gray-900">No activities found</h3>
                <p className="text-gray-500">Sync with Strava to see your recent rides and runs.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
