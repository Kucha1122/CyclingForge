import { type FC, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';

interface PMCData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface PMCChartProps {
  data: PMCData[];
  ctlDays?: number;
  atlDays?: number;
}

// Strefy zgodne z interval.icu: Optymalna = -10 do -30 (budowanie formy), Ryzykowna = głęboka fatyga < -35
function getTsbZoneLabel(tsb: number): string {
  if (tsb < -35) return 'Ryzykowna';
  if (tsb < -10) return 'Optymalna';
  if (tsb < 5) return 'Przejściowa';
  if (tsb < 25) return 'Świeża';
  return 'Bardzo świeża';
}

function isPrzejściowa(tsb: number): boolean {
  return tsb >= -10 && tsb < 5;
}

const TSB_ZONES = [
  { y1: -55, y2: -35, fill: '#ef4444', fillOpacity: 0.25, label: 'Ryzykowna (< -35)' },
  { y1: -35, y2: -10, fill: '#10b981', fillOpacity: 0.25, label: 'Optymalna (-35 do -10)' },
  { y1: -10, y2: 5, fill: '#64748b', fillOpacity: 0.22, label: 'Przejściowa (-10 do 5)' },
  { y1: 5, y2: 25, fill: '#3b82f6', fillOpacity: 0.2, label: 'Świeża (5 do 25)' },
  { y1: 25, y2: 55, fill: '#8b5cf6', fillOpacity: 0.2, label: 'Bardzo świeża (> 25)' },
] as const;

const TSB_Y_DOMAIN: [number, number] = [-55, 55];

export const PMCChart: FC<PMCChartProps> = ({ data, ctlDays = 42, atlDays = 7 }) => {
  const segments = useMemo(() => {
    const segs: { start: number; end: number; isPrzejściowa: boolean }[] = [];
    for (let i = 0; i < data.length; i++) {
      const tsb = data[i].tsb;
      const inP = typeof tsb === 'number' && isPrzejściowa(tsb);
      if (segs.length === 0 || segs[segs.length - 1].isPrzejściowa !== inP) {
        segs.push({ start: i, end: i, isPrzejściowa: inP });
      } else {
        segs[segs.length - 1].end = i;
      }
    }
    return segs;
  }, [data]);

  const formattedData = useMemo(() => data.map((item, i) => {
    const tsb = item.tsb;
    const segmentValues: Record<string, number | null> = {};
    segments.forEach((seg, segIdx) => {
      const segEnd = segIdx < segments.length - 1 ? segments[segIdx + 1].start : seg.end;
      const inSegment = i >= seg.start && i <= segEnd && typeof tsb === 'number';
      segmentValues[`tsbSeg${segIdx}`] = inSegment ? tsb : null;
    });
    return {
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dateFull: item.date,
      ...segmentValues,
    };
  }), [data, segments]);

  const tooltipContent = (props: { active?: boolean; payload?: ReadonlyArray<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>; label?: string | number }) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as { dateFull?: string; tsb?: number } | undefined;
    const tsb = point?.tsb ?? payload.find((p) => p.name === 'Form (TSB)')?.value;
    const dateStr = point?.dateFull
      ? new Date(point.dateFull).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      : String(label ?? '');
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
        <p className="mb-2 font-medium text-gray-900">{dateStr}</p>
        <ul className="space-y-1 text-sm">
          {payload.map((entry) => (
            <li key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : String(entry.value)}
            </li>
          ))}
        </ul>
        {typeof tsb === 'number' && (
          <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
            TSB zone: {getTsbZoneLabel(tsb)}
          </p>
        )}
      </div>
    );
  };

  const formTooltipContent = (props: { active?: boolean; payload?: ReadonlyArray<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>; label?: string | number }) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as { dateFull?: string; tsb?: number } | undefined;
    const tsb = point?.tsb ?? payload[0]?.value;
    const dateStr = point?.dateFull
      ? new Date(point.dateFull).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      : String(label ?? '');
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
        <p className="mb-2 font-medium text-gray-900">{dateStr}</p>
        <p className="text-sm">
          <span style={{ color: '#10b981' }}>Forma (TSB):</span>{' '}
          {typeof tsb === 'number' ? tsb.toFixed(1) : '-'}
        </p>
        {typeof tsb === 'number' && (
          <p className="mt-1 text-xs text-gray-600">{getTsbZoneLabel(tsb)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Performance Management Chart</h2>

      {/* Obciążenie treningowe (CTL + ATL) */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Obciążenie treningowe (Wytrenowanie / Zmęczenie)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} syncId="pmc">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip content={tooltipContent} />
            <Legend />
            <Line
              type="monotone"
              dataKey="ctl"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Wytrenowanie (CTL)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Zmęczenie (ATL)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Forma (TSB) – wykres w obszarze stref, jak w interval.icu */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Forma (TSB)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={formattedData}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            syncId="pmc"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              domain={TSB_Y_DOMAIN}
              allowDataOverflow
            />
            <Tooltip content={formTooltipContent} />
            {TSB_ZONES.map((zone, i) => (
              <ReferenceArea
                key={i}
                y1={zone.y1}
                y2={zone.y2}
                fill={zone.fill}
                fillOpacity={zone.fillOpacity}
                ifOverflow="visible"
              />
            ))}
            {segments.map((seg, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`tsbSeg${i}`}
                stroke={seg.isPrzejściowa ? '#64748b' : '#10b981'}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                legendType="none"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="text-gray-600">CTL (Wytrenowanie)</p>
          <p className="text-xs text-gray-500">{ctlDays}-dniowa średnia</p>
        </div>
        <div>
          <p className="text-gray-600">ATL (Zmęczenie)</p>
          <p className="text-xs text-gray-500">{atlDays}-dniowa średnia</p>
        </div>
        <div>
          <p className="text-gray-600">TSB (Forma)</p>
          <p className="text-xs text-gray-500">CTL - ATL</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {TSB_ZONES.map((zone, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-3 rounded-sm"
              style={{ backgroundColor: zone.fill, opacity: 0.8 }}
            />
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  );
};
