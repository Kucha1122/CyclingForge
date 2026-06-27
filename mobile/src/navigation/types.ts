import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  TrainingTab: NavigatorScreenParams<TrainingTabParamList>;
  ActivitiesTab: NavigatorScreenParams<ActivitiesStackParamList>;
  SleepTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
};

export type ActivitiesStackParamList = {
  Activities: undefined;
  ActivityDetails: { id: string };
};

// Training is a hub: swipeable top tabs grouping the workout-related sections.
export type TrainingTabParamList = {
  TodayWorkout: undefined;
  RealizedWeek: undefined;
};

export type SleepStackParamList = {
  Sleep: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type ActivityDetailsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ActivitiesStackParamList, 'ActivityDetails'>,
  BottomTabScreenProps<MainTabParamList>
>;

// RealizedWeek lives in the Training top-tab navigator (child of the bottom tabs);
// the composite lets it reach the bottom tabs to open an activity in ActivitiesTab.
export type RealizedWeekScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<TrainingTabParamList, 'RealizedWeek'>,
  BottomTabScreenProps<MainTabParamList>
>;
