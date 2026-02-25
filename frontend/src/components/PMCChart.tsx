import { type FC, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { FtpChangeDto, PmcActivitySummaryDto } from '../services/api';

interface PMCData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  activities?: PmcActivitySummaryDto[];
}

interface PMCChartProps {
  data: PMCData[];
  ftpChanges?: FtpChangeDto[];
  ctlDays?: number;
  atlDays?: number;
  /** Optional id for debug logs (e.g. 'dashboard' | 'analysis'). */
  chartId?: string;
}

function formatFtpChangeLabel(fc: FtpChangeDto): string {
  const sourceLabel = fc.source === 'Manual' ? 'zmiana ręczna' : 'eFTP z aktywności';
  const delta = fc.toFtp - fc.fromFtp;
  const sign = delta > 0 ? '+' : '';
  return `FTP: ${fc.fromFtp} → ${fc.toFtp} W (Δ ${sign}${delta} W, ${sourceLabel})`;
}

/** Normalize to YYYY-MM-DD from ISO-like string to avoid timezone shifts when comparing. */
function toDateOnly(s: string): string {
  if (typeof s !== 'string') return '';
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
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

export const PMCChart: FC<PMCChartProps> = ({ data, ftpChanges = [], ctlDays = 42, atlDays = 7, chartId = '' }) => {
  const loadDomain = useMemo((): [number, number] => {
    const maxLoad = data.reduce((max, p) => Math.max(max, Number(p.ctl) || 0, Number(p.atl) || 0), 0);
    const padded = Math.ceil((maxLoad * 1.1) / 10) * 10; // +10% headroom, round to tens
    const upper = Math.max(80, Number.isFinite(padded) && padded > 0 ? padded : 80);
    return [0, upper];
  }, [data, chartId]);

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

  const ftpChangesByDate = useMemo(() => {
    const map = new Map<string, FtpChangeDto[]>();
    ftpChanges.forEach((fc) => {
      const key = toDateOnly(fc.date);
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(fc);
      map.set(key, list);
    });
    return map;
  }, [ftpChanges]);

  const formattedData = useMemo(
    () =>
      data.map((item, i) => {
        const tsb = item.tsb;
        const segmentValues: Record<string, number | null> = {};
        segments.forEach((seg, segIdx) => {
          const segEnd = segIdx < segments.length - 1 ? segments[segIdx + 1].start : seg.end;
          const inSegment = i >= seg.start && i <= segEnd && typeof tsb === 'number';
          segmentValues[`tsbSeg${segIdx}`] = inSegment ? tsb : null;
        });
        const dateOnly = toDateOnly(item.date);
        const dayFtpChanges = dateOnly ? ftpChangesByDate.get(dateOnly) ?? [] : [];
        return {
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateFull: item.date,
          dateLabelFull: new Date(item.date).toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          ftpChangesForDay: dayFtpChanges,
          activitiesForDay: item.activities ?? [],
          ...segmentValues,
        };
      }),
    [data, segments, ftpChangesByDate],
  );

  const unifiedTooltipContent = (props: {
    active?: boolean;
    payload?: ReadonlyArray<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
    label?: string | number;
  }) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload as {
      dateLabelFull?: string;
      date?: string;
      ctl?: number;
      atl?: number;
      tsb?: number;
      ftpChangesForDay?: FtpChangeDto[];
      activitiesForDay?: PmcActivitySummaryDto[];
    } | null;

    if (!point) return null;

    const tsb = typeof point.tsb === 'number' ? point.tsb : null;
    const ftpChangesForDay = point.ftpChangesForDay ?? [];
    const activitiesForDay = point.activitiesForDay ?? [];
    const dateStr = point.dateLabelFull ?? String(label ?? point.date ?? '');

    return (
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-md">
        <p className="mb-2 text-sm font-medium text-gray-900">{dateStr}</p>

        <ul className="space-y-1 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              <span>Wytrenowanie (CTL)</span>
            </span>
            <span className="font-medium text-gray-900">
              {typeof point.ctl === 'number' ? point.ctl.toFixed(1) : '–'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span>Zmęczenie (ATL)</span>
            </span>
            <span className="font-medium text-gray-900">
              {typeof point.atl === 'number' ? point.atl.toFixed(1) : '–'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Forma (TSB)</span>
            </span>
            <span className="font-medium text-gray-900">
              {typeof tsb === 'number' ? tsb.toFixed(1) : '–'}
            </span>
          </li>
        </ul>

        {typeof tsb === 'number' && (
          <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-600">
            Strefa TSB: {getTsbZoneLabel(tsb)}
          </p>
        )}

        {ftpChangesForDay.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="mb-1 text-[11px] font-semibold text-gray-700">Zmiany FTP</p>
            <ul className="space-y-0.5 text-[11px] text-gray-700">
              {ftpChangesForDay.map((fc, idx) => (
                <li key={idx}>{formatFtpChangeLabel(fc)}</li>
              ))}
            </ul>
          </div>
        )}

        {activitiesForDay.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="mb-1 text-[11px] font-semibold text-gray-700">
              Aktywności ({activitiesForDay.length})
            </p>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-gray-700">
              {activitiesForDay.slice(0, 5).map((act) => (
                <li key={act.activityId}>
                  <span className="font-medium">{act.name}</span>{' '}
                  <span className="text-[11px] text-gray-500">
                    ({act.sportType}, {Math.round(act.movingTimeSeconds / 60)} min, TSS:{' '}
                    {act.trainingStressScore != null ? act.trainingStressScore.toFixed(0) : '–'})
                  </span>
                </li>
              ))}
              {activitiesForDay.length > 5 && (
                <li className="text-[11px] text-gray-500">
                  +{activitiesForDay.length - 5} więcej
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Performance Management Chart</h2>

      {/* Obciążenie treningowe (CTL + ATL) */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Obciążenie treningowe (Wytrenowanie / Zmęczenie)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={formattedData}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            syncId="pmc-sync"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              domain={loadDomain}
              allowDataOverflow
            />
            <Tooltip content={unifiedTooltipContent} wrapperStyle={{ zIndex: 10 }} />
            <Legend />
            <Line
              type="linear"
              dataKey="ctl"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Wytrenowanie (CTL)"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="atl"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Zmęczenie (ATL)"
              dot={false}
              isAnimationActive={false}
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
            syncId="pmc-sync"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              domain={TSB_Y_DOMAIN}
              allowDataOverflow
            />
            {/* Niewidoczny tooltip tylko po to, żeby ruch myszy na dolnym wykresie synchronizował indeks z górnym tooltipem */}
            <Tooltip content={() => null} />
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
                dot={(props) => {
                  const payload = props.payload as { ftpChangesForDay?: FtpChangeDto[]; tsb?: number };
                  const list = payload.ftpChangesForDay ?? [];
                  if (!list.length || typeof props.cx !== 'number' || typeof props.cy !== 'number') {
                    return null;
                  }
                  const title = list.map((fc) => formatFtpChangeLabel(fc)).join('\n');
                  return (
                    <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" stroke="#b91c1c" strokeWidth={1.5}>
                      <title>{title}</title>
                    </circle>
                  );
                }}
                connectNulls={false}
                legendType="none"
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wspólna oś X dla obu wykresów */}
      <div className="mt-2 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
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
