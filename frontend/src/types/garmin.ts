export interface GarminStatusDto {
  isConnected: boolean;
  connectedAt: string | null;
}

export interface SleepLevelDto {
  /** "YYYY-MM-DD HH:MM:SS" UTC string from Garmin sleepMovement */
  startGmt: string;
  endGmt: string;
  /** 0=deep, 1=light, 2=rem, 3=awake */
  activityLevel: number;
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
  /** Naive local wall-clock datetime string (no Z) */
  sleepStartTime: string | null;
  sleepEndTime: string | null;
  sleepLevels: SleepLevelDto[];
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

export interface HrvDataDto {
  date: string;
  lastNightAvgMs: number | null;
  lastNight5MinHighMs: number | null;
  status: string | null;
}
