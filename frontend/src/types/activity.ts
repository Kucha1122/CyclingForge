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
}

export interface ActivityDetailsDto extends ActivityDto {
  description?: string;
  calories?: number;
  streamsJson?: string;
}
