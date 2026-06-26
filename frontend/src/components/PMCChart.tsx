import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { FtpChangeDto, PmcActivitySummaryDto } from '../services/api';
import { formatDate } from '../utils/format';
import i18n from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { InfoTooltip } from './InfoTooltip';

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


/** Normalize to YYYY-MM-DD from ISO-like string to avoid timezone shifts when comparing. */
function toDateOnly(s: string): string {
  if (typeof s !== 'string') return '';
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/** Parse YYYY-MM-DD as local date (no timezone shift). */
function parseLocalDate(dateStr: string): Date | null {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function isPrzejściowa(tsb: number): boolean {
  return tsb >= -10 && tsb < 5;
}

function getTsbZoneLabelKey(tsb: number): string {
  if (tsb < -35) return 'tsbZoneRisky';
  if (tsb < -10) return 'tsbZoneOptimal';
  if (tsb < 5) return 'tsbZoneTransition';
  if (tsb < 25) return 'tsbZoneFresh';
  return 'tsbZoneVeryFresh';
}

const TSB_Y_DOMAIN: [number, number] = [-55, 55];

export const PMCChart: FC<PMCChartProps> = ({ data, ftpChanges = [], ctlDays = 42, atlDays = 7, chartId = '' }) => {
  const { t } = useTranslation('charts');
  const { chartColors } = useTheme();

  const TSB_ZONES = useMemo(
    () => [
      { y1: -55, y2: -35, fill: '#ef4444', fillOpacity: 0.25, labelKey: 'tsbZoneRisky' as const },
      { y1: -35, y2: -10, fill: '#10b981', fillOpacity: 0.25, labelKey: 'tsbZoneOptimal' as const },
      { y1: -10, y2: 5, fill: '#64748b', fillOpacity: 0.22, labelKey: 'tsbZoneTransition' as const },
      { y1: 5, y2: 25, fill: '#3b82f6', fillOpacity: 0.2, labelKey: 'tsbZoneFresh' as const },
      { y1: 25, y2: 55, fill: '#8b5cf6', fillOpacity: 0.2, labelKey: 'tsbZoneVeryFresh' as const },
    ],
    []
  );

  const formatFtpChangeLabel = (fc: FtpChangeDto): string => {
    const sourceLabel = fc.source === 'Manual' ? t('ftpChangeManual') : t('ftpChangeEftp');
    const delta = fc.toFtp - fc.fromFtp;
    const sign = delta > 0 ? '+' : '';
    return `FTP: ${fc.fromFtp} → ${fc.toFtp} W (Δ ${sign}${delta} W, ${sourceLabel})`;
  };

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

  /** Przy zakresie rocznym pierwszy i ostatni dzień mogą mieć to samo "25 lut" – bez roku etykiety się powielają. */
  const includeYearInAxis = useMemo(() => {
    if (data.length < 2) return false;
    const first = parseLocalDate(data[0].date);
    const last = parseLocalDate(data[data.length - 1].date);
    if (!first || !last) return false;
    return first.getFullYear() !== last.getFullYear() || data.length > 180;
  }, [data]);

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
        const parsed = parseLocalDate(item.date) ?? new Date(item.date);
        const dateLabel =
          includeYearInAxis
            ? formatDate(parsed, { day: 'numeric', month: 'short', year: 'numeric' })
            : formatDate(parsed, { day: 'numeric', month: 'short' });
        return {
          ...item,
          date: dateLabel,
          dateFull: item.date,
          dateLabelFull: formatDate(parsed, {
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
    [data, segments, ftpChangesByDate, includeYearInAxis, i18n.language],
  );

  /** Jawne ticki osi X (pierwszy, ćwiartki, ostatni), żeby przy rocznym wykresie ostatni dzień nie pokazywał etykiety pierwszego (błąd Recharts przy 365 punktach). */
  const xAxisTicks = useMemo(() => {
    const n = formattedData.length;
    if (n === 0) return undefined;
    if (n <= 5) return formattedData.map((d) => d.date);
    const indices = [
      0,
      Math.floor(n * 0.25),
      Math.floor(n * 0.5),
      Math.floor(n * 0.75),
      n - 1,
    ];
    return indices.map((i) => formattedData[i].date);
  }, [formattedData]);

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
      <div className="max-w-md rounded-lg border border-border-default bg-surface p-3 text-xs shadow-md text-primary">
        <p className="mb-2 text-sm font-medium text-primary">{dateStr}</p>

        <ul className="space-y-1 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[0] }} />
              <span>{t('ctl')}</span>
            </span>
            <span className="font-medium text-primary">
              {typeof point.ctl === 'number' ? point.ctl.toFixed(1) : '–'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[1] }} />
              <span>{t('atl')}</span>
            </span>
            <span className="font-medium text-primary">
              {typeof point.atl === 'number' ? point.atl.toFixed(1) : '–'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[2] }} />
              <span>{t('tsb')}</span>
            </span>
            <span className="font-medium text-primary">
              {typeof tsb === 'number' ? tsb.toFixed(1) : '–'}
            </span>
          </li>
        </ul>

        {typeof tsb === 'number' && (
          <p className="mt-2 border-t border-border-default pt-2 text-[11px] text-secondary">
            {t('tsbZoneLabel')} {t(getTsbZoneLabelKey(tsb))}
          </p>
        )}

        {ftpChangesForDay.length > 0 && (
          <div className="mt-2 border-t border-border-default pt-2">
            <p className="mb-1 text-[11px] font-semibold text-secondary">{t('ftpChanges')}</p>
            <ul className="space-y-0.5 text-[11px] text-secondary">
              {ftpChangesForDay.map((fc, idx) => (
                <li key={idx}>{formatFtpChangeLabel(fc)}</li>
              ))}
            </ul>
          </div>
        )}

        {activitiesForDay.length > 0 && (
          <div className="mt-2 border-t border-border-default pt-2">
            <p className="mb-1 text-[11px] font-semibold text-secondary">
              {t('activitiesCount', { count: activitiesForDay.length })}
            </p>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-secondary">
              {activitiesForDay.slice(0, 5).map((act) => (
                <li key={act.activityId}>
                  <span className="font-medium">{act.name}</span>{' '}
                  <span className="text-[11px] text-tertiary">
                    ({act.sportType}, {Math.round(act.movingTimeSeconds / 60)} min, TSS:{' '}
                    {act.trainingStressScore != null ? act.trainingStressScore.toFixed(0) : '–'})
                  </span>
                </li>
              ))}
              {activitiesForDay.length > 5 && (
                <li className="text-[11px] text-tertiary">
                  +{activitiesForDay.length - 5} {t('more')}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <h2 className="mb-4 text-xl font-semibold text-primary">{t('pmcTitle')}</h2>

      {/* Obciążenie treningowe (CTL + ATL) */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium text-secondary">{t('trainingLoadTitle')}</h3>
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
              stroke={chartColors[0]}
              strokeWidth={2}
              name={t('ctl')}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="atl"
              stroke={chartColors[1]}
              strokeWidth={2}
              name={t('atl')}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Forma (TSB) */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-secondary">{t('tsb')}</h3>
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
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} ticks={xAxisTicks} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="flex items-center justify-center gap-1 text-secondary">CTL ({t('ctl')}) <InfoTooltip text={t('glossaryCtl')} label="CTL" /></p>
          <p className="text-xs text-tertiary">{t('ctlDaysAverage', { days: ctlDays })}</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 text-secondary">ATL ({t('atl')}) <InfoTooltip text={t('glossaryAtl')} label="ATL" /></p>
          <p className="text-xs text-tertiary">{t('atlDaysAverage', { days: atlDays })}</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 text-secondary">TSB ({t('tsb')}) <InfoTooltip text={t('glossaryTsb')} label="TSB" /></p>
          <p className="text-xs text-tertiary">{t('tsbFormula')}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-tertiary">
        {TSB_ZONES.map((zone, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-3 rounded-sm"
              style={{ backgroundColor: zone.fill, opacity: 0.8 }}
            />
            {t(zone.labelKey)}
          </span>
        ))}
      </div>
    </div>
  );
};
