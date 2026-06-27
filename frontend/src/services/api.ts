import axios from 'axios';
import i18n from '../i18n';
import { emitToast } from '../context/toastBus';
import type { AthleteProfileDto, AthleteZonesDto } from '@cyclingforge/shared';
import type { ActivityDto, ActivityDetailsDto, RealizedWeekDto, ActivityCountsDto, StravaActivityDetailsDto, PowerCurveDto } from '@cyclingforge/shared';
import type { GarminStatusDto, SleepDataDto, WellnessDataDto, HrvDataDto } from '@cyclingforge/shared';
import type {
  WorkoutDto, WorkoutSearchResultDto, CreateWorkoutRequest,
  BulkImportZwoResult, ParseZwoResultDto,
  TrainingPreferenceDto, SaveTrainingPreferenceRequest,
  DailyRecommendationDto, ReadinessBreakdownDto, WeeklyPlanDto, FullPlanDto
} from '@cyclingforge/shared';
import type { UserProfile, PmcSummary, PmcActivitySummaryDto, FtpChangeDto, DailyTssPoint, WeeklySummary, MonthlySummary } from '@cyclingforge/shared';

declare module 'axios' {
  export interface AxiosRequestConfig {
    silentError?: boolean;
  }
}

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

function resolveErrorMessage(status: number | undefined): string {
  if (status === 404) return i18n.t('errors:activityNotFound');
  if (status === 408 || status === 504) return i18n.t('errors:requestFailed');
  if (status === 400 || status === 422) return i18n.t('errors:requestFailed');
  if (status === 401 || status === 403) return i18n.t('errors:unexpected');
  return i18n.t('errors:unexpected');
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const silent = error.config?.silentError;
    if (!silent && !axios.isCancel(error)) {
      const backendMessage =
        typeof error.response?.data === 'object' && error.response?.data
          ? (error.response.data as { message?: string; detail?: string }).message ??
            (error.response.data as { detail?: string }).detail
          : undefined;
      emitToast({ type: 'error', message: backendMessage || resolveErrorMessage(status) });
    }

    return Promise.reject(error);
  }
);

export type { ActivityCountsDto, StravaActivityDetailsDto, PowerCurveDto, UserProfile, PmcSummary, PmcActivitySummaryDto, FtpChangeDto, DailyTssPoint, WeeklySummary, MonthlySummary };

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
  getRealizedWeek: (weekStart?: string) =>
    api.get<RealizedWeekDto>('/activities/realized-week', { params: { weekStart } }),
  getPowerCurve: (windowDays = 42) =>
    api.get<PowerCurveDto>('/activities/power-curve', { params: { windowDays } }),
};

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
  ) => api.put(`/users/${userId}/profile`, profile, { silentError: true }),
};

export const garminApi = {
  getStatus: () => api.get<GarminStatusDto>('/garmin/status'),
  connect: (email: string, password: string) =>
    api.post<{ sessionId?: string }>('/garmin/connect', { email, password }, { silentError: true }),
  connectMfa: (sessionId: string, mfaCode: string) =>
    api.post('/garmin/connect/mfa', { sessionId, mfaCode }, { silentError: true }),
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

const PLAN_REQUEST_TIMEOUT_MS = 300000;

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
