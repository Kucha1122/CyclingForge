import axios from 'axios';
import type { AthleteProfileDto, AthleteZonesDto } from '../types/strava';
import type { ActivityDto, ActivityDetailsDto } from '../types/activity';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const stravaApi = {
  connect: (code: string) => api.post('/strava/authorize', { code }),
  getProfile: () => api.get<AthleteProfileDto>('/strava/athlete'),
  getZones: () => api.get<AthleteZonesDto>('/strava/athlete/zones'),
  sync: (fullSync?: boolean) =>
    api.post('/strava/sync', null, { params: fullSync ? { fullSync: true } : {} }),
  getActivities: (page = 1, perPage = 30) => api.get<ActivityDto[]>('/strava/activities', { params: { page, perPage } }),
  getActivityCounts: () => api.get<ActivityCountsDto>('/strava/activities/counts'),
  getActivityDetails: (id: string) => api.get<StravaActivityDetailsDto>(`/strava/activities/${id}`),
};

export const activitiesApi = {
  sync: (quickSync?: boolean) =>
    api.post<{ syncedCount: number }>('/activities/sync', null, { params: quickSync ? { quickSync: true } : {} }),
  getActivities: (page = 1, pageSize = 30) =>
    api.get<ActivityDto[]>('/activities', { params: { page, pageSize } }),
  getActivityDetails: (id: string) => api.get<ActivityDetailsDto>(`/activities/${id}`),
};

export interface FtpChangeDto {
  date: string;
  fromFtp: number;
  toFtp: number;
  source: string; // 'Manual' | 'EstimatedFromActivity'
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

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isActive: boolean;
  functionalThresholdPower: number | null;
  weightKg: number | null;
  lactateThresholdHeartRate: number | null;
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  gender: string | null;
  eftpMinDurationSeconds: number | null;
}

export const metricsApi = {
  getPmcSummary: (ctlDays?: number, atlDays?: number, historyDays?: number) =>
    api.get<PmcSummary>('/metrics/pmc', {
      params: { ctlDays, atlDays, historyDays },
    }),
  getDailyTss: (days?: number) => api.get<DailyTssPoint[]>('/metrics/daily-tss', { params: days != null ? { days } : undefined }),
  getWeeklySummary: (weekStart?: string) => api.get<WeeklySummary>('/metrics/weekly', { params: { weekStart } }),
  getMonthlySummary: (year?: number, month?: number) => api.get<MonthlySummary>('/metrics/monthly', { params: { year, month } }),
};

export const usersApi = {
  getProfile: (userId: string) => api.get<UserProfile>(`/users/${userId}`),
  updateProfile: (
    userId: string,
    profile: {
      ftp: number | null;
      weightKg: number | null;
      lthr?: number | null;
      maxHeartRate?: number | null;
      restingHeartRate?: number | null;
      gender?: string | null;
      eftpMinDurationSeconds?: number | null;
    }
  ) => api.put(`/users/${userId}/profile`, profile),
};

export default api;
