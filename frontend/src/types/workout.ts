export interface WorkoutStepDto {
  id: string;
  order: number;
  type: string;
  durationSeconds: number;
  powerLow: number;
  powerHigh: number;
  cadence: number | null;
  repeat: number | null;
  onDurationSeconds: number | null;
  offDurationSeconds: number | null;
  onPower: number | null;
  offPower: number | null;
}

export interface WorkoutDto {
  id: string;
  userId: string | null;
  name: string;
  description: string;
  category: string;
  source: string;
  durationMinutes: number;
  estimatedTSS: number;
  targetZone: string;
  isPublic: boolean;
  tags: string | null;
  createdAt: string;
  steps: WorkoutStepDto[];
}

export interface WorkoutSummaryDto {
  id: string;
  name: string;
  category: string;
  source: string;
  durationMinutes: number;
  estimatedTSS: number;
  targetZone: string;
  tags: string | null;
}

export interface WorkoutSearchResultDto {
  items: WorkoutSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CreateWorkoutStepDto {
  order: number;
  type: string;
  durationSeconds: number;
  powerLow: number;
  powerHigh: number;
  cadence?: number | null;
  repeat?: number | null;
  onDurationSeconds?: number | null;
  offDurationSeconds?: number | null;
  onPower?: number | null;
  offPower?: number | null;
}

export interface CreateWorkoutRequest {
  name: string;
  description: string;
  category: string;
  targetZone: string;
  isPublic: boolean;
  tags: string | null;
  steps: CreateWorkoutStepDto[];
}

export const PLAN_MODES = ['DailyRecommendations', 'FullPlan'] as const;

export interface TrainingPreferenceDto {
  id: string;
  goal: string;
  daysPerWeek: number;
  weeklyHoursAvailable: number;
  planDurationWeeks: number;
  level: string;
  targetEventDate: string | null;
  preferredWorkoutMinutes: number;
  considerNonCycling: boolean;
  planMode: string;
  isActive: boolean;
}

export interface SaveTrainingPreferenceRequest {
  goal: string;
  daysPerWeek: number;
  weeklyHoursAvailable: number;
  planDurationWeeks: number;
  level: string;
  targetEventDate: string | null;
  preferredWorkoutMinutes: number;
  considerNonCycling: boolean;
  planMode: string;
}

export interface DailyRecommendationDto {
  id: string;
  date: string;
  readinessScore: number;
  recommendationType: string;
  reason: string;
  status: string;
  recommendedWorkout: WorkoutDto | null;
  alternativeWorkout: WorkoutDto | null;
  completedActivityId: string | null;
}

export interface ReadinessBreakdownDto {
  overallScore: number;
  tsbScore: number | null;
  tsbValue: number | null;
  bodyBatteryScore: number | null;
  bodyBatteryValue: number | null;
  sleepScore: number | null;
  sleepScoreValue: number | null;
  trainingReadinessScore: number | null;
  trainingReadinessValue: number | null;
  stressScore: number | null;
  stressValue: number | null;
}

export interface WeeklyPlanDto {
  weekStart: string;
  weekEnd: string;
  days: DailyRecommendationDto[];
}

export interface FullPlanDto {
  planStart: string;
  planEnd: string;
  weeks: number;
  weeksData: WeeklyPlanDto[];
}

export const WORKOUT_CATEGORIES = [
  'Recovery', 'Endurance', 'Tempo', 'SweetSpot',
  'Threshold', 'VO2Max', 'Anaerobic', 'Sprint', 'Mixed'
] as const;

export const TRAINING_ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'] as const;

export const STEP_TYPES = [
  'Warmup', 'SteadyState', 'Ramp', 'Intervals', 'FreeRide', 'Cooldown'
] as const;

export const TRAINING_GOALS = [
  'GeneralFitness', 'FtpImprovement', 'Endurance',
  'SprintPower', 'RacePrep', 'WeightLoss'
] as const;

export const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Recovery: 'bg-green-100 text-green-800',
  Endurance: 'bg-blue-100 text-blue-800',
  Tempo: 'bg-yellow-100 text-yellow-800',
  SweetSpot: 'bg-orange-100 text-orange-800',
  Threshold: 'bg-red-100 text-red-800',
  VO2Max: 'bg-purple-100 text-purple-800',
  Anaerobic: 'bg-pink-100 text-pink-800',
  Sprint: 'bg-indigo-100 text-indigo-800',
  Mixed: 'bg-gray-100 text-gray-800',
};

export const ZONE_COLORS: Record<string, string> = {
  Z1: '#94a3b8',
  Z2: '#3b82f6',
  Z3: '#22c55e',
  Z4: '#f59e0b',
  Z5: '#ef4444',
  Z6: '#a855f7',
};
