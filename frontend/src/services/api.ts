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

export const stravaApi = {
  connect: (code: string) => api.post('/strava/authorize', { code }),
  getProfile: () => api.get<AthleteProfileDto>('/strava/athlete'),
  sync: () => api.post('/strava/sync'),
  getActivities: (page = 1, perPage = 30) => api.get<ActivityDto[]>('/strava/activities', { params: { page, perPage } }),
  getActivityDetails: (id: string) => api.get<ActivityDetailsDto>(`/strava/activities/${id}`),
};


export default api;
