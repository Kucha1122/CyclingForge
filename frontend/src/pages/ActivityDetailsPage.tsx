import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { stravaApi } from '../services/api';
import type { ActivityDetailsDto } from '../types/activity';
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
} from 'recharts';

interface Stream {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

interface ChartDataPoint {
  distance: string | number;
  time: number;
  heartrate: number | null;
  watts: number | null;
  altitude: number | null;
  speed: string | null;
  cadence: number | null;
}

function parseStreamsToChartData(json: string): ChartDataPoint[] {
  try {
    const streams: Stream[] = JSON.parse(json);
    if (!streams || streams.length === 0) return [];

    const distanceStream = streams.find((s) => s.type === 'distance');
    const timeStream = streams.find((s) => s.type === 'time');
    const heartrateStream = streams.find((s) => s.type === 'heartrate');
    const wattsStream = streams.find((s) => s.type === 'watts');
    const altitudeStream = streams.find((s) => s.type === 'altitude');
    const velocityStream = streams.find((s) => s.type === 'velocity_smooth');
    const cadenceStream = streams.find((s) => s.type === 'cadence');

    const length = distanceStream?.data.length || timeStream?.data.length || 0;
    const data: ChartDataPoint[] = [];

    for (let i = 0; i < length; i++) {
      data.push({
        distance: distanceStream?.data[i] ? (distanceStream.data[i] / 1000).toFixed(2) : 0,
        time: timeStream?.data[i] || 0,
        heartrate: heartrateStream?.data[i] ?? null,
        watts: wattsStream?.data[i] ?? null,
        altitude: altitudeStream?.data[i] ?? null,
        speed: velocityStream?.data[i] ? (velocityStream.data[i] * 3.6).toFixed(1) : null,
        cadence: cadenceStream?.data[i] ?? null,
      });
    }
    return data;
  } catch {
    return [];
  }
}

export default function ActivityDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<ActivityDetailsDto | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    stravaApi.getActivityDetails(id)
      .then((response) => {
        setActivity(response.data);
        if (response.data.streamsJson) {
          setChartData(parseStreamsToChartData(response.data.streamsJson));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!activity) return <div className="p-8 text-center">Activity not found</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{activity.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Distance</h3>
          <p className="text-2xl font-bold">{(activity.distance / 1000).toFixed(2)} km</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Moving Time</h3>
          <p className="text-2xl font-bold">{formatTime(activity.movingTime)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Elevation Gain</h3>
          <p className="text-2xl font-bold">{activity.totalElevationGain} m</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Avg Power</h3>
          <p className="text-2xl font-bold">{activity.averagePower ? `${Math.round(activity.averagePower)} W` : '-'}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="space-y-8">
          {/* Elevation Profile */}
          <div className="bg-white p-4 rounded shadow h-80">
            <h3 className="text-lg font-semibold mb-2">Elevation Profile</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="distance" label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -10 }} />
                <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Area type="monotone" dataKey="altitude" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Power & Heart Rate */}
          <div className="bg-white p-4 rounded shadow h-80">
            <h3 className="text-lg font-semibold mb-2">Power & Heart Rate</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="distance" label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -10 }} />
                <YAxis yAxisId="left" label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="watts" stroke="#82ca9d" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="heartrate" stroke="#ff7300" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Speed */}
          <div className="bg-white p-4 rounded shadow h-80">
            <h3 className="text-lg font-semibold mb-2">Speed</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="distance" label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -10 }} />
                <YAxis label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="speed" stroke="#387908" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}
