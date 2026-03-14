import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { activitiesApi, stravaApi } from '../services/api';
import type { ActivityDetailsDto } from '../types/activity';
import { formatDate as formatDateUtil, formatTime as formatTimeUtil, formatDateTime } from '../utils/format';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StravaStream {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

interface ChartPoint {
  distKm: number;
  time: number;
  heartrate: number | null;
  watts: number | null;
  altitude: number | null;
  speedKph: number | null;
  cadence: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseStreams(json: string): ChartPoint[] {
  try {
    const streams: StravaStream[] = JSON.parse(json);
    if (!streams?.length) return [];

    const get = (type: string) => streams.find((s) => s.type === type);
    const distStream = get('distance');
    const timeStream = get('time');
    const hrStream = get('heartrate');
    const wattsStream = get('watts');
    const altStream = get('altitude');
    const velStream = get('velocity_smooth');
    const cadStream = get('cadence');

    const length = distStream?.data.length ?? timeStream?.data.length ?? 0;
    const raw: ChartPoint[] = [];

    for (let i = 0; i < length; i++) {
      raw.push({
        distKm: distStream ? distStream.data[i] / 1000 : 0,
        time: timeStream?.data[i] ?? 0,
        heartrate: hrStream?.data[i] ?? null,
        watts: wattsStream?.data[i] ?? null,
        altitude: altStream?.data[i] ?? null,
        speedKph: velStream ? velStream.data[i] * 3.6 : null,
        cadence: cadStream?.data[i] ?? null,
      });
    }
    return raw;
  } catch {
    return [];
  }
}

/** Reduce a stream to at most `target` points using systematic sampling. */
function downsample(data: ChartPoint[], target = 600): ChartPoint[] {
  if (data.length <= target) return data;
  const step = Math.ceil(data.length / target);
  return data.filter((_, i) => i % step === 0);
}

function formatDuration(ts: string): string {
  const parts = ts.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2].split('.')[0], 10);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }
  return ts;
}


function sportIcon(type: string): string {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('ride') || t.includes('cycling')) return '🚴';
  if (t.includes('run')) return '🏃';
  if (t.includes('swim')) return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🚶';
  if (t.includes('ski')) return '⛷️';
  return '🏋️';
}

function getSportLabelKey(type: string): string {
  const key = type?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ride: 'sportRide',
    virtualride: 'sportVirtualRide',
    run: 'sportRun',
    walk: 'sportWalk',
    hike: 'sportHike',
    swim: 'sportSwim',
    alpineski: 'sportAlpineski',
    nordicski: 'sportNordicski',
    workout: 'sportWorkout',
  };
  return map[key] ?? 'sportWorkout';
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  sub?: string;
}

function StatCard({ label, value, unit, accent = 'text-gray-900', sub }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${accent}`}>{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
      <span className="h-px flex-1 bg-gray-200" />
      {children}
      <span className="h-px flex-1 bg-gray-200" />
    </h2>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1 font-semibold text-gray-600">{Number(label).toFixed(2)} km</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-medium text-gray-800">
            {entry.value != null ? Number(entry.value).toFixed(1) : '—'} {entry.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── Power Best Row ───────────────────────────────────────────────────────────

interface PowerBestProps {
  label: string;
  watts?: number;
  ftp?: number;
}

function PowerBestRow({ label, watts, ftp }: PowerBestProps) {
  if (!watts) return null;
  const pct = ftp ? Math.round((watts / ftp) * 100) : null;
  const barPct = ftp ? Math.min((watts / ftp) * 100, 150) : 50;
  const barColor =
    pct == null
      ? 'bg-blue-400'
      : pct >= 120
      ? 'bg-purple-500'
      : pct >= 105
      ? 'bg-red-500'
      : pct >= 90
      ? 'bg-orange-500'
      : pct >= 75
      ? 'bg-yellow-500'
      : 'bg-blue-500';

  return (
    <div className="grid grid-cols-[7rem_1fr_5rem_4rem] items-center gap-3 py-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className="text-right text-sm font-bold text-gray-800">{Math.round(watts)} W</span>
      {pct != null ? (
        <span className={`text-right text-xs font-semibold ${barColor.replace('bg-', 'text-')}`}>
          {pct}% FTP
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivityDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t: tAd, i18n } = useTranslation('activityDetails');
  const tErr = useTranslation('errors').t;
  const [activity, setActivity] = useState<ActivityDetailsDto | null>(null);
  const [rawChart, setRawChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    activitiesApi
      .getActivityDetails(id)
      .then(async (res) => {
        const act = res.data;
        setActivity(act);
        try {
          const stravaRes = await stravaApi.getActivityDetails(act.stravaActivityId.toString());
          if (stravaRes.data.streamsJson) {
            setRawChart(parseStreams(stravaRes.data.streamsJson));
          }
        } catch {
          // streams are optional — chart section simply won't render
        }
      })
      .catch(() => setError(tErr('activityLoadFailed')))
      .finally(() => setLoading(false));
  }, [id]);

  const chartData = useMemo(() => downsample(rawChart), [rawChart]);

  if (loading) return <LoadingSkeleton />;
  if (error || !activity)
    return (
      <div className="flex min-h-64 items-center justify-center text-gray-500">
        {error ?? tErr('activityNotFound')}
      </div>
    );

  const hasPower = activity.averagePower != null;
  const hasHR = activity.averageHeartRate != null;
  const hasStreams = chartData.length > 0;
  const hasPowerStream = hasStreams && chartData.some((p) => p.watts != null);
  const hasHRStream = hasStreams && chartData.some((p) => p.heartrate != null);
  const hasAltitude = hasStreams && chartData.some((p) => p.altitude != null);
  const hasSpeed = hasStreams && chartData.some((p) => p.speedKph != null);
  const hasCadence = hasStreams && chartData.some((p) => p.cadence != null);
  const hasPowerBests = activity.best5MinPower || activity.best20MinPower || activity.best60MinPower;

  const ftp = activity.ftpUsed;

  // Y-axis domains
  const wattsDomain: [number | string, number | string] = [0, 'auto'];
  const hrMin = hasHRStream
    ? Math.max(0, Math.min(...chartData.filter((p) => p.heartrate).map((p) => p.heartrate!)) - 10)
    : 0;
  const hrMax = hasHRStream
    ? Math.max(...chartData.filter((p) => p.heartrate).map((p) => p.heartrate!)) + 10
    : 220;
  const altMin = hasAltitude
    ? Math.max(0, Math.min(...chartData.filter((p) => p.altitude != null).map((p) => p.altitude!)) - 20)
    : 0;
  const altMax = hasAltitude
    ? Math.max(...chartData.filter((p) => p.altitude != null).map((p) => p.altitude!)) + 30
    : 100;

  return (
    <div key={i18n.language} className="mx-auto max-w-6xl space-y-8 p-6">

      {/* ── Header ── */}
      <div>
        <Link
          to="/activities"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          {tAd('backToActivities')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl shadow-sm ring-1 ring-blue-100">
              {sportIcon(activity.type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{activity.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {tAd(getSportLabelKey(activity.type))}
                </span>
                {activity.deviceWatts === true && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    ⚡ {tAd('powerMeter')}
                  </span>
                )}
                {activity.deviceWatts === false && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    ~ {tAd('powerEstimated')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 capitalize">{formatDateUtil(activity.startDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-sm text-gray-400">{formatTimeUtil(activity.startDate)}</p>
          </div>
        </div>
      </div>

      {/* ── Primary Stats ── */}
      <div>
        <SectionHeading>{tAd('sectionBasicData')}</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label={tAd('distance')}
            value={activity.distanceKm.toFixed(2)}
            unit="km"
            accent="text-blue-600"
          />
          <StatCard
            label={tAd('rideTime')}
            value={formatDuration(activity.movingTime)}
            accent="text-gray-900"
          />
          <StatCard
            label={tAd('elapsedTime')}
            value={formatDuration(activity.elapsedTime)}
            accent="text-gray-700"
          />
          <StatCard
            label={tAd('elevation')}
            value={Math.round(activity.totalElevationGain)}
            unit="m"
            accent="text-emerald-600"
          />
          {activity.averageSpeed != null && (
            <StatCard
              label={tAd('avgSpeed')}
              value={activity.averageSpeed.toFixed(1)}
              unit="km/h"
              accent="text-amber-600"
              sub={activity.maxSpeed != null ? `${tAd('maxSpeed')} ${activity.maxSpeed.toFixed(1)} km/h` : undefined}
            />
          )}
        </div>
      </div>

      {/* ── Power Metrics ── */}
      {hasPower && (
        <div>
          <SectionHeading>{tAd('sectionPowerData')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label={tAd('avgPower')}
              value={Math.round(activity.averagePower!)}
              unit="W"
              accent="text-blue-600"
            />
            {activity.normalizedPower != null && (
              <StatCard
                label={tAd('normalizedPower')}
                value={Math.round(activity.normalizedPower)}
                unit="W"
                accent="text-blue-700"
                sub="NP"
              />
            )}
            {activity.maxPower != null && (
              <StatCard
                label={tAd('maxPower')}
                value={Math.round(activity.maxPower)}
                unit="W"
                accent="text-purple-600"
              />
            )}
            {activity.intensityFactor != null && (
              <StatCard
                label={tAd('intensityFactor')}
                value={activity.intensityFactor.toFixed(2)}
                accent="text-orange-600"
                sub="IF"
              />
            )}
            {activity.trainingStressScore != null && (
              <StatCard
                label={tAd('trainingLoad')}
                value={Math.round(activity.trainingStressScore)}
                accent="text-red-600"
                sub="TSS"
              />
            )}
            {activity.ftpUsed != null && (
              <StatCard
                label={tAd('ftpUsed')}
                value={activity.ftpUsed}
                unit="W"
                accent="text-gray-700"
              />
            )}
          </div>
        </div>
      )}

      {/* ── HR Metrics ── */}
      {hasHR && (
        <div>
          <SectionHeading>{tAd('sectionHeartrate')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard
              label={tAd('avgHr')}
              value={Math.round(activity.averageHeartRate!)}
              unit="bpm"
              accent="text-red-500"
            />
            {activity.maxHeartRate != null && (
              <StatCard
                label={tAd('maxHr')}
                value={Math.round(activity.maxHeartRate)}
                unit="bpm"
                accent="text-red-700"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      {hasStreams && (
        <div className="space-y-6">
          <SectionHeading>{tAd('sectionCharts')}</SectionHeading>

          {/* Elevation Profile */}
          {hasAltitude && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">{tAd('elevationProfile')}</h3>
              <p className="mb-4 text-xs text-gray-400">{tAd('elevationProfileDesc')}</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <defs>
                    <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="distKm"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    label={{ value: tAd('distanceKm'), position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis
                    domain={[altMin, altMax]}
                    tickFormatter={(v) => `${v}`}
                    label={{ value: tAd('elevationM'), angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    width={55}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="altitude"
                    name={tAd('altitude')}
                    unit=" m"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#altGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Power & Heart Rate */}
          {(hasPowerStream || hasHRStream) && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">{tAd('powerAndHeartrate')}</h3>
              <p className="mb-4 text-xs text-gray-400">
                {hasPowerStream && hasHRStream
                  ? tAd('powerAndHrVsDist')
                  : hasPowerStream
                  ? tAd('powerVsDist')
                  : tAd('hrVsDist')}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 5, right: 50, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="distKm"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    label={{ value: tAd('distanceKm'), position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  {hasPowerStream && (
                    <YAxis
                      yAxisId="power"
                      domain={wattsDomain}
                      tickFormatter={(v) => `${v}`}
                      label={{ value: tAd('powerW'), angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#3b82f6' }}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      width={50}
                    />
                  )}
                  {hasHRStream && (
                    <YAxis
                      yAxisId="hr"
                      orientation="right"
                      domain={[hrMin, hrMax]}
                      tickFormatter={(v) => `${v}`}
                      label={{ value: tAd('heartrateBpm'), angle: 90, position: 'insideRight', offset: 15, fontSize: 11, fill: '#ef4444' }}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      width={55}
                    />
                  )}
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  {hasPowerStream && activity.averagePower != null && (
                    <ReferenceLine
                      yAxisId="power"
                      y={Math.round(activity.averagePower)}
                      stroke="#3b82f6"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  {hasHRStream && activity.averageHeartRate != null && (
                    <ReferenceLine
                      yAxisId="hr"
                      y={Math.round(activity.averageHeartRate)}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  {hasPowerStream && (
                    <Line
                      yAxisId="power"
                      type="monotone"
                      dataKey="watts"
                      name={tAd('power')}
                      unit=" W"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {hasHRStream && (
                    <Line
                      yAxisId="hr"
                      type="monotone"
                      dataKey="heartrate"
                      name={tAd('heartrate')}
                      unit=" bpm"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Speed & Cadence */}
          {(hasSpeed || hasCadence) && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">{tAd('speedAndCadence')}</h3>
              <p className="mb-4 text-xs text-gray-400">
                {hasSpeed && hasCadence
                  ? tAd('speedAndCadenceVsDist')
                  : hasSpeed
                  ? tAd('speedVsDist')
                  : tAd('cadenceVsDist')}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 50, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="distKm"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    label={{ value: tAd('distanceKm'), position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9ca3af' }}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  {hasSpeed && (
                    <YAxis
                      yAxisId="speed"
                      domain={[0, 'auto']}
                      tickFormatter={(v) => `${v}`}
                      label={{ value: tAd('speedKmh'), angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#f59e0b' }}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      width={55}
                    />
                  )}
                  {hasCadence && (
                    <YAxis
                      yAxisId="cadence"
                      orientation="right"
                      domain={[0, 'auto']}
                      tickFormatter={(v) => `${v}`}
                      label={{ value: tAd('cadenceRpm'), angle: 90, position: 'insideRight', offset: 15, fontSize: 11, fill: '#8b5cf6' }}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      width={55}
                    />
                  )}
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  {activity.averageSpeed != null && hasSpeed && (
                    <ReferenceLine
                      yAxisId="speed"
                      y={Math.round(activity.averageSpeed * 10) / 10}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  {hasSpeed && (
                    <Line
                      yAxisId="speed"
                      type="monotone"
                      dataKey="speedKph"
                      name={tAd('speed')}
                      unit=" km/h"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {hasCadence && (
                    <Line
                      yAxisId="cadence"
                      type="monotone"
                      dataKey="cadence"
                      name={tAd('cadence')}
                      unit=" rpm"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Power Bests ── */}
      {hasPowerBests && (
        <div>
          <SectionHeading>{tAd('powerBests')}</SectionHeading>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="mb-4 text-xs text-gray-400">
              {tAd('powerBestsDesc')}
            </p>
            <div className="divide-y divide-gray-100">
              <PowerBestRow label={tAd('best5min')} watts={activity.best5MinPower} ftp={ftp} />
              <PowerBestRow label={tAd('best20min')} watts={activity.best20MinPower} ftp={ftp} />
              <PowerBestRow label={tAd('best60min')} watts={activity.best60MinPower} ftp={ftp} />
            </div>
            {activity.estimatedFtpFromActivity != null && (
              <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {tAd('estimatedFtpFromActivity')}
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">
                      {tAd('estimatedFtpFromActivityHint')}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-blue-700">
                    {activity.estimatedFtpFromActivity} W
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer meta ── */}
      <div className="border-t border-gray-100 pt-4 text-xs text-gray-300 text-right">
        {tAd('syncedAt')}: {formatDateTime(activity.syncedAt)}
      </div>
    </div>
  );
}
