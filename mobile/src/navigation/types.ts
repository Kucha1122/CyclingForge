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
  TrainingTab: NavigatorScreenParams<TrainingStackParamList>;
  ActivitiesTab: NavigatorScreenParams<ActivitiesStackParamList>;
  SleepTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
};

// Activities stack wraps the top-tab hub + pushed detail screen.
export type ActivitiesStackParamList = {
  ActivitiesHub: NavigatorScreenParams<ActivitiesTabParamList>;
  ActivityDetails: { id: string };
};

// Activities top tabs — flat screens only, no nested navigators.
export type ActivitiesTabParamList = {
  ActivityList: undefined;
  RealizedWeek: undefined;
};

// Training stack wraps the top-tab hub + detail/creator screens.
export type TrainingStackParamList = {
  TrainingHub: NavigatorScreenParams<TrainingTabParamList>;
  WorkoutDetail: { id: string };
  WorkoutCreator: { id?: string } | undefined;
  TrainingSetup: undefined;
};

// Training top tabs — flat screens only, no nested navigators.
export type TrainingTabParamList = {
  TodayWorkout: undefined;
  FullPlan: undefined;
  WorkoutLibrary: undefined;
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

// ActivityList is a top-tab screen in the Activities hub; to open a detail it
// goes through the parent ActivitiesStack.
export type ActivityListScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<ActivitiesTabParamList, 'ActivityList'>,
  NativeStackScreenProps<ActivitiesStackParamList>
>;

// RealizedWeek now lives in the Activities top-tab hub; it reaches ActivityDetails
// through the parent ActivitiesStack.
export type RealizedWeekScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<ActivitiesTabParamList, 'RealizedWeek'>,
  NativeStackScreenProps<ActivitiesStackParamList>
>;

// WorkoutLibrary is a top-tab screen; to navigate to Detail/Creator it goes
// through the parent TrainingStack.
export type WorkoutLibraryScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<TrainingTabParamList, 'WorkoutLibrary'>,
  NativeStackScreenProps<TrainingStackParamList>
>;

// FullPlan is a top-tab screen; to open a workout it goes through the parent
// TrainingStack (WorkoutDetail), like WorkoutLibrary.
export type FullPlanScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<TrainingTabParamList, 'FullPlan'>,
  NativeStackScreenProps<TrainingStackParamList>
>;

export type TrainingSetupScreenProps = NativeStackScreenProps<TrainingStackParamList, 'TrainingSetup'>;
export type WorkoutDetailScreenProps = NativeStackScreenProps<TrainingStackParamList, 'WorkoutDetail'>;
export type WorkoutCreatorScreenProps = NativeStackScreenProps<TrainingStackParamList, 'WorkoutCreator'>;
