import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';
import type {
  AthleteProfileDto, AthleteZonesDto,
  ActivityDto, ActivityDetailsDto, RealizedWeekDto,
  GarminStatusDto, SleepDataDto, WellnessDataDto, HrvDataDto,
  WorkoutDto, WorkoutSearchResultDto, CreateWorkoutRequest,
  BulkImportZwoResult, ParseZwoResultDto,
  TrainingPreferenceDto, SaveTrainingPreferenceRequest,
  DailyRecommendationDto, ReadinessBreakdownDto, WeeklyPlanDto, FullPlanDto,
  UserProfile, PmcSummary, DailyTssPoint, WeeklySummary, MonthlySummary,
  ActivityCountsDto, PowerCurveDto, StravaActivityDetailsDto, FtpChangeDto,
} from '@cyclingforge/shared';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = SecureStore.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('token');
      SecureStore.deleteItemAsync('userId');
      SecureStore.deleteItemAsync('email');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; userId: string; email: string }>('/users/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/users/register', data),
};

export const stravaApi = {
  getProfile: () => api.get<AthleteProfileDto>('/strava/athlete'),
  getZones: () => api.get<AthleteZonesDto>('/strava/athlete/zones'),
  sync: (fullSync?: boolean) =>
    api.post('/strava/sync', null, { params: fullSync ? { fullSync: true } : {} }),
  getActivities: (page = 1, perPage = 30) =>
    api.get<ActivityDto[]>('/strava/activities', { params: { page, perPage } }),
  getActivityCounts: () => api.get<ActivityCountsDto>('/strava/activities/counts'),
  getActivityDetails: (id: string) => api.get<StravaActivityDetailsDto>(`/strava/activities/${id}`),
};

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

export const metricsApi = {
  getPmcSummary: (ctlDays?: number, atlDays?: number, historyDays?: number) =>
    api.get<PmcSummary>('/metrics/pmc', { params: { ctlDays, atlDays, historyDays } }),
  getDailyTss: (days?: number) =>
    api.get<DailyTssPoint[]>('/metrics/daily-tss', { params: days != null ? { days } : undefined }),
  getWeeklySummary: (weekStart?: string) =>
    api.get<WeeklySummary>('/metrics/weekly', { params: { weekStart } }),
  getMonthlySummary: (year?: number, month?: number) =>
    api.get<MonthlySummary>('/metrics/monthly', { params: { year, month } }),
};

export const usersApi = {
  getProfile: (userId: string) => api.get<UserProfile>(`/users/${userId}`),
  updateProfile: (userId: string, profile: {
    ftp: number | null; weightKg: number | null;
    lthr?: number | null; maxHeartRate?: number | null;
    restingHeartRate?: number | null; gender?: string | null;
  }) => api.put(`/users/${userId}/profile`, profile),
};

export const garminApi = {
  getStatus: () => api.get<GarminStatusDto>('/garmin/status'),
  sync: (daysBack = 7) => api.post('/garmin/sync', null, { params: { daysBack } }),
  getSleepData: (startDate: string, endDate: string) =>
    api.get<SleepDataDto[]>('/garmin/sleep', { params: { startDate, endDate } }),
  getWellness: (date: string) => api.get<WellnessDataDto>('/garmin/wellness', { params: { date } }),
  getLatestWellness: (onOrBefore?: string) => api.get<WellnessDataDto>('/garmin/wellness/latest', { params: { onOrBefore } }),
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
  // React Native multipart: pass the picked file as { uri, name, type }.
  importFit: (file: { uri: string; name: string }) => {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: 'application/octet-stream' } as unknown as Blob);
    return api.post<string>('/workouts/import-fit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  importZwoZip: (file: { uri: string; name: string }) => {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: 'application/zip' } as unknown as Blob);
    return api.post<BulkImportZwoResult>('/workouts/import-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
};

export const trainingPreferenceApi = {
  get: () => api.get<TrainingPreferenceDto>('/training-preference'),
  save: (data: SaveTrainingPreferenceRequest) =>
    api.post<TrainingPreferenceDto>('/training-preference', data),
};

export const recommendationsApi = {
  getToday: () => api.get<DailyRecommendationDto>('/recommendations/today'),
  regenerateToday: () => api.post<DailyRecommendationDto>('/recommendations/today/regenerate'),
  getPlan: (weeks?: number) =>
    api.get<FullPlanDto>('/recommendations/plan', { params: { weeks }, timeout: 300000 }),
  getWeek: (weekStart?: string) =>
    api.get<WeeklyPlanDto>('/recommendations/week', { params: { weekStart } }),
  adjustPlanDay: (id: string, action: 'rest' | 'swap' | 'move', targetDate?: string) =>
    api.put<{ success: boolean; warnings: string[] }>(`/recommendations/${id}/plan-adjust`, { action, targetDate }),
  getReadiness: (date?: string) =>
    api.get<ReadinessBreakdownDto>('/recommendations/readiness', { params: { date } }),
  updateStatus: (id: string, status: string, completedActivityId?: string) =>
    api.put(`/recommendations/${id}/status`, { status, completedActivityId }),
  submitFeedback: (id: string, feedback: {
    rpe: number; legsFeel?: string | null; sessionQuality?: string | null; note?: string | null;
  }) => api.post(`/recommendations/${id}/feedback`, feedback),
};

export default api;
