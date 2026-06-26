import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../components/Spinner';
import { garminApi } from '../services/api';
import type { SleepDataDto, HrvDataDto, GarminStatusDto } from '../types/garmin';
import { SleepChart } from '../components/garmin/SleepChart';
import { SleepStagesChart } from '../components/garmin/SleepStagesChart';
import { SleepDetailsCard } from '../components/garmin/SleepDetailsCard';
import { useNavigate } from 'react-router-dom';
import { useSync } from '../context/SyncContext';

type DateRange = 7 | 30 | 90;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export const SleepPage = () => {
  const { t } = useTranslation('sleep');
  const navigate = useNavigate();
  const { syncVersion, notifySynced } = useSync();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [garminStatus, setGarminStatus] = useState<GarminStatusDto | null>(null);
  const [sleepData, setSleepData] = useState<SleepDataDto[]>([]);
  const [hrvData, setHrvData] = useState<HrvDataDto[]>([]);
  const [range, setRange] = useState<DateRange>(30);

  const fetchSleepData = useCallback(async (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    try {
      const [sleepRes, hrvRes] = await Promise.allSettled([
        garminApi.getSleepData(start, end),
        garminApi.getHrvData(start, end),
      ]);
      setSleepData(sleepRes.status === 'fulfilled' ? sleepRes.value.data : []);
      setHrvData(hrvRes.status === 'fulfilled' ? hrvRes.value.data : []);
    } catch {
      setSleepData([]);
      setHrvData([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const statusRes = await garminApi.getStatus();
        setGarminStatus(statusRes.data);

        if (statusRes.data.isConnected) {
          await fetchSleepData(range);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [range, syncVersion, fetchSleepData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await garminApi.sync(range);
      await fetchSleepData(range);
      notifySynced();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = () => {
    // Connecting a Garmin account (email/password) lives on the profile page.
    navigate('/profile');
  };

  if (loading) {
    return <PageLoader label={t('loadingSleep')} />;
  }

  if (!garminStatus?.isConnected) {
    return (
      <div className="min-h-screen bg-page p-8">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-primary">{t('analytics')}</h1>
          <p className="text-secondary">{t('analyticsSubtitle')}</p>
        </header>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">🌙</div>
          <h3 className="mb-2 text-lg font-medium text-primary">{t('connectGarminToTrack')}</h3>
          <p className="mb-6 max-w-md text-center text-tertiary">
            {t('connectGarminDescription')}
          </p>
          <button
            onClick={handleConnect}
            className="rounded-lg bg-[#007CC3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#006AAF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('connectWithGarmin')}
          </button>
        </div>
      </div>
    );
  }

  const avgSleep = sleepData.length > 0
    ? Math.round(sleepData.reduce((s, d) => s + d.totalSleepSeconds, 0) / sleepData.length)
    : 0;
  const avgDeep = sleepData.length > 0
    ? Math.round(sleepData.reduce((s, d) => s + d.deepSleepSeconds, 0) / sleepData.length)
    : 0;
  const avgRem = sleepData.length > 0
    ? Math.round(sleepData.reduce((s, d) => s + d.remSleepSeconds, 0) / sleepData.length)
    : 0;
  const avgScore = sleepData.filter((d) => d.sleepScore != null).length > 0
    ? Math.round(
        sleepData.filter((d) => d.sleepScore != null).reduce((s, d) => s + (d.sleepScore ?? 0), 0) /
          sleepData.filter((d) => d.sleepScore != null).length
      )
    : null;

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-primary">{t('analytics')}</h1>
            <p className="text-secondary">{t('analyticsSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as DateRange)}
              className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value={7}>{t('last7Days')}</option>
              <option value={30}>{t('last30Days')}</option>
              <option value={90}>{t('last90Days')}</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-[#007CC3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006AAF] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {syncing ? t('syncing') : t('syncGarmin')}
            </button>
          </div>
        </div>
      </header>

      {sleepData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-primary">{t('noSleepDataYet')}</h3>
          <p className="text-tertiary">{t('syncGarminHint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border-default text-center">
              <p className="text-xs text-tertiary">{t('avgDuration')}</p>
              <p className="text-2xl font-bold text-primary">{formatDuration(avgSleep)}</p>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border-default text-center">
              <p className="text-xs text-tertiary">{t('avgDeep')}</p>
              <p className="text-2xl font-bold text-accent">{formatDuration(avgDeep)}</p>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border-default text-center">
              <p className="text-xs text-tertiary">{t('avgRem')}</p>
              <p className="text-2xl font-bold text-accent">{formatDuration(avgRem)}</p>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border-default text-center">
              <p className="text-xs text-tertiary">{t('avgScore')}</p>
              <p className="text-2xl font-bold text-primary">{avgScore ?? '-'}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SleepChart data={sleepData} hrvData={hrvData} />
            <SleepStagesChart data={sleepData} />
          </div>

          {/* Individual nights */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('nightDetails')}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {[...sleepData]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((d) => (
                  <SleepDetailsCard
                    key={d.date}
                    sleep={d}
                    hrv={hrvData.find((h) => h.date === d.date) ?? null}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepPage;
