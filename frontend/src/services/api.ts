import axios from 'axios';
import type { AthleteProfileDto, AthleteZonesDto } from '../types/strava';
import type { ActivityDto, ActivityDetailsDto, RealizedWeekDto } from '../types/activity';
import type { GarminStatusDto, SleepDataDto, WellnessDataDto, HrvDataDto } from '../types/garmin';
import type {
  WorkoutDto, WorkoutSearchResultDto, CreateWorkoutRequest,
  BulkImportZwoResult, ParseZwoResultDto,
  TrainingPreferenceDto, SaveTrainingPreferenceRequest,
  DailyRecommendationDto, ReadinessBreakdownDto, WeeklyPlanDto, FullPlanDto
} from '../types/workout';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

export const activitiesApi = {
  sync: (quickSync?: boolean) =>
    api.post<{ syncedCount: number }>('/activities/sync', null, { params: quickSync ? { quickSync: true } : {} }),
  getActivities: (page = 1, pageSize = 30) =>
    api.get<ActivityDto[]>('/activities', { params: { page, pageSize } }),
  getActivityDetails: (id: string) => api.get<ActivityDetailsDto>(`/activities/${id}`),
  getRealizedWeek: (weekStart?: string) =>
    api.get<RealizedWeekDto>('/activities/realized-week', { params: { weekStart } }),
  getPowerCurve: (windowDays = 42) =>
    api.get<PowerCurveDto>('/activities/power-curve', { params: { windowDays } }),
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
  enableRpeFeedback: boolean;
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
      enableRpeFeedback?: boolean | null;
    }
  ) => api.put(`/users/${userId}/profile`, profile),
};

export const garminApi = {
  getStatus: () => api.get<GarminStatusDto>('/garmin/status'),
  connect: (email: string, password: string) =>
    api.post<{ sessionId?: string }>('/garmin/connect', { email, password }),
  connectMfa: (sessionId: string, mfaCode: string) =>
    api.post('/garmin/connect/mfa', { sessionId, mfaCode }),
  disconnect: () => api.delete('/garmin/disconnect'),
  sync: (daysBack = 7) =>
    api.post('/garmin/sync', null, { params: { daysBack } }),
  getSleepData: (startDate: string, endDate: string) =>
    api.get<SleepDataDto[]>('/garmin/sleep', { params: { startDate, endDate } }),
  getWellness: (date: string) =>
    api.get<WellnessDataDto>('/garmin/wellness', { params: { date } }),
  getLatestWellness: (onOrBefore?: string) =>
    api.get<WellnessDataDto>('/garmin/wellness/latest', { params: { onOrBefore } }),
  getHrvData: (startDate: string, endDate: string) =>
    api.get<HrvDataDto[]>('/garmin/hrv', { params: { startDate, endDate } }),
};

export const workoutsApi = {
  search: (params?: {
    category?: string; zone?: string; source?: string;
    minDuration?: number; maxDuration?: number; search?: string;
    sortBy?: string; page?: number; pageSize?: number;
  }) => api.get<WorkoutSearchResultDto>('/workouts', { params }),
  getById: (id: string) => api.get<WorkoutDto>(`/workouts/${id}`),
  create: (data: CreateWorkoutRequest) => api.post<string>('/workouts', data),
  update: (id: string, data: CreateWorkoutRequest) => api.put(`/workouts/${id}`, data),
  delete: (id: string) => api.delete(`/workouts/${id}`),
  deleteAllMine: () => api.delete('/workouts/mine'),
  copy: (id: string) => api.post<string>(`/workouts/${id}/copy`),
  importZwo: (zwoXmlContent: string) => api.post<string>('/workouts/import', { zwoXmlContent }),
  parseZwo: (zwoXmlContent: string) => api.post<ParseZwoResultDto>('/workouts/parse-zwo', { zwoXmlContent }),
  importFit: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<string>('/workouts/import-fit', formData);
  },
  importZwoZip: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<BulkImportZwoResult>('/workouts/import-zip', formData, { timeout: 120000 });
  },
  exportZwo: (id: string) => api.get<string>(`/workouts/${id}/export`, { responseType: 'text' as never }),
  exportFit: (id: string) => api.get<Blob>(`/workouts/${id}/export/fit`, { responseType: 'blob' }),
};

export const trainingPreferenceApi = {
  get: () => api.get<TrainingPreferenceDto>('/training-preference'),
  save: (data: SaveTrainingPreferenceRequest) => api.post<TrainingPreferenceDto>('/training-preference', data),
};

const PLAN_REQUEST_TIMEOUT_MS = 300000; // 5 min for multi-week generation

export const recommendationsApi = {
  getToday: () => api.get<DailyRecommendationDto>('/recommendations/today'),
  regenerateToday: () => api.post<DailyRecommendationDto>('/recommendations/today/regenerate'),
  getPlan: (weeks?: number) =>
    api.get<FullPlanDto>('/recommendations/plan', { params: { weeks }, timeout: PLAN_REQUEST_TIMEOUT_MS }),
  getWeek: (weekStart?: string) => api.get<WeeklyPlanDto>('/recommendations/week', { params: { weekStart } }),
  getReadiness: (date?: string) => api.get<ReadinessBreakdownDto>('/recommendations/readiness', { params: { date } }),
  updateStatus: (id: string, status: string, completedActivityId?: string) =>
    api.put(`/recommendations/${id}/status`, { status, completedActivityId }),
  submitFeedback: (id: string, feedback: { rpe: number; legsFeel?: string | null; sessionQuality?: string | null; note?: string | null }) =>
    api.post(`/recommendations/${id}/feedback`, feedback),
  adjustPlanDay: (id: string, action: 'rest' | 'swap' | 'move', targetDate?: string) =>
    api.put<{ success: boolean; warnings: string[] }>(`/recommendations/${id}/plan-adjust`, { action, targetDate }),
};

export default api;
