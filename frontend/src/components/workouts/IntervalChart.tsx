import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkoutStepDto } from '../../types/workout';
import { ZONE_COLORS } from '../../types/workout';

interface IntervalChartProps {
  steps: WorkoutStepDto[];
  height?: number;
  ftp?: number;
  highlightedStepOrder?: number | null;
}

interface SegmentMeta {
  duration: number;
  power: number;
  label: string;
  powerLow: number;
  powerHigh: number;
  isRamp?: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  segment: SegmentMeta;
  zone: string;
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

/** For a ramp from powerLow to powerHigh over duration: return zone slices (time in seconds, power at edges, zone). */
function getRampZoneSlices(powerLow: number, powerHigh: number, duration: number): { tStart: number; tEnd: number; powerStart: number; powerEnd: number; zone: string }[] {
  if (duration <= 0) return [];
  if (powerLow === powerHigh) {
    return [{ tStart: 0, tEnd: duration, powerStart: powerLow, powerEnd: powerLow, zone: powerToZone(powerLow) }];
  }
  const minP = Math.min(powerLow, powerHigh);
  const maxP = Math.max(powerLow, powerHigh);
  const boundaries = ZONE_BOUNDS.filter((b) => b > minP && b < maxP);
  const points = [minP, ...boundaries, maxP].sort((a, b) => a - b);
  const powerToT = (p: number) => ((p - powerLow) / (powerHigh - powerLow)) * duration;

  const slices: { tStart: number; tEnd: number; powerStart: number; powerEnd: number; zone: string }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const powerStart = points[i];
    const powerEnd = points[i + 1];
    const tStart = powerToT(powerStart);
    const tEnd = powerToT(powerEnd);
    const zone = powerToZone((powerStart + powerEnd) / 2);
    slices.push({ tStart, tEnd, powerStart, powerEnd, zone });
  }
  return slices;
}

const ZONE_I18N_KEYS: Record<string, string> = {
  Z1: 'zone1Short', Z2: 'zone2Short', Z3: 'zone3Short',
  Z4: 'zone4Short', Z5: 'zone5Short', Z6: 'zone6Short',
};
const SEGMENT_LABEL_KEYS: Record<string, string> = {
  'Intervals — ON': 'intervalsOn', 'Intervals — OFF': 'intervalsOff',
  Warmup: 'stepWarmup', Cooldown: 'stepCooldown', SteadyState: 'stepSteadyState',
  Ramp: 'stepRamp', Intervals: 'stepIntervals', FreeRide: 'stepFreeRide',
};

function getStepSegments(step: WorkoutStepDto): SegmentMeta[] {
  if (step.type === 'Intervals' && step.repeat && step.onDurationSeconds && step.offDurationSeconds) {
    const segments: SegmentMeta[] = [];
    for (let i = 0; i < step.repeat; i++) {
      const onPow = step.onPower ?? step.powerHigh;
      const offPow = step.offPower ?? step.powerLow;
      segments.push({
        duration: step.onDurationSeconds,
        power: onPow,
        label: 'Intervals — ON',
        powerLow: onPow,
        powerHigh: onPow,
      });
      segments.push({
        duration: step.offDurationSeconds,
        power: offPow,
        label: 'Intervals — OFF',
        powerLow: offPow,
        powerHigh: offPow,
      });
    }
    return segments;
  }

  // Show ramp whenever powerLow !== powerHigh (any step type) – single segment for smooth trapezoid
  const isRamp = step.powerLow !== step.powerHigh;
  if (isRamp || step.type === 'Ramp' || step.type === 'Warmup' || step.type === 'Cooldown') {
    return [{
      duration: step.durationSeconds,
      power: step.powerHigh,
      label: step.type,
      powerLow: step.powerLow,
      powerHigh: step.powerHigh,
      isRamp: true,
    }];
  }

  return [{
    duration: step.durationSeconds,
    power: step.powerHigh,
    label: step.type,
    powerLow: step.powerLow,
    powerHigh: step.powerHigh,
  }];
}

function formatSeconds(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatAxisTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) return `${Math.floor(mins / 60)}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const Y_AXIS_WIDTH = 40;
const X_AXIS_HEIGHT = 32;
const CHART_PADDING_LEFT = 0.02;
const CHART_PADDING_RIGHT = 0.045;
const CHART_SCALE_X = 1 - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;

/** Nice tick steps in seconds (5min, 10min, 15min, 20min, 30min, 1h) for readable X-axis. */
const NICE_X_STEPS = [300, 600, 900, 1200, 1800, 3600];
const MAX_X_TICKS = 6;
/** Min share of chart width between last tick and end label to avoid overlap (e.g. "2:20" vs "2:28"). */
const MIN_END_GAP_FRACTION = 0.14;

function getXTickStep(totalDuration: number): number {
  if (totalDuration <= 0) return 600;
  const desiredStep = totalDuration / MAX_X_TICKS;
  const step = NICE_X_STEPS.find((s) => s >= desiredStep) ?? NICE_X_STEPS[NICE_X_STEPS.length - 1];
  return step;
}

export const IntervalChart = ({ steps, height = 160, ftp, highlightedStepOrder = null }: IntervalChartProps) => {
  const { t } = useTranslation('workouts');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const getZoneLabel = (zone: string) => {
    const key = ZONE_I18N_KEYS[zone];
    return key ? `Z${zone.slice(1)} ${t(key)}` : zone;
  };
  const getSegmentLabel = (label: string) => {
    const key = SEGMENT_LABEL_KEYS[label];
    return key ? t(key) : label;
  };

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  const stepOrderBySegmentIndex: number[] = [];
  const allSegments = sortedSteps.flatMap((step) => {
    const segs = getStepSegments(step);
    segs.forEach(() => stepOrderBySegmentIndex.push(step.order));
    return segs;
  });

  const segmentStarts: number[] = [];
  let cumulative = 0;
  for (const seg of allSegments) {
    segmentStarts.push(cumulative);
    cumulative += seg.duration;
  }
  const totalDuration = cumulative;
  const maxPower = Math.max(...allSegments.map(s => s.power), 1.2);

  if (totalDuration === 0) return null;

  const yTicks = maxPower > 1.2 ? [0, 25, 50, 75, 100, 125] : [0, 25, 50, 75, 100];
  const xTickStep = getXTickStep(totalDuration);
  const xTicks: number[] = [];
  for (let t = 0; t < totalDuration; t += xTickStep) xTicks.push(t);
  const lastTick = xTicks[xTicks.length - 1] ?? 0;
  const minGapSeconds = totalDuration * MIN_END_GAP_FRACTION;
  if (totalDuration - lastTick >= minGapSeconds) xTicks.push(totalDuration);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const chartRect = chartAreaRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setContainerWidth(containerRect.width);

    const rect = chartRect ?? containerRect;
    const relX = (e.clientX - rect.left) / rect.width;
    const svgX = Math.max(
      0,
      Math.min(totalDuration, (totalDuration * (relX - CHART_PADDING_LEFT)) / CHART_SCALE_X)
    );

    let idx = allSegments.length - 1;
    for (let i = 0; i < allSegments.length; i++) {
      if (svgX < segmentStarts[i] + allSegments[i].duration) {
        idx = i;
        break;
      }
    }

    const seg = allSegments[idx];
    const tooltipParentRect = chartRect ?? containerRect;
    setTooltip({
      x: e.clientX - tooltipParentRect.left,
      y: e.clientY - tooltipParentRect.top,
      segment: seg,
      zone: powerToZone(seg.power),
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const chartWidth = containerWidth > 0 ? containerWidth - Y_AXIS_WIDTH : 0;
  const tooltipLeft = tooltip
    ? tooltip.x > chartWidth * 0.65
      ? tooltip.x - 168
      : tooltip.x + 12
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex w-full overflow-hidden rounded-lg bg-gray-900"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex shrink-0 flex-col" style={{ width: Y_AXIS_WIDTH }}>
        <div className="relative min-h-0 flex-1 pb-2 pt-1.5 pr-1.5 pl-1" aria-hidden>
          {yTicks.filter((p) => p > 0).map((p) => (
            <span
              key={p}
              className="absolute right-0 text-right text-xs text-gray-400"
              style={{
                top: `${((maxPower * 100 - p) / (maxPower * 100)) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {p}%
            </span>
          ))}
        </div>
        <div style={{ height: X_AXIS_HEIGHT, minHeight: X_AXIS_HEIGHT }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={chartAreaRef} className="relative min-h-0 flex-1">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${totalDuration} ${maxPower * 100}`}
            preserveAspectRatio="none"
          >
            <g transform={`translate(${totalDuration * CHART_PADDING_LEFT}, 0) scale(${CHART_SCALE_X}, 1)`}>
        {allSegments.reduce<{ x: number; elements: React.ReactElement[] }>(
          (acc, seg, i) => {
            const maxY = maxPower * 100;
            const zone = powerToZone(seg.power);
            const isHighlighted = highlightedStepOrder != null && Number(stepOrderBySegmentIndex[i]) === Number(highlightedStepOrder);
            const opacity = highlightedStepOrder == null ? 0.85 : isHighlighted ? 1 : 0.35;
            const stroke = isHighlighted ? 'rgba(255,255,255,0.8)' : undefined;
            const strokeWidth = isHighlighted ? 1 : 0;

            if (seg.isRamp) {
              const x = acc.x;
              const slices = getRampZoneSlices(seg.powerLow, seg.powerHigh, seg.duration);
              slices.forEach((slice, si) => {
                const x1 = x + slice.tStart;
                const x2 = x + slice.tEnd;
                const y1Top = maxY - slice.powerStart * 100;
                const y2Top = maxY - slice.powerEnd * 100;
                const pts = `${x1},${maxY} ${x1},${y1Top} ${x2},${y2Top} ${x2},${maxY}`;
                acc.elements.push(
                  <polygon
                    key={`${i}-${si}`}
                    points={pts}
                    fill={ZONE_COLORS[slice.zone]}
                    opacity={opacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    style={{ transition: 'opacity 0.2s ease-out' }}
                  />
                );
              });
            } else {
              const barHeight = seg.power * 100;
              acc.elements.push(
                <rect
                  key={i}
                  x={acc.x}
                  y={maxY - barHeight}
                  width={seg.duration}
                  height={barHeight}
                  fill={ZONE_COLORS[zone]}
                  opacity={opacity}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ transition: 'opacity 0.2s ease-out' }}
                />
              );
            }
            return { x: acc.x + seg.duration, elements: acc.elements };
          },
          { x: 0, elements: [] }
        ).elements}

        <line
          x1={0} y1={(maxPower - 1) * 100}
          x2={totalDuration} y2={(maxPower - 1) * 100}
          stroke="rgba(255,255,255,0.3)"
          strokeDasharray="4,4"
          strokeWidth={1}
        />
            </g>
          </svg>

          {tooltip && (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10"
          style={{ left: tooltipLeft, top: Math.max(4, tooltip.y - 80) }}
        >
          <p className="font-semibold">{getSegmentLabel(tooltip.segment.label)}</p>
          <p className="mt-0.5 text-gray-300">
            {formatSeconds(tooltip.segment.duration)}
          </p>
          <p className="text-gray-300">
            {tooltip.segment.powerLow === tooltip.segment.powerHigh
              ? `${Math.round(tooltip.segment.powerHigh * 100)}% FTP`
              : `${Math.round(tooltip.segment.powerLow * 100)}–${Math.round(tooltip.segment.powerHigh * 100)}% FTP`}
          </p>
          {ftp && ftp > 0 && (
            <p className="font-medium text-yellow-300">
              {tooltip.segment.powerLow === tooltip.segment.powerHigh
                ? `${Math.round(tooltip.segment.powerHigh * ftp)}W`
                : `${Math.round(tooltip.segment.powerLow * ftp)}–${Math.round(tooltip.segment.powerHigh * ftp)}W`}
            </p>
          )}
          <p
            className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: ZONE_COLORS[tooltip.zone], color: '#fff' }}
          >
            {getZoneLabel(tooltip.zone)}
          </p>
        </div>
          )}
        </div>
        <div
          className="relative mt-2 shrink-0 pl-2 pr-1 pt-1 pb-0.5 text-xs text-gray-400"
          style={{ height: X_AXIS_HEIGHT }}
          aria-hidden
        >
          {xTicks.filter((t) => t > 0).map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{
                left: `${(CHART_PADDING_LEFT + (t / totalDuration) * CHART_SCALE_X) * 100}%`,
              }}
            >
              {formatAxisTime(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
