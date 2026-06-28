import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/themeStore';
import { OverviewScreen } from '../screens/OverviewScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { ActivityDetailsScreen } from '../screens/ActivityDetailsScreen';
import { TodayWorkoutScreen } from '../screens/TodayWorkoutScreen';
import { RealizedWeekScreen } from '../screens/RealizedWeekScreen';
import { WorkoutLibraryScreen } from '../screens/WorkoutLibraryScreen';
import { FullPlanScreen } from '../screens/FullPlanScreen';
import { TrainingSetupScreen } from '../screens/TrainingSetupScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { WorkoutCreatorScreen } from '../screens/WorkoutCreatorScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type {
  MainTabParamList, HomeStackParamList, HomeTabParamList,
  ActivitiesStackParamList, ActivitiesTabParamList, TrainingStackParamList, TrainingTabParamList,
  SleepStackParamList, ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const HomeTopTab = createMaterialTopTabNavigator<HomeTabParamList>();
const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();
const ActivitiesTopTab = createMaterialTopTabNavigator<ActivitiesTabParamList>();
const TrainingStack = createNativeStackNavigator<TrainingStackParamList>();
const TrainingTopTab = createMaterialTopTabNavigator<TrainingTabParamList>();
const SleepStack = createNativeStackNavigator<SleepStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

/** Home swipeable top tabs — the wellness overview + the training analysis. */
function HomeTopTabs() {
  const { t } = useTranslation('nav');
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      <HomeTopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
          tabBarIndicatorStyle: { backgroundColor: '#3b82f6', height: 2.5 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
          tabBarStyle: { backgroundColor: bg, elevation: 0, shadowOpacity: 0 },
          tabBarScrollEnabled: false,
        }}
      >
        <HomeTopTab.Screen name="Overview" component={OverviewScreen} options={{ tabBarLabel: t('overview') }} />
        <HomeTopTab.Screen name="Analysis" component={AnalysisScreen} options={{ tabBarLabel: t('analysis') }} />
      </HomeTopTab.Navigator>
    </SafeAreaView>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeHub" component={HomeTopTabs} />
    </HomeStack.Navigator>
  );
}

/** Activities swipeable top tabs — the list + the realized week. */
function ActivitiesTopTabs() {
  const { t } = useTranslation('nav');
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      <ActivitiesTopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
          tabBarIndicatorStyle: { backgroundColor: '#3b82f6', height: 2.5 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
          tabBarStyle: { backgroundColor: bg, elevation: 0, shadowOpacity: 0 },
          tabBarScrollEnabled: false,
        }}
      >
        <ActivitiesTopTab.Screen name="ActivityList" component={ActivitiesScreen} options={{ tabBarLabel: t('activities') }} />
        <ActivitiesTopTab.Screen name="RealizedWeek" component={RealizedWeekScreen} options={{ tabBarLabel: t('realizedWeek') }} />
      </ActivitiesTopTab.Navigator>
    </SafeAreaView>
  );
}

/** Activities stack: top-tab hub + pushed activity detail. */
function ActivitiesNavigator() {
  return (
    <ActivitiesStack.Navigator>
      <ActivitiesStack.Screen name="ActivitiesHub" component={ActivitiesTopTabs} options={{ headerShown: false }} />
      <ActivitiesStack.Screen name="ActivityDetails" component={ActivityDetailsScreen} options={{ title: '' }} />
    </ActivitiesStack.Navigator>
  );
}

/** Swipeable top tabs — flat screens only, no nested navigators. */
function TrainingTopTabs() {
  const { t } = useTranslation('nav');
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      <TrainingTopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
          tabBarIndicatorStyle: { backgroundColor: '#3b82f6', height: 2.5 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
          tabBarStyle: { backgroundColor: bg, elevation: 0, shadowOpacity: 0 },
          tabBarScrollEnabled: false,
        }}
      >
        <TrainingTopTab.Screen name="TodayWorkout" component={TodayWorkoutScreen} options={{ tabBarLabel: t('todayWorkout') }} />
        <TrainingTopTab.Screen name="FullPlan" component={FullPlanScreen} options={{ tabBarLabel: t('fullPlan') }} />
        <TrainingTopTab.Screen name="WorkoutLibrary" component={WorkoutLibraryScreen} options={{ tabBarLabel: t('workoutLibrary') }} />
      </TrainingTopTab.Navigator>
    </SafeAreaView>
  );
}

/** Training stack: top-tab hub + pushed detail/creator screens. */
function TrainingNavigator() {
  const { t } = useTranslation('workouts');
  const { t: tSetup } = useTranslation('trainingSetup');
  return (
    <TrainingStack.Navigator>
      <TrainingStack.Screen name="TrainingHub" component={TrainingTopTabs} options={{ headerShown: false }} />
      <TrainingStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: '', headerBackTitle: t('backToLibrary') }} />
      <TrainingStack.Screen name="WorkoutCreator" component={WorkoutCreatorScreen} options={{ title: t('createWorkout') }} />
      <TrainingStack.Screen name="TrainingSetup" component={TrainingSetupScreen} options={{ title: tSetup('title') }} />
    </TrainingStack.Navigator>
  );
}

function SleepNavigator() {
  return (
    <SleepStack.Navigator screenOptions={{ headerShown: false }}>
      <SleepStack.Screen name="Sleep" component={SleepScreen} />
    </SleepStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainNavigator() {
  const { t } = useTranslation('nav');
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarStyle: {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          borderTopColor: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="TrainingTab"
        component={TrainingNavigator}
        options={{
          tabBarLabel: t('training'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ActivitiesTab"
        component={ActivitiesNavigator}
        options={{
          tabBarLabel: t('activities'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SleepTab"
        component={SleepNavigator}
        options={{
          tabBarLabel: t('sleep'),
          tabBarIcon: ({ color, size }) => <Ionicons name="moon-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
