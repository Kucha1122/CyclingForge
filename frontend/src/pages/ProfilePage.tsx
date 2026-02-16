import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi, stravaApi, type UserProfile } from '../services/api';
import type { AthleteProfileDto } from '../types/strava';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [ftp, setFtp] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [lthr, setLthr] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.userId) {
          const profileResponse = await usersApi.getProfile(user.userId);
          setUserProfile(profileResponse.data);
          
          if (profileResponse.data.functionalThresholdPower) {
            setFtp(profileResponse.data.functionalThresholdPower.toString());
          }
          
          if (profileResponse.data.weightKg) {
            setWeight(profileResponse.data.weightKg.toString());
          }
          if (profileResponse.data.lactateThresholdHeartRate != null) {
            setLthr(profileResponse.data.lactateThresholdHeartRate.toString());
          }
        }

        try {
          const stravaResponse = await stravaApi.getProfile();
          setStravaProfile(stravaResponse.data);
        } catch {
          // Ignore error if Strava not connected
        }
      } catch {
        // Failed to fetch profile
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const ftpValue = ftp ? parseInt(ftp) : null;
      const weightValue = weight ? parseFloat(weight) : null;
      const lthrValue = lthr ? parseInt(lthr) : null;

      if (user?.userId) {
        await usersApi.updateProfile(user.userId, ftpValue, weightValue, lthrValue);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        // Refresh profile data
        const profileResponse = await usersApi.getProfile(user.userId);
        setUserProfile(profileResponse.data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const calculateWattsPerKg = () => {
    const ftpNum = ftp ? parseInt(ftp) : null;
    const weightNum = weight ? parseFloat(weight) : null;
    
    if (ftpNum && weightNum && weightNum > 0) {
      return (ftpNum / weightNum).toFixed(2);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl font-semibold text-gray-700">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your training profile and metrics</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* User Info Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Account Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium text-gray-900">
                  {userProfile?.firstName} {userProfile?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Member Since</p>
                <p className="font-medium text-gray-900">
                  {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Strava Connection Card */}
          {stravaProfile && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Strava Connection</h2>
              <div className="flex items-center gap-3">
                {stravaProfile.profileImageUrl && (
                  <img
                    src={stravaProfile.profileImageUrl}
                    alt="Strava Profile"
                    className="h-16 w-16 rounded-full border-2 border-orange-500"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {stravaProfile.firstName} {stravaProfile.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {stravaProfile.city}, {stravaProfile.country}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <span>●</span> Connected
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle Column - Training Settings */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Training Metrics</h2>

            {message && (
              <div
                className={`mb-6 rounded-lg p-4 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 ring-1 ring-green-200'
                    : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              {/* FTP Input */}
              <div>
                <label htmlFor="ftp" className="mb-1 block text-sm font-medium text-gray-900">
                  Functional Threshold Power (FTP)
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  Your FTP is the maximum power you can sustain for approximately one hour. This is used to calculate training zones and metrics like TSS and IF.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="ftp"
                    value={ftp}
                    onChange={(e) => setFtp(e.target.value)}
                    placeholder="Enter your FTP in watts"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">watts</span>
                </div>
                {!ftp && (
                  <p className="mt-1 text-xs text-orange-600">
                    ⚠️ FTP is required to calculate TSS, IF, and other power-based metrics
                  </p>
                )}
              </div>

              {/* Weight Input */}
              <div>
                <label htmlFor="weight" className="mb-1 block text-sm font-medium text-gray-900">
                  Body Weight
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  Your weight is used to calculate power-to-weight ratio and other performance metrics.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter your weight"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">kg</span>
                </div>
              </div>

              {/* LTHR Input */}
              <div>
                <label htmlFor="lthr" className="mb-1 block text-sm font-medium text-gray-900">
                  Lactate Threshold Heart Rate (LTHR)
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  Used to estimate TSS for activities without power data (e.g. heart rate only). Leave blank if you only use power.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="lthr"
                    value={lthr}
                    onChange={(e) => setLthr(e.target.value)}
                    placeholder="e.g. 165"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="250"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">bpm</span>
                </div>
              </div>

              {/* Calculated Metrics */}
              {calculateWattsPerKg() && (
                <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                  <p className="mb-1 text-sm font-medium text-blue-900">Power-to-Weight Ratio</p>
                  <p className="text-3xl font-bold text-blue-700">{calculateWattsPerKg()} W/kg</p>
                  <p className="mt-2 text-xs text-blue-700">
                    {parseFloat(calculateWattsPerKg()!) > 4.5
                      ? 'Excellent - Professional level'
                      : parseFloat(calculateWattsPerKg()!) > 3.5
                      ? 'Very Good - Competitive amateur'
                      : parseFloat(calculateWattsPerKg()!) > 2.5
                      ? 'Good - Recreational racer'
                      : 'Building fitness'}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          {/* Info Card */}
          <div className="mt-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 p-6 ring-1 ring-purple-200">
            <h3 className="mb-2 font-semibold text-purple-900">💡 Pro Tip</h3>
            <p className="text-sm text-purple-800">
              To get an accurate FTP value, perform a 20-minute maximum effort test and use 95% of your average power. 
              Alternatively, use a ramp test or get a lab test for the most accurate results. Update your FTP every 4-6 weeks as your fitness improves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
