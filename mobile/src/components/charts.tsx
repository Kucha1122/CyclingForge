import React from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Polyline, Polygon, Line, Rect, Circle, G, Text as SvgText } from 'react-native-svg';

// Lightweight SVG charts mirroring the web frontend's Recharts visuals.
// Dependency-free (only react-native-svg) for guaranteed Expo Go support.

const AXIS_W = 32; // left gutter for Y-axis labels
const AXIS_H = 16; // bottom gutter for X-axis labels

function niceMax(max: number, floor = 80): number {
  const padded = Math.ceil((max * 1.1) / 10) * 10;
  return Math.max(floor, padded || floor);
}

function axisColor(isDark: boolean) {
  return isDark ? '#64748b' : '#94a3b8';
}
function gridColor(isDark: boolean) {
  return isDark ? '#334155' : '#e2e8f0';
}

interface Series {
  values: number[];
  color: string;
}

/** Multi-line chart with numeric Y axis (e.g. CTL + ATL). */
export function LineChartMulti({
  series, width, height = 190, isDark,
}: { series: Series[]; width: number; height?: number; isDark: boolean }) {
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const allVals = series.flatMap((s) => s.values);
  const maxV = niceMax(Math.max(1, ...allVals));
  const n = Math.max(...series.map((s) => s.values.length), 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const toPoints = (vals: number[]) =>
    vals.map((v, i) => {
      const x = x0 + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
      const y = padTop + innerH - (v / maxV) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

  return (
    <Svg width={width} height={height}>
      {ticks.map((f) => {
        const y = padTop + innerH * f;
        const val = Math.round(maxV * (1 - f));
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">{val}</SvgText>
          </G>
        );
      })}
      {series.map((s, idx) => (
        <Polyline key={idx} points={toPoints(s.values)} fill="none" stroke={s.color} strokeWidth={2} />
      ))}
    </Svg>
  );
}

const TSB_ZONES = [
  { y1: -55, y2: -35, fill: '#ef4444' },
  { y1: -35, y2: -10, fill: '#10b981' },
  { y1: -10, y2: 5, fill: '#64748b' },
  { y1: 5, y2: 25, fill: '#3b82f6' },
  { y1: 25, y2: 55, fill: '#8b5cf6' },
];

// Transition zone (Przejściowa): -10 <= tsb < 5  -> line is gray; otherwise green.
function isTransition(tsb: number): boolean {
  return tsb >= -10 && tsb < 5;
}

/**
 * TSB (form) line over faint zone bands, domain [-55, 55], with numeric Y axis.
 * The line is colored per-segment exactly like the web PMC chart: slate-gray
 * while inside the transition zone, green once it crosses out of it.
 */
export function TsbZoneChart({
  values, width, height = 170, isDark,
}: { values: number[]; width: number; height?: number; isDark: boolean }) {
  const padTop = 6;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const min = -55, max = 55, span = max - min;
  const n = Math.max(values.length, 1);

  const yFor = (v: number) => padTop + innerH - ((v - min) / span) * innerH;
  const xFor = (i: number) => x0 + (n <= 1 ? 0 : (i / (n - 1)) * innerW);

  const TRANSITION_GRAY = '#64748b';
  const PRODUCTIVE_GREEN = '#10b981';
  const BOUNDS = [-10, 5]; // edges of the transition zone

  // Build a continuous line where the color flips exactly where the line crosses
  // a transition-zone boundary (interpolated), not at the nearest data point.
  type Seg = { x1: number; y1: number; x2: number; y2: number; transition: boolean };
  const lineSegs: Seg[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const v0 = values[i];
    const v1 = values[i + 1];
    const px0 = xFor(i);
    const px1 = xFor(i + 1);
    // Crossing points along this edge, ordered from v0 toward v1.
    const crossings = BOUNDS.filter((b) => (v0 < b && v1 > b) || (v0 > b && v1 < b))
      .map((b) => ({ v: b, f: (b - v0) / (v1 - v0) }))
      .sort((a, b) => a.f - b.f);
    let prevF = 0, prevV = v0;
    for (const c of crossings) {
      const midV = (prevV + c.v) / 2;
      lineSegs.push({
        x1: px0 + (px1 - px0) * prevF, y1: yFor(prevV),
        x2: px0 + (px1 - px0) * c.f, y2: yFor(c.v),
        transition: isTransition(midV),
      });
      prevF = c.f; prevV = c.v;
    }
    const midV = (prevV + v1) / 2;
    lineSegs.push({
      x1: px0 + (px1 - px0) * prevF, y1: yFor(prevV),
      x2: px1, y2: yFor(v1),
      transition: isTransition(midV),
    });
  }

  const yTicks = [-50, -25, 0, 25, 50];

  return (
    <Svg width={width} height={height}>
      {TSB_ZONES.map((z, i) => (
        <Rect key={i} x={x0} y={yFor(z.y2)} width={innerW} height={yFor(z.y1) - yFor(z.y2)} fill={z.fill} opacity={0.18} />
      ))}
      {yTicks.map((v) => (
        <G key={v}>
          <Line x1={x0} y1={yFor(v)} x2={x0 + innerW} y2={yFor(v)} stroke={gridColor(isDark)} strokeWidth={v === 0 ? 1 : 0.5} opacity={v === 0 ? 0.8 : 0.5} />
          <SvgText x={x0 - 4} y={yFor(v) + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">{v}</SvgText>
        </G>
      ))}
      {lineSegs.map((s, i) => (
        <Line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.transition ? TRANSITION_GRAY : PRODUCTIVE_GREEN} strokeWidth={2.5} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

/** Vertical bar chart with numeric Y axis and optional X-axis labels (e.g. daily TSS). */
export function BarChartSimple({
  values, color, width, height = 200, isDark, labels,
}: { values: number[]; color: string; width: number; height?: number; isDark: boolean; labels?: string[] }) {
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const maxV = niceMax(Math.max(1, ...values), 50);
  const n = Math.max(values.length, 1);
  const slot = innerW / n;
  // Slightly narrower bars with consistent gaps read clearer than hairline bars.
  const barW = Math.max(2, slot * 0.62);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // Pick ~5 evenly spaced X labels so dates stay legible.
  const labelIdx: number[] = [];
  if (labels && labels.length) {
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) labelIdx.push(i);
    if (labelIdx[labelIdx.length - 1] !== n - 1) labelIdx.push(n - 1);
  }

  return (
    <Svg width={width} height={height}>
      {ticks.map((f) => {
        const y = padTop + innerH * f;
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">{Math.round(maxV * (1 - f))}</SvgText>
          </G>
        );
      })}
      {values.map((v, i) => {
        const h = (v / maxV) * innerH;
        const x = x0 + i * slot + (slot - barW) / 2;
        const y = padTop + innerH - h;
        return <Rect key={i} x={x} y={y} width={barW} height={Math.max(0, h)} rx={2} fill={color} />;
      })}
      {labelIdx.map((i) => (
        <SvgText key={i} x={x0 + i * slot + slot / 2} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">{labels![i]}</SvgText>
      ))}
    </Svg>
  );
}

/** Power curve: measured mean-maximal points on a log time axis, with axes. */
export function PowerCurveChartSvg({
  points, width, height = 220, color, isDark,
}: { points: { durationSeconds: number; watts: number }[]; width: number; height?: number; color: string; isDark: boolean }) {
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const valid = points.filter((p) => p.watts != null && p.durationSeconds > 0);
  if (valid.length < 2) return null;

  const logs = valid.map((p) => Math.log10(p.durationSeconds));
  const minL = Math.min(...logs), maxL = Math.max(...logs), spanL = maxL - minL || 1;
  const maxW = niceMax(Math.max(...valid.map((p) => p.watts)), 100);

  const xFor = (sec: number) => x0 + ((Math.log10(sec) - minL) / spanL) * innerW;
  const yFor = (w: number) => padTop + innerH - (w / maxW) * innerH;
  const coords = valid.map((p) => ({ x: xFor(p.durationSeconds), y: yFor(p.watts) }));
  const poly = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const xLabels: { sec: number; label: string }[] = [
    { sec: 1, label: '1s' }, { sec: 5, label: '5s' }, { sec: 60, label: '1m' },
    { sec: 300, label: '5m' }, { sec: 1200, label: '20m' }, { sec: 3600, label: '1h' },
  ].filter((l) => l.sec >= Math.pow(10, minL) && l.sec <= Math.pow(10, maxL));

  return (
    <Svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padTop + innerH * f;
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">{Math.round(maxW * (1 - f))}</SvgText>
          </G>
        );
      })}
      {xLabels.map((l) => (
        <SvgText key={l.sec} x={xFor(l.sec)} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">{l.label}</SvgText>
      ))}
      <Polyline points={poly} fill="none" stroke={color} strokeWidth={2} />
      {coords.map((c, i) => <Circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />)}
    </Svg>
  );
}

/** Horizontal stacked zone bar (time in power/HR zones). */
export function ZoneBar({ zoneSeconds, width, colors, height = 12 }: { zoneSeconds: number[]; width: number; colors: string[]; height?: number }) {
  const total = zoneSeconds.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let x = 0;
  return (
    <Svg width={width} height={height}>
      {zoneSeconds.map((s, i) => {
        const w = (s / total) * width;
        const rect = <Rect key={i} x={x} y={0} width={w} height={height} fill={colors[i] ?? '#94a3b8'} />;
        x += w;
        return rect;
      })}
    </Svg>
  );
}

function xKmLabels(xValues: number[], x0: number, innerW: number, count = 5): { x: number; label: string }[] {
  if (xValues.length < 2) return [];
  const min = xValues[0];
  const max = xValues[xValues.length - 1];
  const span = max - min || 1;
  const out: { x: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const v = min + (span * i) / (count - 1);
    out.push({ x: x0 + ((v - min) / span) * innerW, label: v.toFixed(1) });
  }
  return out;
}

/** Filled area chart over distance (e.g. elevation profile). */
export function AreaChartSvg({
  xValues, values, color, width, height = 200, isDark,
}: { xValues: number[]; values: (number | null)[]; color: string; width: number; height?: number; isDark: boolean }) {
  const padTop = 8;
  const innerW = width - AXIS_W - 6;
  const innerH = height - padTop - AXIS_H;
  const x0 = AXIS_W;
  const valid = values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
  if (valid.length < 2 || xValues.length < 2) return null;
  const minV = Math.min(...valid.map((p) => p.v));
  const maxV = Math.max(...valid.map((p) => p.v));
  const lo = Math.max(0, minV - (maxV - minV) * 0.1 - 1);
  const hi = maxV + (maxV - minV) * 0.1 + 1;
  const spanV = hi - lo || 1;
  const xMin = xValues[0], xMax = xValues[xValues.length - 1], xSpan = xMax - xMin || 1;

  const xFor = (i: number) => x0 + ((xValues[i] - xMin) / xSpan) * innerW;
  const yFor = (v: number) => padTop + innerH - ((v - lo) / spanV) * innerH;
  const linePts = valid.map((p) => `${xFor(p.i).toFixed(1)},${yFor(p.v).toFixed(1)}`).join(' ');
  const areaPts = `${xFor(valid[0].i).toFixed(1)},${(padTop + innerH).toFixed(1)} ${linePts} ${xFor(valid[valid.length - 1].i).toFixed(1)},${(padTop + innerH).toFixed(1)}`;

  return (
    <Svg width={width} height={height}>
      {[0, 0.5, 1].map((f) => {
        const y = padTop + innerH * f;
        return (
          <G key={f}>
            <Line x1={x0} y1={y} x2={x0 + innerW} y2={y} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={x0 - 4} y={y + 4} fontSize={9} fill={axisColor(isDark)} textAnchor="end">{Math.round(hi - spanV * f)}</SvgText>
          </G>
        );
      })}
      <Polygon points={areaPts} fill={color} fillOpacity={0.18} />
      <Polyline points={linePts} fill="none" stroke={color} strokeWidth={2} />
      {xKmLabels(xValues, x0, innerW).map((l, i) => (
        <SvgText key={i} x={l.x} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">{l.label}</SvgText>
      ))}
    </Svg>
  );
}

interface AxisSeries {
  values: (number | null)[];
  color: string;
  /** Draw a dashed average reference line at this value. */
  avg?: number;
}

/** Dual-axis line chart over distance (e.g. power+HR, speed+cadence). */
export function DualAxisLineChart({
  xValues, left, right, width, height = 230, isDark,
}: { xValues: number[]; left?: AxisSeries; right?: AxisSeries; width: number; height?: number; isDark: boolean }) {
  const padTop = 8;
  const gutterL = left ? AXIS_W : 6;
  const gutterR = right ? AXIS_W : 6;
  const innerW = width - gutterL - gutterR;
  const innerH = height - padTop - AXIS_H;
  const x0 = gutterL;
  if (xValues.length < 2) return null;
  const xMin = xValues[0], xMax = xValues[xValues.length - 1], xSpan = xMax - xMin || 1;
  const xFor = (i: number) => x0 + ((xValues[i] - xMin) / xSpan) * innerW;

  const domainOf = (s?: AxisSeries) => {
    if (!s) return [0, 1] as [number, number];
    const nums = s.values.filter((v): v is number => v != null);
    if (!nums.length) return [0, 1] as [number, number];
    return [0, niceMax(Math.max(...nums), 10)] as [number, number];
  };
  const [, leftMax] = domainOf(left);
  const [, rightMax] = domainOf(right);
  const yLeft = (v: number) => padTop + innerH - (v / leftMax) * innerH;
  const yRight = (v: number) => padTop + innerH - (v / rightMax) * innerH;

  const polyFor = (s: AxisSeries, yf: (v: number) => number) =>
    s.values.map((v, i) => (v == null ? null : `${xFor(i).toFixed(1)},${yf(v).toFixed(1)}`)).filter(Boolean).join(' ');

  return (
    <Svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <Line key={f} x1={x0} y1={padTop + innerH * f} x2={x0 + innerW} y2={padTop + innerH * f} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
      ))}
      {left && [0, 0.5, 1].map((f) => (
        <SvgText key={`l${f}`} x={x0 - 4} y={padTop + innerH * f + 4} fontSize={9} fill={left.color} textAnchor="end">{Math.round(leftMax * (1 - f))}</SvgText>
      ))}
      {right && [0, 0.5, 1].map((f) => (
        <SvgText key={`r${f}`} x={x0 + innerW + 4} y={padTop + innerH * f + 4} fontSize={9} fill={right.color} textAnchor="start">{Math.round(rightMax * (1 - f))}</SvgText>
      ))}
      {left?.avg != null && <Line x1={x0} y1={yLeft(left.avg)} x2={x0 + innerW} y2={yLeft(left.avg)} stroke={left.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />}
      {right?.avg != null && <Line x1={x0} y1={yRight(right.avg)} x2={x0 + innerW} y2={yRight(right.avg)} stroke={right.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />}
      {left && <Polyline points={polyFor(left, yLeft)} fill="none" stroke={left.color} strokeWidth={1.5} />}
      {right && <Polyline points={polyFor(right, yRight)} fill="none" stroke={right.color} strokeWidth={1.5} />}
      {xKmLabels(xValues, x0, innerW).map((l, i) => (
        <SvgText key={i} x={l.x} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">{l.label}</SvgText>
      ))}
    </Svg>
  );
}

export interface StreamSeries {
  values: (number | null)[];
  color: string;
  label: string;
  unit: string;
  axis: 'left' | 'right';
  avg?: number;
  /** Zoom Y axis to the data range (min..max) instead of starting at 0. */
  zoom?: boolean;
  /** Render a filled area under the line (e.g. elevation profile). */
  fill?: boolean;
}

/**
 * Interactive multi-series line chart over distance with per-axis scaling and a
 * touch/drag tooltip that reads out the values at the nearest sample — mirroring
 * the web charts (power+HR, speed+cadence).
 */
export function InteractiveStreamChart({
  xValues, series, width, height = 240, isDark, xUnit = 'km',
}: { xValues: number[]; series: StreamSeries[]; width: number; height?: number; isDark: boolean; xUnit?: string }) {
  const [active, setActive] = React.useState<number | null>(null);
  const padTop = 8;
  const hasLeft = series.some((s) => s.axis === 'left');
  const hasRight = series.some((s) => s.axis === 'right');
  const gutterL = hasLeft ? AXIS_W : 6;
  const gutterR = hasRight ? AXIS_W : 6;
  const innerW = width - gutterL - gutterR;
  const innerH = height - padTop - AXIS_H;
  const x0 = gutterL;
  const n = xValues.length;
  if (n < 2) return null;

  const xMin = xValues[0], xMax = xValues[n - 1], xSpan = xMax - xMin || 1;
  const xFor = (i: number) => x0 + ((xValues[i] - xMin) / xSpan) * innerW;

  const domainFor = (axis: 'left' | 'right') => {
    const group = series.filter((s) => s.axis === axis);
    const nums = group.flatMap((s) => s.values.filter((v): v is number => v != null));
    if (!nums.length) return { lo: 0, hi: 1 };
    const zoom = group.some((s) => s.zoom);
    if (zoom) {
      const lo = Math.min(...nums), hi = Math.max(...nums);
      const pad = Math.max(5, (hi - lo) * 0.1);
      return { lo: Math.max(0, lo - pad), hi: hi + pad };
    }
    return { lo: 0, hi: niceMax(Math.max(...nums), 10) };
  };
  const leftD = domainFor('left');
  const rightD = domainFor('right');
  const yFor = (s: StreamSeries, v: number) => {
    const d = s.axis === 'left' ? leftD : rightD;
    return padTop + innerH - ((v - d.lo) / (d.hi - d.lo || 1)) * innerH;
  };

  const polyFor = (s: StreamSeries) =>
    s.values.map((v, i) => (v == null ? null : `${xFor(i).toFixed(1)},${yFor(s, v).toFixed(1)}`)).filter(Boolean).join(' ');

  const areaFor = (s: StreamSeries) => {
    const pts = s.values.map((v, i) => (v == null ? null : { x: xFor(i), y: yFor(s, v) })).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return '';
    const base = padTop + innerH;
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${pts[0].x.toFixed(1)},${base.toFixed(1)} ${line} ${pts[pts.length - 1].x.toFixed(1)},${base.toFixed(1)}`;
  };

  const onTouch = (locationX: number) => {
    const frac = (locationX - x0) / innerW;
    const idx = Math.round(frac * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, idx)));
  };

  // gesture-handler Pan claims the touch from the parent ScrollView so scrubbing
  // works anywhere on the plot (and a tap shows the value immediately).
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => onTouch(e.x))
    .onUpdate((e) => onTouch(e.x))
    .onFinalize(() => setActive(null));

  const leftColor = series.find((s) => s.axis === 'left')?.color ?? axisColor(isDark);
  const rightColor = series.find((s) => s.axis === 'right')?.color ?? axisColor(isDark);
  const cursorX = active != null ? xFor(active) : 0;
  const tipW = 124;
  const tipLeft = active != null ? Math.max(0, Math.min(width - tipW, cursorX - tipW / 2)) : 0;

  return (
    <GestureDetector gesture={pan}>
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <Line key={f} x1={x0} y1={padTop + innerH * f} x2={x0 + innerW} y2={padTop + innerH * f} stroke={gridColor(isDark)} strokeWidth={1} strokeDasharray="3 3" />
        ))}
        {hasLeft && [0, 0.5, 1].map((f) => (
          <SvgText key={`l${f}`} x={x0 - 4} y={padTop + innerH * f + 4} fontSize={9} fill={leftColor} textAnchor="end">{Math.round(leftD.hi - (leftD.hi - leftD.lo) * f)}</SvgText>
        ))}
        {hasRight && [0, 0.5, 1].map((f) => (
          <SvgText key={`r${f}`} x={x0 + innerW + 4} y={padTop + innerH * f + 4} fontSize={9} fill={rightColor} textAnchor="start">{Math.round(rightD.hi - (rightD.hi - rightD.lo) * f)}</SvgText>
        ))}
        {series.map((s, i) => s.fill ? (
          <Polygon key={`fill${i}`} points={areaFor(s)} fill={s.color} fillOpacity={0.18} />
        ) : null)}
        {series.map((s, i) => s.avg != null ? (
          <Line key={`avg${i}`} x1={x0} y1={yFor(s, s.avg)} x2={x0 + innerW} y2={yFor(s, s.avg)} stroke={s.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.45} />
        ) : null)}
        {series.map((s, i) => <Polyline key={i} points={polyFor(s)} fill="none" stroke={s.color} strokeWidth={s.fill ? 2 : 1.5} />)}
        {xKmLabels(xValues, x0, innerW).map((l, i) => (
          <SvgText key={i} x={l.x} y={height - 3} fontSize={9} fill={axisColor(isDark)} textAnchor="middle">{l.label}</SvgText>
        ))}
        {active != null && (
          <G>
            <Line x1={cursorX} y1={padTop} x2={cursorX} y2={padTop + innerH} stroke={axisColor(isDark)} strokeWidth={1} />
            {series.map((s, i) => {
              const v = s.values[active];
              return v == null ? null : <Circle key={i} cx={cursorX} cy={yFor(s, v)} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1} />;
            })}
          </G>
        )}
      </Svg>
      {active != null && (
        <View style={{ position: 'absolute', top: 2, left: tipLeft, width: tipW }} className="bg-slate-900/90 rounded-lg px-2 py-1.5">
          <Text className="text-[10px] text-slate-300 mb-0.5">{xValues[active].toFixed(2)} {xUnit}</Text>
          {series.map((s, i) => {
            const v = s.values[active];
            return (
              <View key={i} className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: s.color }} />
                  <Text className="text-[10px] text-slate-300">{s.label}</Text>
                </View>
                <Text className="text-[10px] font-semibold text-white">{v != null ? Math.round(v) : '–'} {s.unit}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
    </GestureDetector>
  );
}

/** Simple legend row used under charts. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View className="mt-2 flex-row flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <View key={it.label} className="flex-row items-center gap-1.5">
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: it.color }} />
          <Text className="text-xs text-slate-500 dark:text-slate-400">{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
