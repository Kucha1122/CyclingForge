import axios from 'axios';
import type { AthleteProfileDto } from '../types/strava';
import type { ActivityDto } from '../types/activity';

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

import type { ActivityDetailsDto } from '../types/activity';

export interface ActivityCountsDto {
  total: number;
  ride: number;
  run: number;
  walk: number;
}

export const stravaApi = {
  connect: (code: string) => api.post('/strava/authorize', { code }),
  getProfile: () => api.get<AthleteProfileDto>('/strava/athlete'),
  sync: () => api.post('/strava/sync'),
  getActivities: (page = 1, perPage = 30) => api.get<ActivityDto[]>('/strava/activities', { params: { page, perPage } }),
  getActivityCounts: () => api.get<ActivityCountsDto>('/strava/activities/counts'),
  getActivityDetails: (id: string) => api.get<ActivityDetailsDto>(`/strava/activities/${id}`),
};

export const activitiesApi = {
  sync: () => api.post<{ syncedCount: number }>('/activities/sync'),
};

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
  }>;
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
  updateProfile: (userId: string, ftp: number | null, weightKg: number | null, lthr?: number | null) =>
    api.put(`/users/${userId}/profile`, { ftp, weightKg, lthr }),
};

export default api;
