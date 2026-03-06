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
  ftpUsed?: number;
  best5MinPower?: number;
  best20MinPower?: number;
  best60MinPower?: number;
  estimatedFtpFromActivity?: number;
  deviceWatts?: boolean;
  syncedAt: string;
}
