import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import plCommon from './locales/pl/common.json';
import plNav from './locales/pl/nav.json';
import plAuth from './locales/pl/auth.json';
import plDashboard from './locales/pl/dashboard.json';
import plTodayWorkout from './locales/pl/todayWorkout.json';
import plTrainingSetup from './locales/pl/trainingSetup.json';
import plActivities from './locales/pl/activities.json';
import plActivityDetails from './locales/pl/activityDetails.json';
import plProfile from './locales/pl/profile.json';
import plAnalysis from './locales/pl/analysis.json';
import plSleep from './locales/pl/sleep.json';
import plWorkouts from './locales/pl/workouts.json';
import plCharts from './locales/pl/charts.json';
import plErrors from './locales/pl/errors.json';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enTodayWorkout from './locales/en/todayWorkout.json';
import enTrainingSetup from './locales/en/trainingSetup.json';
import enActivities from './locales/en/activities.json';
import enActivityDetails from './locales/en/activityDetails.json';
import enProfile from './locales/en/profile.json';
import enAnalysis from './locales/en/analysis.json';
import enSleep from './locales/en/sleep.json';
import enWorkouts from './locales/en/workouts.json';
import enCharts from './locales/en/charts.json';
import enErrors from './locales/en/errors.json';

const STORAGE_KEY = 'cyclingforge-locale';

const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pl' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'pl';
};

const resources = {
  pl: {
    common: plCommon as Record<string, string>,
    nav: plNav as Record<string, string>,
    auth: plAuth as Record<string, string>,
    dashboard: plDashboard as Record<string, string>,
    todayWorkout: plTodayWorkout as Record<string, string>,
    trainingSetup: plTrainingSetup as Record<string, string>,
    activities: plActivities as Record<string, string>,
    activityDetails: plActivityDetails as Record<string, string>,
    profile: plProfile as Record<string, string>,
    analysis: plAnalysis as Record<string, string>,
    sleep: plSleep as Record<string, string>,
    workouts: plWorkouts as Record<string, unknown>,
    charts: plCharts as Record<string, string>,
    errors: plErrors as Record<string, string>,
  },
  en: {
    common: enCommon as Record<string, string>,
    nav: enNav as Record<string, string>,
    auth: enAuth as Record<string, string>,
    dashboard: enDashboard as Record<string, string>,
    todayWorkout: enTodayWorkout as Record<string, string>,
    trainingSetup: enTrainingSetup as Record<string, string>,
    activities: enActivities as Record<string, string>,
    activityDetails: enActivityDetails as Record<string, string>,
    profile: enProfile as Record<string, string>,
    analysis: enAnalysis as Record<string, string>,
    sleep: enSleep as Record<string, string>,
    workouts: enWorkouts as Record<string, unknown>,
    charts: enCharts as Record<string, string>,
    errors: enErrors as Record<string, string>,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'pl',
  supportedLngs: ['pl', 'en'],
  defaultNS: 'common',
  ns: [
    'common',
    'nav',
    'auth',
    'dashboard',
    'todayWorkout',
    'trainingSetup',
    'activities',
    'activityDetails',
    'profile',
    'analysis',
    'sleep',
    'workouts',
    'charts',
    'errors',
  ],
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.lang = lng === 'pl' ? 'pl' : 'en';
    document.title = i18n.t('common:appTitle');
  } catch {
    // ignore
  }
});

// Set initial document lang and title
document.documentElement.lang = i18n.language === 'pl' ? 'pl' : 'en';
document.title = i18n.t('common:appTitle');

export const LOCALE_STORAGE_KEY = STORAGE_KEY;
export default i18n;
