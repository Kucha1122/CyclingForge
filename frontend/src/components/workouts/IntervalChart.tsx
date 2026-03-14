import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkoutStepDto } from '../../types/workout';
import { ZONE_COLORS } from '../../types/workout';

interface IntervalChartProps {
  steps: WorkoutStepDto[];
  height?: number;
  ftp?: number;
}

interface SegmentMeta {
  duration: number;
  power: number;
  label: string;
  powerLow: number;
  powerHigh: number;
}

interface TooltipState {
  x: number;
  y: number;
  segment: SegmentMeta;
  zone: string;
}

function powerToZone(power: number): string {
  if (power < 0.56) return 'Z1';
  if (power < 0.76) return 'Z2';
  if (power < 0.91) return 'Z3';
  if (power < 1.06) return 'Z4';
  if (power < 1.21) return 'Z5';
  return 'Z6';
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

  // Show ramp whenever powerLow !== powerHigh (any step type)
  const isRamp = step.powerLow !== step.powerHigh;
  if (isRamp || step.type === 'Ramp' || step.type === 'Warmup' || step.type === 'Cooldown') {
    const numSegments = Math.max(2, Math.ceil(step.durationSeconds / 30));
    const segDuration = step.durationSeconds / numSegments;
    return Array.from({ length: numSegments }, (_, i) => {
      const power = step.powerLow + (step.powerHigh - step.powerLow) * (i / (numSegments - 1));
      return {
        duration: segDuration,
        power,
        label: step.type,
        powerLow: step.powerLow,
        powerHigh: step.powerHigh,
      };
    });
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

export const IntervalChart = ({ steps, height = 160, ftp }: IntervalChartProps) => {
  const { t } = useTranslation('workouts');
  const containerRef = useRef<HTMLDivElement>(null);
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
  const allSegments = sortedSteps.flatMap(getStepSegments);

  const segmentStarts: number[] = [];
  let cumulative = 0;
  for (const seg of allSegments) {
    segmentStarts.push(cumulative);
    cumulative += seg.duration;
  }
  const totalDuration = cumulative;
  const maxPower = Math.max(...allSegments.map(s => s.power), 1.2);

  if (totalDuration === 0) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setContainerWidth(rect.width);

    const relX = (e.clientX - rect.left) / rect.width;
    const svgX = relX * totalDuration;

    let idx = allSegments.length - 1;
    for (let i = 0; i < allSegments.length; i++) {
      if (svgX < segmentStarts[i] + allSegments[i].duration) {
        idx = i;
        break;
      }
    }

    const seg = allSegments[idx];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      segment: seg,
      zone: powerToZone(seg.power),
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const tooltipLeft = tooltip
    ? tooltip.x > containerWidth * 0.65
      ? tooltip.x - 168
      : tooltip.x + 12
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg bg-gray-900"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${totalDuration} ${maxPower * 100}`}
        preserveAspectRatio="none"
      >
        {allSegments.reduce<{ x: number; elements: React.ReactElement[] }>(
          (acc, seg, i) => {
            const barHeight = seg.power * 100;
            const zone = powerToZone(seg.power);
            acc.elements.push(
              <rect
                key={i}
                x={acc.x}
                y={(maxPower * 100) - barHeight}
                width={seg.duration}
                height={barHeight}
                fill={ZONE_COLORS[zone]}
                opacity={0.85}
              />
            );
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
  );
};
