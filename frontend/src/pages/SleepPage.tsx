import { useCallback, useEffect, useState } from 'react';
import { garminApi } from '../services/api';
import type { SleepDataDto, GarminStatusDto } from '../types/garmin';
import { SleepChart } from '../components/garmin/SleepChart';
import { SleepStagesChart } from '../components/garmin/SleepStagesChart';
import { SleepDetailsCard } from '../components/garmin/SleepDetailsCard';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [garminStatus, setGarminStatus] = useState<GarminStatusDto | null>(null);
  const [sleepData, setSleepData] = useState<SleepDataDto[]>([]);
  const [range, setRange] = useState<DateRange>(30);

  const fetchSleepData = useCallback(async (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    try {
      const res = await garminApi.getSleepData(formatDate(startDate), formatDate(endDate));
      setSleepData(res.data);
    } catch {
      setSleepData([]);
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
  }, [range, fetchSleepData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await garminApi.sync(range);
      await fetchSleepData(range);
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await garminApi.getAuthorizeUrl();
      window.location.href = res.data.authorizeUrl;
    } catch {
      // Failed to initiate Garmin auth
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-xl font-semibold text-gray-700">Loading sleep data...</p>
      </div>
    );
  }

  if (!garminStatus?.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Sleep Analytics</h1>
          <p className="text-gray-600">Track and analyze your sleep patterns</p>
        </header>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">🌙</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">Connect Garmin to Track Sleep</h3>
          <p className="mb-6 max-w-md text-center text-gray-500">
            Connect your Garmin account to automatically sync sleep data including sleep stages, sleep score, SpO2, and more.
          </p>
          <button
            onClick={handleConnect}
            className="rounded-lg bg-[#007CC3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#006AAF]"
          >
            Connect with Garmin
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
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Sleep Analytics</h1>
            <p className="text-gray-600">Track and analyze your sleep patterns</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as DateRange)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-[#007CC3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006AAF] disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Garmin'}
            </button>
          </div>
        </div>
      </header>

      {sleepData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Sleep Data Yet</h3>
          <p className="text-gray-500">Click "Sync Garmin" to pull your sleep data.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 text-center">
              <p className="text-xs text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(avgSleep)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 text-center">
              <p className="text-xs text-gray-500">Avg Deep</p>
              <p className="text-2xl font-bold text-indigo-700">{formatDuration(avgDeep)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 text-center">
              <p className="text-xs text-gray-500">Avg REM</p>
              <p className="text-2xl font-bold text-violet-600">{formatDuration(avgRem)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 text-center">
              <p className="text-xs text-gray-500">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{avgScore ?? '-'}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SleepChart data={sleepData} />
            <SleepStagesChart data={sleepData} />
          </div>

          {/* Individual nights */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Night Details</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sleepData.map((d) => (
                <SleepDetailsCard key={d.date} sleep={d} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepPage;
