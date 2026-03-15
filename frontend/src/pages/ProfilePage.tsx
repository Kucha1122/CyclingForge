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
        <p className="text-xl font-semibold text-secondary">{t('loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-secondary">{t('subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* User Info Card */}
          <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('accountInfo')}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-secondary">{t('email')}</p>
                <p className="font-medium text-primary">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-secondary">{t('name')}</p>
                <p className="font-medium text-primary">
                  {userProfile?.firstName} {userProfile?.lastName}
                </p>
              </div>
              <div>
                <p className="text-secondary">{t('memberSince')}</p>
                <p className="font-medium text-primary">
                  {userProfile?.createdAt ? formatDate(userProfile.createdAt) : tCommon('nA')}
                </p>
              </div>
            </div>
          </div>

          {/* Strava Connection Card */}
          <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('stravaConnection')}</h2>
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
                  <p className="font-semibold text-primary">
                    {stravaProfile.firstName} {stravaProfile.lastName}
                  </p>
                  <p className="text-sm text-secondary">
                    {stravaProfile.city}, {stravaProfile.country}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-state-success-bg px-2 py-0.5 text-xs font-medium text-state-success-text">
                    <span>●</span> {t('connected')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-secondary">
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
          <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('garminConnect')}</h2>
            {garminStatus?.isConnected ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-state-success-bg px-2 py-0.5 text-xs font-medium text-state-success-text">
                    <span>●</span> {t('connected')}
                  </div>
                  {garminStatus.connectedAt && (
                    <span className="text-xs text-tertiary">
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
                <p className="text-sm text-secondary">
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
            <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">{t('trainingZones')}</h2>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {t('fromStrava')}
                </span>
              </div>

              {zonesLoading && (
                <div className="space-y-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3 animate-pulse rounded bg-muted" />
                    <div className="h-3 animate-pulse rounded bg-muted" />
                    <div className="h-3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              )}

              {!zonesLoading && !zones && !zonesError && (
                <p className="text-sm text-secondary">
                  {t('stravaNoZones')}
                </p>
              )}

              {zonesError && (
                <p className="text-sm text-state-danger-text">
                  {t('failedToLoadZones')}
                </p>
              )}

              {zones && (
                <div className="mt-2 space-y-6">
                  {/* Heart Rate Zones – colors by intensity: Z1 light → Z5+ heavy */}
                  {zones.heartRateZones.length > 0 && (() => {
                    const ZONE_INTENSITY_ORDER = [2, 6, 1, 3, 4, 5, 7];
                    return (
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold text-primary">{t('heartRateZones')}</h3>
                        <p className="text-xs text-tertiary">
                          {t('zonesCountBpm', { count: zones.heartRateZones.length })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {zones.heartRateZones.map((z, index) => {
                          const chartIdx = ZONE_INTENSITY_ORDER[index] ?? (index + 1);
                          const chartVar = `var(--chart-${chartIdx})`;
                          const rangeStr = (z.max <= z.min || z.max <= 1) ? `${z.min}+` : `${z.min}–${z.max}`;
                          return (
                            <div
                              key={`hr-zone-${index}`}
                              className="overflow-hidden rounded-lg ring-1 ring-border-default"
                              style={{ background: `color-mix(in srgb, ${chartVar} 14%, var(--bg-page))` }}
                            >
                              <div
                                className="flex items-center justify-between border-l-[10px] px-3 py-2 text-xs font-medium text-primary"
                                style={{ borderLeftColor: chartVar }}
                              >
                                <span className="uppercase">
                                  HR Z{index + 1}
                                </span>
                                <span className="tabular-nums">
                                  {rangeStr} bpm
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}

                  {/* Power Zones – colors by intensity: Z1 light (green) → Z7 heavy (red/pink) */}
                  {zones.powerZones.length > 0 && (() => {
                    const ZONE_INTENSITY_ORDER = [2, 6, 1, 3, 4, 5, 7];
                    return (
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold text-primary">{t('powerZones')}</h3>
                        <p className="text-xs text-tertiary">
                          {t('zonesCountWatts', { count: zones.powerZones.length })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {zones.powerZones.map((z, index) => {
                          const chartIdx = ZONE_INTENSITY_ORDER[index] ?? (index + 1);
                          const chartVar = `var(--chart-${chartIdx})`;
                          const rangeStr = (z.max <= z.min || z.max <= 1) ? `${z.min}+` : `${z.min}–${z.max}`;
                          return (
                            <div
                              key={`power-zone-${index}`}
                              className="overflow-hidden rounded-lg ring-1 ring-border-default"
                              style={{ background: `color-mix(in srgb, ${chartVar} 14%, var(--bg-page))` }}
                            >
                              <div
                                className="flex items-center justify-between border-l-[10px] px-3 py-2 text-xs font-medium text-primary"
                                style={{ borderLeftColor: chartVar }}
                              >
                                <span className="uppercase">
                                  PWR Z{index + 1}
                                </span>
                                <span className="tabular-nums">
                                  {rangeStr} W
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle Column - Training Settings */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
            <h2 className="mb-6 text-xl font-semibold text-primary">{t('trainingMetrics')}</h2>

            {message && (
              <div
                className={`mb-6 rounded-lg p-4 ring-1 ring-border-default ${
                  message.type === 'success'
                    ? 'bg-state-success-bg text-state-success-text'
                    : 'bg-state-danger-bg text-state-danger-text'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              {/* FTP Input */}
              <div>
                <label htmlFor="ftp" className="mb-1 block text-sm font-medium text-primary">
                  {t('ftpLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('ftpHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="ftp"
                    value={ftp}
                    onChange={(e) => setFtp(e.target.value)}
                    placeholder={t('placeholderFtp')}
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-16 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    min="0"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('watts')}</span>
                </div>
                {!ftp && (
                  <p className="mt-1 text-xs text-state-active-text">
                    ⚠️ {t('ftpRequiredWarning')}
                  </p>
                )}
              </div>

              {/* eFTP min duration */}
              <div>
                <label htmlFor="eftpMinMinutes" className="mb-1 block text-sm font-medium text-primary">
                  {t('eftpMinLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
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
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-12 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('min')}</span>
                </div>
              </div>

              {/* Weight Input */}
              <div>
                <label htmlFor="weight" className="mb-1 block text-sm font-medium text-primary">
                  {t('weightLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('weightHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={t('placeholderWeight')}
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-12 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    min="0"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('kg')}</span>
                </div>
              </div>

              {/* LTHR Input */}
              <div>
                <label htmlFor="lthr" className="mb-1 block text-sm font-medium text-primary">
                  {t('lthrLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('lthrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="lthr"
                    value={lthr}
                    onChange={(e) => setLthr(e.target.value)}
                    placeholder={t('placeholderBpm')}
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-12 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    min="0"
                    max="250"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('bpm')}</span>
                </div>
              </div>

              {/* Max HR */}
              <div>
                <label htmlFor="maxHeartRate" className="mb-1 block text-sm font-medium text-primary">
                  {t('maxHrLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('maxHrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="maxHeartRate"
                    value={maxHeartRate}
                    onChange={(e) => setMaxHeartRate(e.target.value)}
                    placeholder={t('placeholderMaxHr')}
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-12 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    min="0"
                    max="250"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('bpm')}</span>
                </div>
              </div>

              {/* Resting HR */}
              <div>
                <label htmlFor="restingHeartRate" className="mb-1 block text-sm font-medium text-primary">
                  {t('restingHrLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('restingHrHint')}
                </p>
                <div className="relative">
                  <input
                    type="number"
                    id="restingHeartRate"
                    value={restingHeartRate}
                    onChange={(e) => setRestingHeartRate(e.target.value)}
                    placeholder={t('placeholderRestingHr')}
                    className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 pr-12 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    min="0"
                    max="120"
                    step="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary">{t('bpm')}</span>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium text-primary">
                  {t('genderLabel')}
                </label>
                <p className="mb-2 text-xs text-secondary">
                  {t('genderHint')}
                </p>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                </select>
              </div>

              {/* Calculated Metrics */}
              {calculateWattsPerKg() && (
                <div className="rounded-lg bg-state-active-bg p-4 ring-1 ring-border-default">
                  <p className="mb-1 text-sm font-medium text-state-active-text">{t('powerToWeight')}</p>
                  <p className="text-3xl font-bold text-state-active-text">{calculateWattsPerKg()} W/kg</p>
                  <p className="mt-2 text-xs text-state-active-text">
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
                className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t('saving') : t('saveProfile')}
              </button>
            </div>
          </form>

          {/* Info Card */}
          <div className="mt-6 rounded-xl bg-muted p-6 ring-1 ring-border-default">
            <h3 className="mb-2 font-semibold text-primary">💡 {t('proTip')}</h3>
            <p className="text-sm text-secondary">
              {t('proTipText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
