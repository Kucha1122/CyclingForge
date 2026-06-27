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
  onCadence?: number | null;
  offCadence?: number | null;
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

export interface BulkImportZwoError {
  fileName: string;
  message: string;
}

export interface BulkImportZwoResult {
  importedCount: number;
  failedCount: number;
  errors: BulkImportZwoError[];
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
  onCadence?: number | null;
  offCadence?: number | null;
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

export interface ParseZwoResultDto {
  name: string;
  description: string;
  category: string;
  targetZone: string;
  isPublic: boolean;
  tags: string | null;
  steps: ParseZwoStepDto[];
}

export interface ParseZwoStepDto {
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
  onCadence?: number | null;
  offCadence?: number | null;
}

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
  periodizationModel: string;
  longRideDay: number | null;
  maxLongRideMinutes: number;
  mesocycleWeeks: number;
  restDays: number[];
  weekStartDay: number;
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
  periodizationModel: string;
  longRideDay: number | null;
  maxLongRideMinutes: number;
  mesocycleWeeks: number;
  restDays: number[];
  weekStartDay: number;
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
  rpe: number | null;
  legsFeel: string | null;
  sessionQuality: string | null;
  feedbackNote: string | null;
  isDeloadWeek: boolean;
  isTaper: boolean;
  targetDurationMinutes: number | null;
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
  hrvScore: number | null;
  hrvLastNightMs: number | null;
  hrvBaselineMs: number | null;
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
