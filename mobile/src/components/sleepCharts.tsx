import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Polyline, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import type { SleepDataDto, HrvDataDto, SleepLevelDto } from '@cyclingforge/shared';
import { formatDuration } from '../utils/format';

// Sleep-stage palette shared across the mobile sleep UI. Mirrors the web Sleep
// page (indigo / violet / sky / amber) so the two clients read identically.
export const STAGE_COLORS = {
  deep: '#4338ca',
  rem: '#8b5cf6',
  light: '#38bdf8',
  awake: '#fbbf24',
} as const;

const AXIS_W = 30;
const AXIS_H = 16;

function axisColor(isDark: boolean) {
  return isDark ? '#64748b' : '#94a3b8';
}
function gridColor(isDark: boolean) {
  return isDark ? '#334155' : '#e2e8f0';
}

function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

/** "YYYY-MM-DD HH:MM:SS" (UTC) → ms epoch. */
function gmtToMs(s: string): number {
  return new Date(s.replace(' ', 'T') + 'Z').getTime();
}

/** ms epoch → local "HH:MM". */
function msToLocal(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Naive datetime string (no 'Z') → local wall-clock "HH:MM". */
function formatLocalTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Pick ~5 evenly spaced X-axis label indices so dates stay legible.
function labelIndices(n: number): number[] {
  if (n <= 0) return [];
  const out: number[] = [];
  const step = Math.max(1, Math.floor(n / 5));
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

interface ChartProps {
  data: SleepDataDto[];
  width: number;
  isDark: boolean;
}

/**
 * Sleep duration bars (left axis, 0–12h) with an optional HRV line overlay on a
 * right axis — the mobile equivalent of the web ComposedChart.
 */
export function SleepDurationChart({ data, hrvData = [], width, isDark }: ChartProps & { hrvData?: HrvDataDto[] }) {
  const height = 220;
  const padTop = 8;
  const hrvByDate = Object.fromEntries(hrvData.map((h) => [h.date, h.lastNightAvgMs]));

  const rows = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      label: d.date.slice(5),
      hours: toHours(d.totalSleepSeconds),
      hrv: hrvByDate[d.date] ?? null,
    }));

  const hrvVals = rows.map((r) => r.hrv).filter((v): v is number => v != null);
  const hasHrv = hrvVals.length > 0;
  const gutterR = hasHrv ? AXIS_W : 6;
  const innerW = width - AXIS_W - gutterR;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const n = Math.max(rows.length, 1);
  const slot = innerW / n;
  const barW = Math.max(2, slot * 0.6);

  const sleepMax = 12;
  const hrvLo = hasHrv ? Math.min(...hrvVals) * 0.9 : 0;
  const hrvHi = hasHrv ? Math.max(...hrvVals) * 1.1 : 1;
  const hrvSpan = hrvHi - hrvLo || 1;

  const ySleep = (h: number) => padTop + innerH - (h / sleepMax) * innerH;
  const yHrv = (v: number) => padTop + innerH - ((v - hrvLo) / hrvSpan) * innerH;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const idxs = labelIndices(n);

  const hrvPts = rows
    .map((r, i) => (r.hrv == null ? null : `${(x0 + i * slot + slot / 2).toFixed(1)},${yHrv(r.hrv).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');

  return (
    <Svg width={width} height={height}>
      {ticks.map((f) => {
        const y = padTop + innerH * f;
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">
              {Math.round(sleepMax * (1 - f))}h
            </SvgText>
          </G>
        );
      })}
      {rows.map((r, i) => {
        const h = (r.hours / sleepMax) * innerH;
        const x = x0 + i * slot + (slot - barW) / 2;
        return <Rect key={i} x={x} y={padTop + innerH - h} width={barW} height={Math.max(0, h)} rx={2} fill="#6366f1" />;
      })}
      {hasHrv && (
        <>
          {[0, 0.5, 1].map((f) => (
            <SvgText key={`hr${f}`} x={x0 + innerW + 4} y={padTop + innerH * f + 4} fontSize={9} fill="#10b981" textAnchor="start">
              {Math.round(hrvHi - hrvSpan * f)}
            </SvgText>
          ))}
          <Polyline points={hrvPts} fill="none" stroke="#10b981" strokeWidth={2} />
          {rows.map((r, i) =>
            r.hrv == null ? null : (
              <Circle key={i} cx={x0 + i * slot + slot / 2} cy={yHrv(r.hrv)} r={2.5} fill="#10b981" />
            )
          )}
        </>
      )}
      {idxs.map((i) => (
        <SvgText key={i} x={x0 + i * slot + slot / 2} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">
          {rows[i]?.label}
        </SvgText>
      ))}
    </Svg>
  );
}

/** Stacked sleep-stage bars (deep / rem / light / awake) over the period. */
export function SleepStagesChart({ data, width, isDark }: ChartProps) {
  const height = 220;
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;

  const rows = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      label: d.date.slice(5),
      deep: d.deepSleepSeconds,
      rem: d.remSleepSeconds,
      light: d.lightSleepSeconds,
      awake: d.awakeSeconds,
      total: d.deepSleepSeconds + d.remSleepSeconds + d.lightSleepSeconds + d.awakeSeconds,
    }));

  const maxSec = Math.max(1, ...rows.map((r) => r.total));
  const maxH = Math.ceil((maxSec / 3600) * 1.1);
  const maxV = maxH * 3600;
  const n = Math.max(rows.length, 1);
  const slot = innerW / n;
  const barW = Math.max(2, slot * 0.6);
  const idxs = labelIndices(n);

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const segOrder = ['deep', 'rem', 'light', 'awake'] as const;

  return (
    <Svg width={width} height={height}>
      {ticks.map((f) => {
        const y = padTop + innerH * f;
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">
              {Math.round(maxH * (1 - f))}h
            </SvgText>
          </G>
        );
      })}
      {rows.map((r, i) => {
        const x = x0 + i * slot + (slot - barW) / 2;
        let yCursor = padTop + innerH;
        return (
          <G key={i}>
            {segOrder.map((key) => {
              const h = (r[key] / maxV) * innerH;
              yCursor -= h;
              return <Rect key={key} x={x} y={yCursor} width={barW} height={Math.max(0, h)} fill={STAGE_COLORS[key]} />;
            })}
          </G>
        );
      })}
      {idxs.map((i) => (
        <SvgText key={i} x={x0 + i * slot + slot / 2} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">
          {rows[i]?.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// Garmin activityLevel: 0=deep, 1=light, 2=rem, 3/4=awake.
// Standard hypnogram lanes: awake at top, deep at bottom.
const HYP_BAND: Record<number, number> = { 0: 3, 1: 2, 2: 1, 3: 0, 4: 0 };
const HYP_COLOR: Record<number, string> = {
  0: STAGE_COLORS.deep,
  1: STAGE_COLORS.light,
  2: STAGE_COLORS.rem,
  3: STAGE_COLORS.awake,
  4: STAGE_COLORS.awake,
};
const HYP_Y_LABELS = ['awake', 'rem', 'light', 'deep'] as const;

/** Single-night hypnogram timeline rendered as stacked SVG segments. */
export function SleepHypnogram({ levels, width, isDark }: { levels: SleepLevelDto[]; width: number; isDark: boolean }) {
  const { t } = useTranslation('sleep');
  if (!levels || levels.length === 0) return null;

  const bandH = 22;
  const bands = 4;
  const yLabelW = 42;
  const timeAxisH = 16;
  const chartH = bands * bandH;
  const plotW = width - yLabelW;

  const starts = levels.map((l) => gmtToMs(l.startGmt));
  const ends = levels.map((l) => gmtToMs(l.endGmt));
  const minT = Math.min(...starts);
  const maxT = Math.max(...ends);
  const totalMs = maxT - minT;
  if (totalMs <= 0) return null;

  const toX = (ms: number) => ((ms - minT) / totalMs) * plotW;

  // Hourly ticks across the night.
  const firstTick = new Date(minT);
  firstTick.setUTCMinutes(0, 0, 0);
  firstTick.setUTCHours(firstTick.getUTCHours() + 1);
  const ticks: number[] = [];
  for (let tk = firstTick.getTime(); tk < maxT; tk += 3_600_000) ticks.push(tk);

  return (
    <Svg width={width} height={chartH + timeAxisH}>
      {/* Y-axis lane labels */}
      {HYP_Y_LABELS.map((key, i) => (
        <SvgText key={key} x={yLabelW - 6} y={i * bandH + bandH / 2 + 3} fontSize={9} fill={axisColor(isDark)} textAnchor="end">
          {t(key)}
        </SvgText>
      ))}
      {/* Lane separators */}
      {[1, 2, 3].map((i) => (
        <Line key={i} x1={yLabelW} y1={i * bandH} x2={width} y2={i * bandH} stroke={gridColor(isDark)} strokeWidth={0.5} opacity={0.5} />
      ))}
      {/* Stage segments */}
      {levels.map((l, i) => {
        const level = Math.min(Math.round(l.activityLevel), 4);
        const band = HYP_BAND[level] ?? 0;
        const left = yLabelW + toX(gmtToMs(l.startGmt));
        const w = toX(gmtToMs(l.endGmt)) - toX(gmtToMs(l.startGmt));
        return <Rect key={i} x={left} y={band * bandH} width={Math.max(0.5, w)} height={bandH} fill={HYP_COLOR[level] ?? '#64748b'} />;
      })}
      {/* Time axis */}
      <SvgText x={yLabelW} y={chartH + timeAxisH - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="start">
        {msToLocal(minT)}
      </SvgText>
      {ticks.map((tk) => (
        <SvgText key={tk} x={yLabelW + toX(tk)} y={chartH + timeAxisH - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">
          {msToLocal(tk)}
        </SvgText>
      ))}
      <SvgText x={width} y={chartH + timeAxisH - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="end">
        {msToLocal(maxT)}
      </SvgText>
    </Svg>
  );
}

function scoreColors(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'rgba(16,185,129,0.12)', text: '#10b981' };
  if (score >= 60) return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' };
  return { bg: 'rgba(244,63,94,0.12)', text: '#f43f5e' };
}

/** A single night's detail card: header, hypnogram, stage durations, HRV, vitals. */
export function SleepNightCard({ sleep, hrv, width, isDark }: { sleep: SleepDataDto; hrv: HrvDataDto | null; width: number; isDark: boolean }) {
  const { t } = useTranslation('sleep');
  const total = sleep.totalSleepSeconds || 1;

  const stages = [
    { key: 'deep' as const, seconds: sleep.deepSleepSeconds, color: STAGE_COLORS.deep },
    { key: 'rem' as const, seconds: sleep.remSleepSeconds, color: STAGE_COLORS.rem },
    { key: 'light' as const, seconds: sleep.lightSleepSeconds, color: STAGE_COLORS.light },
    { key: 'awake' as const, seconds: sleep.awakeSeconds, color: STAGE_COLORS.awake },
  ];

  const hasHypnogram = sleep.sleepLevels && sleep.sleepLevels.length > 0;
  const hasHrv = hrv && (hrv.lastNightAvgMs != null || hrv.lastNight5MinHighMs != null);
  const score = sleep.sleepScore;
  const sc = score != null ? scoreColors(score) : null;
  // Card inner content width: card has p-4 (16px) padding both sides.
  const innerW = width - 32;

  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View>
          <Text className="text-xs text-slate-400">{sleep.date}</Text>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{formatDuration(sleep.totalSleepSeconds)}</Text>
          <Text className="text-xs text-slate-400">
            {formatLocalTime(sleep.sleepStartTime)} – {formatLocalTime(sleep.sleepEndTime)}
          </Text>
        </View>
        {sc && (
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: sc.bg }}>
            <Text className="text-sm font-bold" style={{ color: sc.text }}>{score}</Text>
          </View>
        )}
      </View>

      {/* Hypnogram or fallback proportion bar */}
      {hasHypnogram ? (
        <View className="mb-3">
          <SleepHypnogram levels={sleep.sleepLevels} width={innerW} isDark={isDark} />
          <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {stages.map((s) => (
              <View key={s.key} className="flex-row items-center gap-1">
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
                <Text className="text-[10px] text-slate-400">{t(s.key)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="flex-row h-3 rounded-full overflow-hidden mb-3">
          {stages.map((s) => (
            <View key={s.key} style={{ flex: s.seconds / total, backgroundColor: s.color }} />
          ))}
        </View>
      )}

      {/* Stage durations */}
      <View className="flex-row pt-3 border-t border-slate-100 dark:border-slate-700">
        {stages.map((s) => (
          <View key={s.key} className="flex-1 items-center">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} className="mb-1" />
            <Text className="text-[11px] text-slate-400">{t(s.key)}</Text>
            <Text className="text-xs font-semibold text-slate-900 dark:text-white">{formatDuration(s.seconds)}</Text>
          </View>
        ))}
      </View>

      {/* HRV */}
      {hasHrv && (
        <View className="flex-row pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
          {hrv!.lastNightAvgMs != null && (
            <View className="flex-1">
              <Text className="text-[11px] text-slate-400">{t('hrvAvg')}</Text>
              <Text className="text-lg font-bold text-emerald-500">
                {hrv!.lastNightAvgMs}<Text className="text-xs font-normal text-slate-400"> ms</Text>
              </Text>
            </View>
          )}
          {hrv!.lastNight5MinHighMs != null && (
            <View className="flex-1">
              <Text className="text-[11px] text-slate-400">{t('hrv5MinHigh')}</Text>
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {hrv!.lastNight5MinHighMs}<Text className="text-xs font-normal text-slate-400"> ms</Text>
              </Text>
            </View>
          )}
          {hrv!.status && (
            <View className="items-end">
              <Text className="text-[11px] text-slate-400">{t('hrvStatus')}</Text>
              <Text className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{hrv!.status.toLowerCase()}</Text>
            </View>
          )}
        </View>
      )}

      {/* Vitals */}
      {(sleep.averageSpO2 != null || sleep.averageRespirationRate != null) && (
        <View className="flex-row pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
          {sleep.averageSpO2 != null && (
            <View className="flex-1">
              <Text className="text-[11px] text-slate-400">SpO2</Text>
              <Text className="text-base font-bold text-sky-400">
                {sleep.averageSpO2.toFixed(1)}<Text className="text-xs font-normal text-slate-400">%</Text>
              </Text>
            </View>
          )}
          {sleep.averageRespirationRate != null && (
            <View className="flex-1">
              <Text className="text-[11px] text-slate-400">{t('respiration')}</Text>
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {sleep.averageRespirationRate.toFixed(1)}<Text className="text-xs font-normal text-slate-400"> br/min</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
