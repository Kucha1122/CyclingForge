import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, G, Rect, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { ZONE_COLORS } from '@cyclingforge/shared';
import type { WorkoutStepDto } from '@cyclingforge/shared';

// ── Readiness gauge ─────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 20) return '#ef4444';
  if (score < 40) return '#f97316';
  if (score < 60) return '#eab308';
  if (score < 80) return '#22c55e';
  return '#10b981';
}
function scoreLabelKey(score: number): string {
  if (score < 15) return 'readinessRest';
  if (score < 30) return 'readinessRecovery';
  if (score < 45) return 'readinessEasy';
  if (score < 60) return 'readinessModerate';
  if (score < 75) return 'readinessGood';
  return 'readinessPeak';
}

/** 270° arc gauge mirroring the web ReadinessGauge. */
export function ReadinessGauge({ score, size = 160 }: { score: number; size?: number }) {
  const { t } = useTranslation('todayWorkout');
  const strokeWidth = size >= 160 ? 12 : 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const offset = circumference * (1 - progress * 0.75);
  const color = scoreColor(score);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <G rotation={-135} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text style={{ color, fontSize: size >= 160 ? 44 : 28 }} className="font-bold">{Math.round(score)}</Text>
        <Text className="text-xs font-medium text-slate-400">{t(scoreLabelKey(score))}</Text>
      </View>
    </View>
  );
}

// ── Interval chart ──────────────────────────────────────────────

interface Segment {
  duration: number;
  powerLow: number;
  powerHigh: number;
  power: number;
  label: string;
  isRamp?: boolean;
}

const ZONE_BOUNDS = [0, 0.56, 0.76, 0.91, 1.06, 1.21, 2] as const;
function powerToZone(power: number): string {
  if (power < 0.56) return 'Z1';
  if (power < 0.76) return 'Z2';
  if (power < 0.91) return 'Z3';
  if (power < 1.06) return 'Z4';
  if (power < 1.21) return 'Z5';
  return 'Z6';
}

function rampZoneSlices(powerLow: number, powerHigh: number, duration: number) {
  if (duration <= 0) return [];
  if (powerLow === powerHigh) return [{ tStart: 0, tEnd: duration, pStart: powerLow, pEnd: powerLow, zone: powerToZone(powerLow) }];
  const minP = Math.min(powerLow, powerHigh);
  const maxP = Math.max(powerLow, powerHigh);
  const bounds = ZONE_BOUNDS.filter((b) => b > minP && b < maxP);
  const pts = [minP, ...bounds, maxP].sort((a, b) => a - b);
  const pToT = (p: number) => ((p - powerLow) / (powerHigh - powerLow)) * duration;
  const out: { tStart: number; tEnd: number; pStart: number; pEnd: number; zone: string }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    out.push({ tStart: pToT(pts[i]), tEnd: pToT(pts[i + 1]), pStart: pts[i], pEnd: pts[i + 1], zone: powerToZone((pts[i] + pts[i + 1]) / 2) });
  }
  return out;
}

function stepSegments(step: WorkoutStepDto): Segment[] {
  if (step.type === 'Intervals' && step.repeat && step.onDurationSeconds && step.offDurationSeconds) {
    const segs: Segment[] = [];
    for (let i = 0; i < step.repeat; i++) {
      const onPow = step.onPower ?? step.powerHigh;
      const offPow = step.offPower ?? step.powerLow;
      segs.push({ duration: step.onDurationSeconds, power: onPow, powerLow: onPow, powerHigh: onPow, label: 'Intervals — ON' });
      segs.push({ duration: step.offDurationSeconds, power: offPow, powerLow: offPow, powerHigh: offPow, label: 'Intervals — OFF' });
    }
    return segs;
  }
  const isRamp = step.powerLow !== step.powerHigh;
  return [{
    duration: step.durationSeconds,
    power: step.powerHigh,
    powerLow: step.powerLow,
    powerHigh: step.powerHigh,
    label: step.type,
    isRamp: isRamp || step.type === 'Ramp' || step.type === 'Warmup' || step.type === 'Cooldown',
  }];
}

const ZONE_I18N: Record<string, string> = { Z1: 'zone1Short', Z2: 'zone2Short', Z3: 'zone3Short', Z4: 'zone4Short', Z5: 'zone5Short', Z6: 'zone6Short' };
const SEGMENT_I18N: Record<string, string> = {
  'Intervals — ON': 'intervalsOn', 'Intervals — OFF': 'intervalsOff',
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

function fmtMMSS(total: number): string {
  const s = Math.round(total);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
function fmtAxis(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m === 0 ? `${h}h` : `${h}:${m.toString().padStart(2, '0')}`;
  return `${m}m`;
}

const NICE_X = [300, 600, 900, 1200, 1800, 3600];
const GUTTER_L = 30;        // left gutter for %FTP labels — pushed to the far left, inside the panel
const RIGHT_PAD = GUTTER_L; // match the left gutter so the plot is symmetrically inset in the panel
const PAD_TOP = 12;         // headroom for the tallest bar
const AXIS_H = 18;          // bottom gutter for time labels (inside the panel)

// Pick a "nice" Y-axis ceiling (in %FTP) a little above the workout's peak so the
// tallest interval fills the plot instead of being scaled against a fixed 125%.
const Y_MAX_CANDIDATES = [110, 125, 150, 175, 200, 250, 300];
function niceYMax(peakPct: number): number {
  return Y_MAX_CANDIDATES.find((c) => c >= peakPct + 5) ?? Math.ceil((peakPct + 20) / 50) * 50;
}

// Faint zone bands behind the bars give intensity context (Z1 easy → Z6 hard).
const ZONE_BANDS: { zone: string; lo: number; hi: number }[] = [
  { zone: 'Z1', lo: 0, hi: 56 }, { zone: 'Z2', lo: 56, hi: 76 },
  { zone: 'Z3', lo: 76, hi: 91 }, { zone: 'Z4', lo: 91, hi: 106 },
  { zone: 'Z5', lo: 106, hi: 121 }, { zone: 'Z6', lo: 121, hi: 999 },
];

/** Workout power profile: zone-colored bars/ramps with a touch-scrub tooltip. */
export function IntervalChart({ steps, width, height = 184, ftp }: { steps: WorkoutStepDto[]; width: number; height?: number; ftp?: number | null }) {
  const { t } = useTranslation('workouts');
  const [active, setActive] = useState<number | null>(null);

  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const segs = sorted.flatMap(stepSegments);
  const starts: number[] = [];
  let cum = 0;
  for (const s of segs) { starts.push(cum); cum += s.duration; }
  const totalDuration = cum;
  if (totalDuration === 0) return null;

  const peakPct = Math.max(...segs.map((s) => s.power), 1) * 100;
  const yMax = niceYMax(peakPct);   // %FTP ceiling
  const maxScaled = yMax / 100;     // as a power fraction

  // Full-width dark panel; only a thin left gutter is reserved for the %FTP labels.
  const innerW = width - GUTTER_L - RIGHT_PAD;
  const innerH = height - PAD_TOP - AXIS_H;
  const x0 = GUTTER_L;
  const base = PAD_TOP + innerH;
  const endX = x0 + innerW; // = width - RIGHT_PAD
  const xFor = (tt: number) => x0 + (tt / totalDuration) * innerW;
  const yFor = (p: number) => PAD_TOP + innerH - (p / maxScaled) * innerH;

  // Round ticks (25% steps under ~125% ceiling, else 50%), always including 100% FTP.
  const yStep = yMax <= 125 ? 25 : 50;
  const yTicks: number[] = [];
  for (let v = yStep; v <= yMax + 0.1; v += yStep) yTicks.push(v);
  if (yMax > 100 && !yTicks.includes(100)) { yTicks.push(100); yTicks.sort((a, b) => a - b); }
  const xStep = NICE_X.find((s) => s >= totalDuration / 6) ?? NICE_X[NICE_X.length - 1];
  const xTicks: number[] = [];
  // Drop any tick that would crowd the always-shown end label.
  for (let tk = xStep; tk < totalDuration; tk += xStep) {
    if (endX - xFor(tk) > 30) xTicks.push(tk);
  }

  const onTouch = (locationX: number) => {
    const tt = ((locationX - x0) / innerW) * totalDuration;
    let idx = segs.length - 1;
    for (let i = 0; i < segs.length; i++) {
      if (tt < starts[i] + segs[i].duration) { idx = i; break; }
    }
    setActive(Math.max(0, idx));
  };
  const pan = Gesture.Pan().runOnJS(true).minDistance(0)
    .onBegin((e) => onTouch(e.x)).onUpdate((e) => onTouch(e.x)).onFinalize(() => setActive(null));

  const segLabel = (l: string) => (SEGMENT_I18N[l] ? t(SEGMENT_I18N[l]) : l);
  const zoneLabel = (z: string) => (ZONE_I18N[z] ? `${z} ${t(ZONE_I18N[z])}` : z);

  const act = active != null ? segs[active] : null;
  const actZone = act ? powerToZone(act.power) : 'Z1';
  const tipW = 150;
  const tipLeft = active != null ? Math.max(0, Math.min(width - tipW, xFor(starts[active] + act!.duration / 2) - tipW / 2)) : 0;

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {/* Full-width dark plot panel */}
          <Rect x={0} y={0} width={width} height={height} rx={12} fill="#0f172a" />
          {/* Faint zone bands for intensity context */}
          {ZONE_BANDS.map((b) => {
            if (b.lo >= yMax) return null;
            const yTop = yFor(Math.min(b.hi, yMax) / 100);
            const yBot = yFor(b.lo / 100);
            return <Rect key={b.zone} x={x0} y={yTop} width={innerW} height={yBot - yTop} fill={ZONE_COLORS[b.zone]} opacity={0.1} />;
          })}
          {/* Y grid lines (100% is drawn as the dashed FTP line below; labels go on top) */}
          {yTicks.filter((p) => p !== 100).map((p) => (
            <Line key={p} x1={x0} y1={yFor(p / 100)} x2={endX} y2={yFor(p / 100)} stroke="#475569" strokeWidth={0.5} opacity={0.6} />
          ))}
          {/* Segments */}
          {segs.map((seg, i) => {
            const xStart = xFor(starts[i]);
            const dimmed = active != null && active !== i;
            const op = dimmed ? 0.4 : 0.9;
            if (seg.isRamp && seg.powerLow !== seg.powerHigh) {
              return rampZoneSlices(seg.powerLow, seg.powerHigh, seg.duration).map((sl, si) => {
                const x1 = xFor(starts[i] + sl.tStart);
                const x2 = xFor(starts[i] + sl.tEnd);
                return (
                  <Polygon key={`${i}-${si}`} points={`${x1},${base} ${x1},${yFor(sl.pStart)} ${x2},${yFor(sl.pEnd)} ${x2},${base}`} fill={ZONE_COLORS[sl.zone]} opacity={op} />
                );
              });
            }
            const zone = powerToZone(seg.power);
            const y = yFor(seg.power);
            return <Rect key={i} x={xStart} y={y} width={Math.max(0.5, xFor(starts[i] + seg.duration) - xStart)} height={base - y} fill={ZONE_COLORS[zone]} opacity={op} />;
          })}
          {/* FTP (100%) line */}
          <Line x1={x0} y1={yFor(1)} x2={endX} y2={yFor(1)} stroke="rgba(255,255,255,0.35)" strokeWidth={1} strokeDasharray="4 4" />
          {/* Active cursor */}
          {active != null && <Line x1={xFor(starts[active] + act!.duration / 2)} y1={PAD_TOP} x2={xFor(starts[active] + act!.duration / 2)} y2={base} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />}
          {/* Y-axis %FTP labels — pushed to the far left inside the panel; single string so
              "100%" stays glued together and never drifts onto the bars */}
          {yTicks.map((p) => (
            <SvgText key={`yl${p}`} x={GUTTER_L - 5} y={yFor(p / 100) + 3} fontSize={9} fill={p === 100 ? '#f1f5f9' : '#94a3b8'} textAnchor="end" fontWeight={p === 100 ? 'bold' : 'normal'}>{`${p}%`}</SvgText>
          ))}
          {/* X-axis time labels */}
          {xTicks.map((tk) => (
            <SvgText key={tk} x={xFor(tk)} y={height - 4} fontSize={8} fill="#94a3b8" textAnchor="middle">{fmtAxis(tk)}</SvgText>
          ))}
          <SvgText x={endX} y={height - 4} fontSize={8} fill="#94a3b8" textAnchor="end">{fmtAxis(totalDuration)}</SvgText>
        </Svg>
        {act && (
          <View style={{ position: 'absolute', top: 4, left: tipLeft, width: tipW }} className="bg-slate-800 rounded-lg px-2 py-1.5">
            <Text className="text-[11px] font-semibold text-white">{segLabel(act.label)}</Text>
            <Text className="text-[10px] text-slate-300 mt-0.5">{fmtMMSS(act.duration)}</Text>
            <Text className="text-[10px] text-slate-300">
              {act.powerLow === act.powerHigh ? `${Math.round(act.powerHigh * 100)}% FTP` : `${Math.round(act.powerLow * 100)}–${Math.round(act.powerHigh * 100)}% FTP`}
              {ftp && ftp > 0 ? ` · ${act.powerLow === act.powerHigh ? Math.round(act.powerHigh * ftp) : `${Math.round(act.powerLow * ftp)}–${Math.round(act.powerHigh * ftp)}`}W` : ''}
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: ZONE_COLORS[actZone] }} className="rounded px-1.5 py-0.5 mt-1">
              <Text className="text-[9px] font-medium text-white">{zoneLabel(actZone)}</Text>
            </View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}
