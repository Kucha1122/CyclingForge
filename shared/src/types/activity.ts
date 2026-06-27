export interface ActivityDto {
  id: string;
  externalId: string;
  name: string;
  type: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
  ftpUsed?: number;
  deviceWatts?: boolean;
}

export interface RealizedActivityDto {
  id: string;
  stravaActivityId: number;
  name: string;
  type: string;
  startDate: string;
  distanceKm: number;
  durationSeconds: number;
  trainingStressScore?: number;
  averageHeartRate?: number;
  hrZoneSeconds: number[];
}

export interface RealizedDayDto {
  date: string;
  activities: RealizedActivityDto[];
  dailyHrZoneSeconds: number[];
}

export interface RealizedWeekDto {
  weekStart: string;
  weekEnd: string;
  days: RealizedDayDto[];
  weeklyHrZoneSeconds: number[];
}

export interface ActivityDetailsDto {
  id: string;
  stravaActivityId: number;
  name: string;
  type: string;
  startDate: string;
  distanceKm: number;
  distanceMeters: number;
  movingTime: string;
  elapsedTime: string;
  totalElevationGain: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number;
  maxPower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
  variabilityIndex?: number;
  ftpUsed?: number;
  best5MinPower?: number;
  best20MinPower?: number;
  best60MinPower?: number;
  estimatedFtpFromActivity?: number;
  deviceWatts?: boolean;
  syncedAt: string;
}

export interface ActivityCountsDto {
  total: number;
  ride: number;
  run: number;
  walk: number;
}

export interface StravaActivityDetailsDto {
  externalId: number;
  name: string;
  type: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number;
  streamsJson?: string;
}

export interface PowerCurvePointDto {
  durationSeconds: number;
  watts: number;
  wattsPerKg: number | null;
}

export interface PowerCurveDto {
  windowDays: number;
  activityCount: number;
  points: PowerCurvePointDto[];
  criticalPower: number | null;
  wPrimeJoules: number | null;
  criticalPowerPerKg: number | null;
}
