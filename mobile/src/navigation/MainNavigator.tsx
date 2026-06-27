import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/themeStore';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { ActivityDetailsScreen } from '../screens/ActivityDetailsScreen';
import { TodayWorkoutScreen } from '../screens/TodayWorkoutScreen';
import { RealizedWeekScreen } from '../screens/RealizedWeekScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type {
  MainTabParamList, HomeStackParamList,
  ActivitiesStackParamList, TrainingTabParamList,
  SleepStackParamList, ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();
const TrainingTopTab = createMaterialTopTabNavigator<TrainingTabParamList>();
const SleepStack = createNativeStackNavigator<SleepStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
    </HomeStack.Navigator>
  );
}

function ActivitiesNavigator() {
  return (
    <ActivitiesStack.Navigator>
      <ActivitiesStack.Screen name="Activities" component={ActivitiesScreen} options={{ headerShown: false }} />
      <ActivitiesStack.Screen name="ActivityDetails" component={ActivityDetailsScreen} options={{ title: '' }} />
    </ActivitiesStack.Navigator>
  );
}

/** Training hub: swipeable top tabs grouping the workout-related sections. */
function TrainingNavigator() {
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
        }}
      >
        <TrainingTopTab.Screen name="TodayWorkout" component={TodayWorkoutScreen} options={{ tabBarLabel: t('todayWorkout') }} />
        <TrainingTopTab.Screen name="RealizedWeek" component={RealizedWeekScreen} options={{ tabBarLabel: t('realizedWeek') }} />
      </TrainingTopTab.Navigator>
    </SafeAreaView>
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
