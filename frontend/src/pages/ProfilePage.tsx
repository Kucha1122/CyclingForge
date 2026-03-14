import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usersApi, stravaApi, garminApi, type UserProfile } from '../services/api';
import type { AthleteProfileDto, AthleteZonesDto } from '../types/strava';
import type { GarminStatusDto } from '../types/garmin';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/format';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('profile');
  const tCommon = useTranslation('common').t;
  useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stravaProfile, setStravaProfile] = useState<AthleteProfileDto | null>(null);
  const [zones, setZones] = useState<AthleteZonesDto | null>(null);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [garminStatus, setGarminStatus] = useState<GarminStatusDto | null>(null);
  const [garminDisconnecting, setGarminDisconnecting] = useState(false);
  const [ftp, setFtp] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [lthr, setLthr] = useState<string>('');
  const [maxHeartRate, setMaxHeartRate] = useState<string>('');
  const [restingHeartRate, setRestingHeartRate] = useState<string>('');
  const [gender, setGender] = useState<string>('male');
  const [eftpMinMinutes, setEftpMinMinutes] = useState<number>(5);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConnectStrava = () => {
    const redirectUri = `${window.location.origin}/strava/callback`;
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=172328&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=read,activity:read_all,profile:read_all`;
  };

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
          if (profileResponse.data.maxHeartRate != null) {
            setMaxHeartRate(profileResponse.data.maxHeartRate.toString());
          }
          if (profileResponse.data.restingHeartRate != null) {
            setRestingHeartRate(profileResponse.data.restingHeartRate.toString());
          }
          if (profileResponse.data.gender) {
            setGender(profileResponse.data.gender);
          }
          const eftpSec = profileResponse.data.eftpMinDurationSeconds;
          setEftpMinMinutes(typeof eftpSec === 'number' ? Math.round(eftpSec / 60) : 5);
        }

        try {
          const garminStatusResponse = await garminApi.getStatus();
          setGarminStatus(garminStatusResponse.data);
        } catch {
          // ignore
        }

        try {
          const stravaResponse = await stravaApi.getProfile();
          setStravaProfile(stravaResponse.data);

          // Try to load zones only if Strava profile is available
          setZonesLoading(true);
          setZonesError(null);
          try {
            const zonesResponse = await stravaApi.getZones();
            setZones(zonesResponse.data);
          } catch {
            // Ignore if zones are not available or endpoint returns 404
            setZones(null);
            setZonesError(null);
          } finally {
            setZonesLoading(false);
          }
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
      const maxHrValue = maxHeartRate ? parseInt(maxHeartRate) : null;
      const restingHrValue = restingHeartRate ? parseInt(restingHeartRate) : null;
      const eftpSec = eftpMinMinutes >= 3 && eftpMinMinutes <= 30 ? eftpMinMinutes * 60 : 300;

      if (user?.userId) {
        await usersApi.updateProfile(user.userId, {
          ftp: ftpValue,
          weightKg: weightValue,
          lthr: lthrValue,
          maxHeartRate: maxHrValue,
          restingHeartRate: restingHrValue,
          gender: gender || null,
          eftpMinDurationSeconds: eftpSec,
        });
        setMessage({ type: 'success', text: t('profileUpdated') });
        
        // Refresh profile data
        const profileResponse = await usersApi.getProfile(user.userId);
        setUserProfile(profileResponse.data);
      }
    } catch {
      setMessage({ type: 'error', text: t('profileUpdateFailed') });
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
        <p className="text-xl font-semibold text-gray-700">{t('loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* User Info Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('accountInfo')}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">{t('email')}</p>
                <p className="font-medium text-gray-900">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-gray-600">{t('name')}</p>
                <p className="font-medium text-gray-900">
                  {userProfile?.firstName} {userProfile?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">{t('memberSince')}</p>
                <p className="font-medium text-gray-900">
                  {userProfile?.createdAt ? formatDate(userProfile.createdAt) : tCommon('nA')}
                </p>
              </div>
            </div>
          </div>

          {/* Strava Connection Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('stravaConnection')}</h2>
            {stravaProfile ? (
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
                    <span>●</span> {t('connected')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-red-600">{t('stravaAccountDisconnected')}</span>
                </p>
                <button
                  onClick={handleConnectStrava}
                  className="inline-flex items-center justify-center rounded-lg bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e34402]"
                >
                  {t('connectWithStrava')}
                </button>
              </div>
            )}
          </div>

          {/* Garmin Connect Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('garminConnect')}</h2>
            {garminStatus?.isConnected ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <span>●</span> {t('connected')}
                  </div>
                  {garminStatus.connectedAt && (
                    <span className="text-xs text-gray-500">
                      {t('connectedSince')} {formatDate(garminStatus.connectedAt)}
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setGarminDisconnecting(true);
                    try {
                      await garminApi.disconnect();
                      setGarminStatus({ isConnected: false, connectedAt: null });
                    } catch {
                      // ignore
                    } finally {
                      setGarminDisconnecting(false);
                    }
                  }}
                  disabled={garminDisconnecting}
                  className="inline-flex items-center justify-center rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  {garminDisconnecting ? t('disconnecting') : t('disconnect')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  {t('connectGarminHint')}
                </p>
                <button
                  onClick={async () => {
                    try {
                      const res = await garminApi.getAuthorizeUrl();
                      window.location.href = res.data.authorizeUrl;
                    } catch {
                      // ignore
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-[#007CC3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006AAF]"
                >
                  {t('connectWithGarmin')}
                </button>
              </div>
            )}
          </div>

          {/* Strava Training Zones Card */}
          {stravaProfile && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{t('trainingZones')}</h2>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {t('fromStrava')}
                </span>
              </div>

              {zonesLoading && (
                <div className="space-y-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-3 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              )}

              {!zonesLoading && !zones && !zonesError && (
                <p className="text-sm text-gray-600">
                  {t('stravaNoZones')}
                </p>
              )}

              {zonesError && (
                <p className="text-sm text-red-600">
                  {t('failedToLoadZones')}
                </p>
              )}

              {zones && (
                <div className="mt-2 space-y-6">
                  {/* Heart Rate Zones */}
                  {zones.heartRateZones.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">{t('heartRateZones')}</h3>
                        <p className="text-xs text-gray-500">
                          {t('zonesCountBpm', { count: zones.heartRateZones.length })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {zones.heartRateZones.map((z, index) => (
                          <div
                            key={`hr-zone-${index}`}
                            className="overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100"
                          >
                            <div
                              className={[
                                'flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-900',
                                index === 0
                                  ? 'bg-blue-100'
                                  : index === 1
                                  ? 'bg-green-100'
                                  : index === 2
                                  ? 'bg-yellow-100'
                                  : index === 3
                                  ? 'bg-orange-100'
                                  : 'bg-red-100',
                              ].join(' ')}
                            >
                              <span className="uppercase">
                                HR Z{index + 1}
                              </span>
                              <span className="tabular-nums">
                                {z.min}–{z.max} bpm
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Power Zones */}
                  {zones.powerZones.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">{t('powerZones')}</h3>
                        <p className="text-xs text-gray-500">
                          {t('zonesCountWatts', { count: zones.powerZones.length })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {zones.powerZones.map((z, index) => (
                          <div
                            key={`power-zone-${index}`}
                            className="overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100"
                          >
                            <div
                              className={[
                                'flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-900',
                                index === 0
                                  ? 'bg-blue-100'
                                  : index === 1
                                  ? 'bg-green-100'
                                  : index === 2
                                  ? 'bg-yellow-100'
                                  : index === 3
                                  ? 'bg-orange-100'
                                  : 'bg-red-100',
                              ].join(' ')}
                            >
                              <span className="uppercase">
                                PWR Z{index + 1}
                              </span>
                              <span className="tabular-nums">
                                {z.min}–{z.max} W
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle Column - Training Settings */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('trainingMetrics')}</h2>

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
                  {t('ftpLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('ftpHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="ftp"
                    value={ftp}
                    onChange={(e) => setFtp(e.target.value)}
                    placeholder={t('placeholderFtp')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('watts')}</span>
                </div>
                {!ftp && (
                  <p className="mt-1 text-xs text-orange-600">
                    ⚠️ {t('ftpRequiredWarning')}
                  </p>
                )}
              </div>

              {/* eFTP min duration */}
              <div>
                <label htmlFor="eftpMinMinutes" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('eftpMinLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('eftpMinHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="eftpMinMinutes"
                    value={eftpMinMinutes}
                    onChange={(e) => setEftpMinMinutes(Math.min(30, Math.max(3, parseInt(e.target.value, 10) || 5)))}
                    min={3}
                    max={30}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('min')}</span>
                </div>
              </div>

              {/* Weight Input */}
              <div>
                <label htmlFor="weight" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('weightLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('weightHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={t('placeholderWeight')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('kg')}</span>
                </div>
              </div>

              {/* LTHR Input */}
              <div>
                <label htmlFor="lthr" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('lthrLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('lthrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="lthr"
                    value={lthr}
                    onChange={(e) => setLthr(e.target.value)}
                    placeholder={t('placeholderBpm')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="250"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('bpm')}</span>
                </div>
              </div>

              {/* Max HR */}
              <div>
                <label htmlFor="maxHeartRate" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('maxHrLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('maxHrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="maxHeartRate"
                    value={maxHeartRate}
                    onChange={(e) => setMaxHeartRate(e.target.value)}
                    placeholder={t('placeholderMaxHr')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="250"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('bpm')}</span>
                </div>
              </div>

              {/* Resting HR */}
              <div>
                <label htmlFor="restingHeartRate" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('restingHrLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('restingHrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="restingHeartRate"
                    value={restingHeartRate}
                    onChange={(e) => setRestingHeartRate(e.target.value)}
                    placeholder={t('placeholderRestingHr')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="120"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t('bpm')}</span>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium text-gray-900">
                  {t('genderLabel')}
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  {t('genderHint')}
                </p>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                </select>
              </div>

              {/* Calculated Metrics */}
              {calculateWattsPerKg() && (
                <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                  <p className="mb-1 text-sm font-medium text-blue-900">{t('powerToWeight')}</p>
                  <p className="text-3xl font-bold text-blue-700">{calculateWattsPerKg()} W/kg</p>
                  <p className="mt-2 text-xs text-blue-700">
                    {parseFloat(calculateWattsPerKg()!) > 4.5
                      ? t('pwrExcellent')
                      : parseFloat(calculateWattsPerKg()!) > 3.5
                      ? t('pwrVeryGood')
                      : parseFloat(calculateWattsPerKg()!) > 2.5
                      ? t('pwrGood')
                      : t('pwrBuilding')}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t('saving') : t('saveProfile')}
              </button>
            </div>
          </form>

          {/* Info Card */}
          <div className="mt-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 p-6 ring-1 ring-purple-200">
            <h3 className="mb-2 font-semibold text-purple-900">💡 {t('proTip')}</h3>
            <p className="text-sm text-purple-800">
              {t('proTipText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
