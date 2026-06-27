export interface StreamPoint {
  distKm: number;
  time: number;
  heartrate: number | null;
  watts: number | null;
  altitude: number | null;
  speedKph: number | null;
  cadence: number | null;
}

interface StravaStream {
  type: string;
  data: number[];
}

/** Parse Strava streamsJson into per-sample points (matches the web frontend). */
export function parseStreams(json: string): StreamPoint[] {
  try {
    const streams: StravaStream[] = JSON.parse(json);
    if (!streams?.length) return [];
    const get = (type: string) => streams.find((s) => s.type === type);
    const dist = get('distance');
    const time = get('time');
    const hr = get('heartrate');
    const watts = get('watts');
    const alt = get('altitude');
    const vel = get('velocity_smooth');
    const cad = get('cadence');
    const length = dist?.data.length ?? time?.data.length ?? 0;
    const out: StreamPoint[] = [];
    for (let i = 0; i < length; i++) {
      out.push({
        distKm: dist ? dist.data[i] / 1000 : 0,
        time: time?.data[i] ?? 0,
        heartrate: hr?.data[i] ?? null,
        watts: watts?.data[i] ?? null,
        altitude: alt?.data[i] ?? null,
        speedKph: vel ? vel.data[i] * 3.6 : null,
        cadence: cad?.data[i] ?? null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Systematic downsample to at most `target` points for chart rendering. */
export function downsample(data: StreamPoint[], target = 400): StreamPoint[] {
  if (data.length <= target) return data;
  const step = Math.ceil(data.length / target);
  return data.filter((_, i) => i % step === 0);
}
