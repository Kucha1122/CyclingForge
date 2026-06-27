export interface GarminStatusDto {
  isConnected: boolean;
  connectedAt: string | null;
}

export interface SleepLevelDto {
  startGmt: string;
  endGmt: string;
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

export interface GarminSyncPreferenceDto {
  /** Local times of day ("HH:mm") at which automatic background sync runs. */
  syncTimes: string[];
  enabled: boolean;
  timeZoneId: string;
}
