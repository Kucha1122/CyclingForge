import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import plCommon from '@cyclingforge/shared/locales/pl/common.json';
import plNav from '@cyclingforge/shared/locales/pl/nav.json';
import plAuth from '@cyclingforge/shared/locales/pl/auth.json';
import plDashboard from '@cyclingforge/shared/locales/pl/dashboard.json';
import plTodayWorkout from '@cyclingforge/shared/locales/pl/todayWorkout.json';
import plTrainingSetup from '@cyclingforge/shared/locales/pl/trainingSetup.json';
import plActivities from '@cyclingforge/shared/locales/pl/activities.json';
import plActivityDetails from '@cyclingforge/shared/locales/pl/activityDetails.json';
import plProfile from '@cyclingforge/shared/locales/pl/profile.json';
import plAnalysis from '@cyclingforge/shared/locales/pl/analysis.json';
import plSleep from '@cyclingforge/shared/locales/pl/sleep.json';
import plWorkouts from '@cyclingforge/shared/locales/pl/workouts.json';
import plCharts from '@cyclingforge/shared/locales/pl/charts.json';
import plErrors from '@cyclingforge/shared/locales/pl/errors.json';

import enCommon from '@cyclingforge/shared/locales/en/common.json';
import enNav from '@cyclingforge/shared/locales/en/nav.json';
import enAuth from '@cyclingforge/shared/locales/en/auth.json';
import enDashboard from '@cyclingforge/shared/locales/en/dashboard.json';
import enTodayWorkout from '@cyclingforge/shared/locales/en/todayWorkout.json';
import enTrainingSetup from '@cyclingforge/shared/locales/en/trainingSetup.json';
import enActivities from '@cyclingforge/shared/locales/en/activities.json';
import enActivityDetails from '@cyclingforge/shared/locales/en/activityDetails.json';
import enProfile from '@cyclingforge/shared/locales/en/profile.json';
import enAnalysis from '@cyclingforge/shared/locales/en/analysis.json';
import enSleep from '@cyclingforge/shared/locales/en/sleep.json';
import enWorkouts from '@cyclingforge/shared/locales/en/workouts.json';
import enCharts from '@cyclingforge/shared/locales/en/charts.json';
import enErrors from '@cyclingforge/shared/locales/en/errors.json';

const STORAGE_KEY = 'cyclingforge-locale';

const resources = {
  pl: {
    common: plCommon, nav: plNav, auth: plAuth, dashboard: plDashboard,
    todayWorkout: plTodayWorkout, trainingSetup: plTrainingSetup,
    activities: plActivities, activityDetails: plActivityDetails,
    profile: plProfile, analysis: plAnalysis, sleep: plSleep,
    workouts: plWorkouts, charts: plCharts, errors: plErrors,
  },
  en: {
    common: enCommon, nav: enNav, auth: enAuth, dashboard: enDashboard,
    todayWorkout: enTodayWorkout, trainingSetup: enTrainingSetup,
    activities: enActivities, activityDetails: enActivityDetails,
    profile: enProfile, analysis: enAnalysis, sleep: enSleep,
    workouts: enWorkouts, charts: enCharts, errors: enErrors,
  },
};

const NAMESPACES = [
  'common', 'nav', 'auth', 'dashboard', 'todayWorkout', 'trainingSetup',
  'activities', 'activityDetails', 'profile', 'analysis', 'sleep',
  'workouts', 'charts', 'errors',
];

i18n.use(initReactI18next).init({
  resources,
  lng: 'pl',
  fallbackLng: 'pl',
  supportedLngs: ['pl', 'en'],
  defaultNS: 'common',
  ns: NAMESPACES,
  interpolation: { escapeValue: false },
});

// Persist and restore the selected language.
AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
  if (stored === 'pl' || stored === 'en') i18n.changeLanguage(stored);
});

i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => {});
});

export default i18n;
