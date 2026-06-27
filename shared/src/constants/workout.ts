export const PLAN_MODES = ['DailyRecommendations', 'FullPlan'] as const;

export const PERIODIZATION_MODELS = ['Auto', 'Polarized', 'Pyramidal'] as const;

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

export const ZONE_COLORS: Record<string, string> = {
  Z1: '#94a3b8',
  Z2: '#3b82f6',
  Z3: '#22c55e',
  Z4: '#f59e0b',
  Z5: '#ef4444',
  Z6: '#a855f7',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Recovery: 'bg-green-100 text-green-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  Endurance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  Tempo: 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/60 dark:text-amber-200',
  SweetSpot: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
  Threshold: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  VO2Max: 'bg-purple-100 text-purple-800 dark:bg-violet-900/60 dark:text-violet-200',
  Anaerobic: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
  Sprint: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  Mixed: 'bg-gray-100 text-gray-800 dark:bg-gray-600/50 dark:text-gray-200',
};
