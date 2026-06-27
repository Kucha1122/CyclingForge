export interface FtpChangeDto {
  date: string;
  fromFtp: number;
  toFtp: number;
  source: string;
}

export interface PmcActivitySummaryDto {
  activityId: string;
  name: string;
  sportType: string;
  trainingStressScore: number | null;
  movingTimeSeconds: number;
}

export interface PmcSummary {
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
  formStatus: string;
  recommendation: string;
  history: Array<{
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
    activities?: PmcActivitySummaryDto[];
  }>;
  ftpChanges?: FtpChangeDto[];
  previousWeekAvgCtl?: number;
  previousWeekAvgAtl?: number;
  currentWeekAvgCtl?: number;
  currentWeekAvgAtl?: number;
  rampRateCtlPerWeek?: number;
}

export interface DailyTssPoint {
  date: string;
  tss: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalActivities: number;
  totalDistance: number;
  totalMovingTime: string;
  totalElevationGain: number;
  totalTSS: number | null;
  averagePower: number | null;
  rideCount: number;
  runCount: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalActivities: number;
  totalDistance: number;
  totalMovingTime: string;
  totalElevationGain: number;
  totalTSS: number | null;
  averageCTL: number | null;
  rideCount: number;
  runCount: number;
}
