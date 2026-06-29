import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/authStore';
import type {
  AuthResultDto,
  AthleteProfileDto, AthleteZonesDto, ActivitySyncFilterDto,
  ActivityDto, ActivityDetailsDto, RealizedWeekDto,
  GarminStatusDto, SleepDataDto, WellnessDataDto, HrvDataDto, GarminSyncPreferenceDto,
  WorkoutDto, WorkoutSearchResultDto, CreateWorkoutRequest,
  BulkImportZwoResult, ParseZwoResultDto,
  TrainingPreferenceDto, SaveTrainingPreferenceRequest,
  DailyRecommendationDto, ReadinessBreakdownDto, WeeklyPlanDto, FullPlanDto,
  UserProfile, PmcSummary, DailyTssPoint, WeeklySummary, MonthlySummary,
  ActivityCountsDto, PowerCurveDto, StravaActivityDetailsDto, FtpChangeDto,
} from '@cyclingforge/shared';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight silent refresh: concurrent 401s share one /users/refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token');
  // Bare axios (not `api`) so the refresh request isn't itself intercepted/retried.
  const { data } = await axios.post<AuthResultDto>(`${API_BASE_URL}/users/refresh`, { refreshToken });
  useAuthStore.getState().setTokens(data.token, data.refreshToken);
  return data.token;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const original = error.config;
    const url: string = original?.url ?? '';
    const isAuthEndpoint = url.includes('/users/refresh') || url.includes('/users/login');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed → end the session so the UI returns to the login screen.
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string, rememberMe: boolean) =>
    api.post<AuthResultDto>('/users/login', { email, password, rememberMe }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/users/register', data),
  logout: (refreshToken: string) =>
    api.post('/users/logout', { refreshToken }),
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
  getSyncFilters: () => api.get<ActivitySyncFilterDto[]>('/strava/sync-filters'),
  addSyncFilter: (activityType: string, excludedDevicePattern: string) =>
    api.post('/strava/sync-filters', { activityType, excludedDevicePattern }),
  deleteSyncFilter: (filterId: string) => api.delete(`/strava/sync-filters/${filterId}`),
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
    eftpMinDurationSeconds?: number | null; enableRpeFeedback?: boolean | null;
  }) => api.put(`/users/${userId}/profile`, profile),
};

export const garminApi = {
  getStatus: () => api.get<GarminStatusDto>('/garmin/status'),
  connect: (email: string, password: string) =>
    api.post<{ sessionId?: string }>('/garmin/connect', { email, password }),
  connectMfa: (sessionId: string, mfaCode: string) =>
    api.post('/garmin/connect/mfa', { sessionId, mfaCode }),
  disconnect: () => api.delete('/garmin/disconnect'),
  getSyncPreferences: () => api.get<GarminSyncPreferenceDto>('/garmin/sync-preferences'),
  saveSyncPreferences: (data: GarminSyncPreferenceDto) =>
    api.put('/garmin/sync-preferences', data),
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
