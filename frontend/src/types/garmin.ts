export interface GarminStatusDto {
  isConnected: boolean;
  connectedAt: string | null;
}

export interface SleepDataDto {
  date: string;
  totalSleepSeconds: number;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  remSleepSeconds: number;
  awakeSeconds: number;
  sleepScore: number | null;
  averageSpO2: number | null;
  averageRespirationRate: number | null;
  sleepStartTime: string | null;
  sleepEndTime: string | null;
}

export interface WellnessDataDto {
  date: string;
  vo2MaxMlPerMinPerKg: number | null;
  trainingReadinessScore: number | null;
  trainingReadinessLevel: string | null;
  bodyBatteryMin: number | null;
  bodyBatteryMax: number | null;
  averageStressLevel: number | null;
  stepsCount: number | null;
}
