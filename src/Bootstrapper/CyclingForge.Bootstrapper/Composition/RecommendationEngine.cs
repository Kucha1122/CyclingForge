using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Services;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class RecommendationEngine : IRecommendationEngine
{
    private readonly IReadinessDataProvider _readinessDataProvider;
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IWorkoutGeneratorService _workoutGenerator;
    private readonly ITrainingPreferenceRepository _preferenceRepository;
    private readonly IDailyRecommendationRepository _recommendationRepository;
    private readonly IUserRepository _userRepository;

    public RecommendationEngine(
        IReadinessDataProvider readinessDataProvider,
        IWorkoutRepository workoutRepository,
        IWorkoutGeneratorService workoutGenerator,
        ITrainingPreferenceRepository preferenceRepository,
        IDailyRecommendationRepository recommendationRepository,
        IUserRepository userRepository)
    {
        _readinessDataProvider = readinessDataProvider;
        _workoutRepository = workoutRepository;
        _workoutGenerator = workoutGenerator;
        _preferenceRepository = preferenceRepository;
        _recommendationRepository = recommendationRepository;
        _userRepository = userRepository;
    }

    // Number of consecutive recent CR10 sessions at or above this RPE that triggers an extra
    // downgrade step in plan mode (subjective overload signal complementing TSB/HRV).
    private const int HardRpeThreshold = 8;

    public async Task<DailyRecommendationDto> GenerateRecommendationAsync(
        Guid userId,
        DateOnly date,
        CancellationToken cancellationToken = default,
        IReadOnlyList<Guid>? avoidRepeatWorkoutIds = null,
        DayIntent? plannedIntent = null)
    {
        var existing = await _recommendationRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
        if (existing is not null)
            return WithPlanMetadata(existing.ToDto(), plannedIntent);

        var preference = await _preferenceRepository.GetActiveByUserIdAsync(userId, cancellationToken);
        var readiness = await _readinessDataProvider.GetReadinessDataAsync(userId, date, cancellationToken);
        var breakdown = ComputeReadinessBreakdown(readiness);
        var score = breakdown.OverallScore;

        // Subjective overload signal: when the athlete opted into RPE feedback and the last two
        // logged sessions were both hard (CR10 >= threshold), nudge today's plan session down a step.
        var rpeOverload = false;
        if (plannedIntent is not null)
        {
            var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
            if (user?.EnableRpeFeedback == true)
            {
                var recentRpe = await _recommendationRepository.GetRecentRpeAsync(userId, 7, 2, cancellationToken);
                rpeOverload = recentRpe.Count >= 2 && recentRpe.All(r => r >= HardRpeThreshold);
            }
        }

        RecommendationType recommendationType;
        WorkoutCategory category;
        decimal? loadFactorOverride = null;
        var adaptedDown = false;

        if (plannedIntent is not null)
        {
            // Plan mode: the macro-cycle drives the category. When fresh Garmin data exists for
            // this day (typically today), moderately adapt the planned session to readiness.
            loadFactorOverride = plannedIntent.LoadFactor;

            if (plannedIntent.IsRestDay)
            {
                recommendationType = RecommendationType.RestDay;
                category = WorkoutCategory.Recovery;
            }
            else if (score < 10)
            {
                recommendationType = RecommendationType.RestDay;
                category = WorkoutCategory.Recovery;
                adaptedDown = true;
            }
            else
            {
                recommendationType = RecommendationType.Workout;
                category = AdaptCategoryToReadiness(plannedIntent.TargetCategory, score, readiness, rpeOverload, out adaptedDown);
            }
        }
        else
        {
            recommendationType = DetermineRecommendationType(score, preference);
            category = DetermineWorkoutCategory(score, preference);
        }

        Workout? primaryWorkout = null;
        Workout? alternativeWorkout = null;
        string reason;

        if (recommendationType == RecommendationType.RestDay)
        {
            var restMessage = adaptedDown
                ? "Rest day - readiness is very low today, prioritise recovery."
                : plannedIntent?.IsDeloadWeek == true
                    ? "Rest day - part of your recovery (deload) week."
                    : "Rest day recommended - your body needs recovery.";
            reason = BuildReason(score, readiness, restMessage);
        }
        else if (recommendationType == RecommendationType.AlternativeActivity)
        {
            reason = BuildReason(score, readiness, "Consider a light walk or other low-impact activity instead of cycling today.");
        }
        else
        {
            // In plan mode the macro-cycle sets the session length from the weekly hour budget;
            // otherwise fall back to the user's preferred workout length.
            var targetDuration = plannedIntent is not null
                ? plannedIntent.TargetDurationMinutes
                : preference?.PreferredWorkoutMinutes ?? 60;
            var minDuration = Math.Max(20, (int)Math.Round(targetDuration * 0.85));
            var maxDuration = (int)Math.Round(targetDuration * 1.15);
            var level = preference?.Level ?? FitnessLevel.Intermediate;
            var allowGenerate = plannedIntent is not null;

            var recentWorkoutIds = await _recommendationRepository.GetRecentWorkoutIdsAsync(userId, 14, cancellationToken);
            var idsToAvoid = avoidRepeatWorkoutIds is { Count: > 0 }
                ? recentWorkoutIds.Union(avoidRepeatWorkoutIds).Distinct().ToList()
                : recentWorkoutIds;

            var candidates = await _workoutRepository.GetByCategoryAndDurationAsync(category, minDuration, maxDuration, cancellationToken);
            if (candidates.Count == 0 && !allowGenerate)
                candidates = await _workoutRepository.GetByCategoryAndDurationAsync(category, 15, 180, cancellationToken);

            var scored = candidates
                .Select(w => new { Workout = w, Score = ScoreWorkout(w, score, readiness, idsToAvoid, preference, loadFactorOverride, targetDuration) })
                .OrderByDescending(x => x.Score)
                .ToList();

            primaryWorkout = scored.FirstOrDefault()?.Workout;

            // Hybrid: when the library has no session of the right length/category for a plan day,
            // reuse a previously generated one or synthesize (and persist) a new one.
            if (primaryWorkout is null && allowGenerate)
            {
                primaryWorkout = await ResolveGeneratedWorkoutAsync(
                    userId, category, targetDuration, minDuration, maxDuration, level, cancellationToken);
            }

            var altCategory = GetAlternativeCategory(category, score);
            if (altCategory != category)
            {
                var altCandidates = await _workoutRepository.GetByCategoryAndDurationAsync(altCategory, minDuration, maxDuration, cancellationToken);
                alternativeWorkout = altCandidates
                    .Where(w => w.Id != primaryWorkout?.Id)
                    .OrderBy(_ => Guid.NewGuid())
                    .FirstOrDefault();
            }
            else
            {
                alternativeWorkout = scored.Skip(1).FirstOrDefault()?.Workout;
            }

            string mainMessage;
            if (plannedIntent is not null)
            {
                if (adaptedDown)
                    mainMessage = $"Adjusted today's plan down to a {category} workout because of low readiness.";
                else if (plannedIntent.IsDeloadWeek)
                    mainMessage = $"{category} workout - recovery (deload) week to absorb training and super-compensate.";
                else if (plannedIntent.IsTaper)
                    mainMessage = $"{category} workout - tapering before your target event.";
                else
                    mainMessage = $"{category} workout from your {plannedIntent.Model} plan.";
            }
            else
            {
                mainMessage = $"Recommended a {category} workout based on your current readiness.";
            }

            reason = BuildReason(score, readiness, mainMessage);
        }

        var recommendation = DailyRecommendation.Create(
            userId, date,
            primaryWorkout?.Id,
            alternativeWorkout?.Id,
            score,
            recommendationType,
            reason,
            DateTime.UtcNow);

        await _recommendationRepository.AddAsync(recommendation, cancellationToken);

        var saved = await _recommendationRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
        return WithPlanMetadata(saved!.ToDto(), plannedIntent);
    }

    // Overlays structured periodization metadata (used by the plan view) onto the recommendation DTO.
    private static DailyRecommendationDto WithPlanMetadata(DailyRecommendationDto dto, DayIntent? intent)
    {
        if (intent is null)
            return dto;

        return dto with
        {
            IsDeloadWeek = intent.IsDeloadWeek,
            IsTaper = intent.IsTaper,
            TargetDurationMinutes = intent.IsRestDay ? null : intent.TargetDurationMinutes,
        };
    }

    public async Task<ReadinessBreakdownDto> GetReadinessBreakdownAsync(
        Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var readiness = await _readinessDataProvider.GetReadinessDataAsync(userId, date, cancellationToken);
        return ComputeReadinessBreakdown(readiness);
    }

    public async Task<DailyRecommendationDto> RefreshReadinessAsync(
        DailyRecommendationDto recommendation, Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var readiness = await _readinessDataProvider.GetReadinessDataAsync(userId, date, cancellationToken);
        var freshScore = ComputeReadinessBreakdown(readiness).OverallScore;

        // Preserve the workout/plan message (everything before the readiness summary) and rebuild the
        // readiness numbers from current data, so a recommendation generated earlier shows live values.
        const string marker = " Readiness score:";
        var idx = recommendation.Reason?.IndexOf(marker, StringComparison.Ordinal) ?? -1;
        var mainMessage = idx >= 0
            ? recommendation.Reason!.Substring(0, idx)
            : recommendation.Reason ?? string.Empty;

        var freshReason = BuildReason(freshScore, readiness, mainMessage);

        return recommendation with { ReadinessScore = freshScore, Reason = freshReason };
    }

    // Base weights of each readiness component. Missing components are dropped and the
    // remaining weights are re-normalized so that absent data does not deflate the score.
    private const decimal TsbWeight = 0.25m;
    private const decimal SleepWeight = 0.20m;
    private const decimal HrvWeight = 0.15m;
    private const decimal BodyBatteryWeight = 0.15m;
    private const decimal TrainingReadinessWeight = 0.15m;
    private const decimal StressWeight = 0.10m;

    private static ReadinessBreakdownDto ComputeReadinessBreakdown(ReadinessData data)
    {
        // Sub-scores are normalized to 0-100; null means the component is unavailable.
        decimal? tsbSub = data.TSB.HasValue ? MapTsbToScore(data.TSB.Value) : null;
        decimal? sleepSub = data.SleepScore;
        decimal? bodyBatterySub = data.BodyBatteryMax;
        decimal? trainingReadinessSub = data.TrainingReadinessScore;
        decimal? stressSub = data.AverageStressLevel.HasValue ? 100 - data.AverageStressLevel.Value : null;
        decimal? hrvSub = ComputeHrvSubScore(data);

        var present = new (decimal? Sub, decimal Weight)[]
        {
            (tsbSub, TsbWeight),
            (sleepSub, SleepWeight),
            (hrvSub, HrvWeight),
            (bodyBatterySub, BodyBatteryWeight),
            (trainingReadinessSub, TrainingReadinessWeight),
            (stressSub, StressWeight),
        }.Where(c => c.Sub.HasValue).ToList();

        var totalWeight = present.Sum(c => c.Weight);

        decimal? Contribution(decimal? sub, decimal weight) =>
            sub.HasValue && totalWeight > 0 ? Math.Round(sub.Value * weight / totalWeight, 1) : null;

        var overall = totalWeight > 0
            ? present.Sum(c => c.Sub!.Value * c.Weight) / totalWeight
            : 50m;
        overall = Math.Clamp(overall, 0m, 100m);

        return new ReadinessBreakdownDto(
            Math.Round(overall, 1),
            Contribution(tsbSub, TsbWeight),
            data.TSB.HasValue ? (decimal)Math.Round(data.TSB.Value, 1) : null,
            Contribution(bodyBatterySub, BodyBatteryWeight),
            data.BodyBatteryMax,
            Contribution(sleepSub, SleepWeight),
            data.SleepScore,
            Contribution(trainingReadinessSub, TrainingReadinessWeight),
            data.TrainingReadinessScore,
            Contribution(stressSub, StressWeight),
            data.AverageStressLevel,
            Contribution(hrvSub, HrvWeight),
            data.HrvLastNightMs,
            data.HrvBaselineMs);
    }

    // HRV sub-score relative to the personal baseline (preferred), falling back to the
    // qualitative HRV status when no baseline is available.
    private static decimal? ComputeHrvSubScore(ReadinessData data)
    {
        if (data.HrvLastNightMs.HasValue && data.HrvBaselineMs is > 0)
        {
            var deviation = (decimal)(data.HrvLastNightMs.Value - data.HrvBaselineMs.Value) / data.HrvBaselineMs.Value;
            // +/-12.5% deviation maps to the full 0-100 range around a neutral 50.
            return Math.Clamp(50m + deviation * 400m, 0m, 100m);
        }

        return data.HrvStatus?.Trim().ToLowerInvariant() switch
        {
            "balanced" => 75m,
            "high" => 65m,
            "unbalanced" => 40m,
            "low" => 30m,
            "poor" => 25m,
            _ => null
        };
    }

    private static decimal MapTsbToScore(float tsb)
    {
        var clamped = Math.Clamp(tsb, -40f, 30f);
        return (decimal)((clamped + 40f) / 70f * 100f);
    }

    private static RecommendationType DetermineRecommendationType(decimal score, TrainingPreference? preference)
    {
        if (score < 10)
            return RecommendationType.RestDay;

        if (score < 20 && preference?.ConsiderNonCycling == true)
            return RecommendationType.AlternativeActivity;

        return RecommendationType.Workout;
    }

    private static WorkoutCategory DetermineWorkoutCategory(decimal score, TrainingPreference? preference)
    {
        var baseCategory = score switch
        {
            < 15 => WorkoutCategory.Recovery,
            < 30 => WorkoutCategory.Recovery,
            < 45 => WorkoutCategory.Endurance,
            < 55 => WorkoutCategory.Tempo,
            < 65 => WorkoutCategory.SweetSpot,
            < 75 => WorkoutCategory.Threshold,
            _ => WorkoutCategory.VO2Max
        };

        if (preference is null)
            return baseCategory;

        var afterGoal = ApplyGoalBias(baseCategory, preference.Goal, score);
        var afterLevel = ApplyLevelBias(afterGoal, preference.Level, score);
        return ApplyDaysPerWeekBias(afterLevel, preference.DaysPerWeek, score);
    }

    private static WorkoutCategory ApplyLevelBias(WorkoutCategory category, FitnessLevel level, decimal score)
    {
        if (level == FitnessLevel.Advanced)
            return category;

        if (level == FitnessLevel.Beginner)
        {
            return category switch
            {
                WorkoutCategory.Threshold or WorkoutCategory.VO2Max or WorkoutCategory.Anaerobic or WorkoutCategory.Sprint
                    when score < 70 => WorkoutCategory.Tempo,
                WorkoutCategory.SweetSpot when score < 55 => WorkoutCategory.Endurance,
                _ => category
            };
        }

        return category;
    }

    private static WorkoutCategory ApplyDaysPerWeekBias(WorkoutCategory category, int daysPerWeek, decimal score)
    {
        if (daysPerWeek <= 3)
        {
            if (category == WorkoutCategory.Endurance && score > 45)
                return WorkoutCategory.Tempo;
            if (category == WorkoutCategory.Recovery && score > 35)
                return WorkoutCategory.Endurance;
        }
        else if (daysPerWeek >= 6)
        {
            if (category == WorkoutCategory.Tempo && score < 55)
                return WorkoutCategory.Endurance;
            if (category == WorkoutCategory.SweetSpot && score < 65)
                return WorkoutCategory.Tempo;
        }

        return category;
    }

    private static WorkoutCategory ApplyGoalBias(WorkoutCategory baseCategory, TrainingGoal goal, decimal score)
    {
        if (score < 30) return baseCategory;

        return goal switch
        {
            TrainingGoal.FtpImprovement when baseCategory == WorkoutCategory.Tempo => WorkoutCategory.SweetSpot,
            TrainingGoal.FtpImprovement when baseCategory == WorkoutCategory.Endurance && score > 40 => WorkoutCategory.Tempo,
            TrainingGoal.Endurance when baseCategory == WorkoutCategory.Tempo => WorkoutCategory.Endurance,
            TrainingGoal.Endurance when baseCategory == WorkoutCategory.SweetSpot => WorkoutCategory.Tempo,
            TrainingGoal.SprintPower when baseCategory == WorkoutCategory.VO2Max => WorkoutCategory.Anaerobic,
            TrainingGoal.SprintPower when baseCategory == WorkoutCategory.Threshold && score > 70 => WorkoutCategory.Sprint,
            TrainingGoal.RacePrep when baseCategory == WorkoutCategory.SweetSpot => WorkoutCategory.Mixed,
            TrainingGoal.WeightLoss when baseCategory == WorkoutCategory.Recovery => WorkoutCategory.Endurance,
            _ => baseCategory
        };
    }

    // Reuses a previously generated workout for this user/category/duration bucket, or synthesizes
    // and persists a new one so plan days always have a session of the right length and intensity.
    private async Task<Workout> ResolveGeneratedWorkoutAsync(
        Guid userId,
        WorkoutCategory category,
        int targetDuration,
        int minDuration,
        int maxDuration,
        FitnessLevel level,
        CancellationToken cancellationToken)
    {
        var existing = await _workoutRepository.GetGeneratedAsync(userId, category, minDuration, maxDuration, cancellationToken);
        if (existing is not null)
            return existing;

        var generated = _workoutGenerator.Generate(category, targetDuration, level, userId, DateTime.UtcNow);
        await _workoutRepository.AddAsync(generated, cancellationToken);
        return generated;
    }

    private static decimal ScoreWorkout(
        Workout workout,
        decimal readinessScore,
        ReadinessData readiness,
        IReadOnlyList<Guid> recentWorkoutIds,
        TrainingPreference? preference,
        decimal? loadFactorOverride = null,
        int? targetDurationMinutes = null)
    {
        decimal score = 50m;

        if (recentWorkoutIds.Contains(workout.Id))
            score -= 30m;

        // Prefer sessions close to the planned duration (primary driver of weekly volume).
        if (targetDurationMinutes is > 0)
            score -= Math.Abs(workout.DurationMinutes - targetDurationMinutes.Value) * 0.5m;

        if (readiness.CTL.HasValue && readiness.CTL.Value > 0)
        {
            // In plan mode the macro-cycle dictates the target load; otherwise scale by readiness.
            var loadFactor = loadFactorOverride ?? (decimal)(readinessScore > 60 ? 1.2f : 0.8f);
            var targetTss = (decimal)readiness.CTL.Value * loadFactor;
            var tssDiff = Math.Abs(workout.EstimatedTSS - targetTss);
            score -= tssDiff / 10m;
        }

        if (!string.IsNullOrEmpty(workout.Tags))
        {
            if (readinessScore > 70 && workout.Tags.Contains("progressive"))
                score += 5m;
            if (readinessScore < 40 && workout.Tags.Contains("easy"))
                score += 5m;
        }

        if (preference?.Level == FitnessLevel.Beginner)
        {
            if (workout.Tags?.Contains("easy") == true)
                score += 8m;
            if (workout.Tags?.Contains("vo2max") == true || workout.Tags?.Contains("anaerobic") == true ||
                workout.Tags?.Contains("sprint") == true || workout.Tags?.Contains("tabata") == true)
                score -= 10m;
        }

        return score;
    }

    // Intensity ladder used to downgrade a planned session when readiness is low.
    private static readonly WorkoutCategory[] IntensityLadder =
    {
        WorkoutCategory.Recovery,
        WorkoutCategory.Endurance,
        WorkoutCategory.Tempo,
        WorkoutCategory.SweetSpot,
        WorkoutCategory.Threshold,
        WorkoutCategory.VO2Max,
        WorkoutCategory.Anaerobic,
        WorkoutCategory.Sprint
    };

    // Part 3: moderate, downgrade-only adaptation of a planned category to today's readiness.
    // Only applies when fresh Garmin data exists for the day; otherwise the plan is trusted.
    private static WorkoutCategory AdaptCategoryToReadiness(
        WorkoutCategory planned, decimal score, ReadinessData readiness, bool rpeOverload, out bool adapted)
    {
        adapted = false;

        // The RPE overload signal is self-contained (it does not depend on Garmin freshness) and on
        // its own justifies a one-step downgrade.
        var rpeSteps = rpeOverload ? 1 : 0;

        if (!readiness.HasGarminData)
        {
            if (rpeSteps == 0)
                return planned;
            adapted = true;
            return DowngradeCategory(planned, rpeSteps);
        }

        var hrvBelowBaseline = readiness.HrvLastNightMs.HasValue && readiness.HrvBaselineMs is > 0
            && readiness.HrvLastNightMs.Value < readiness.HrvBaselineMs.Value * 0.9;

        var downgradeSteps = 0;
        if (score < 30 || (hrvBelowBaseline && score < 50))
            downgradeSteps = 2;
        else if (score < 45 || hrvBelowBaseline)
            downgradeSteps = 1;

        downgradeSteps += rpeSteps;

        if (downgradeSteps == 0)
            return planned;

        adapted = true;
        return DowngradeCategory(planned, downgradeSteps);
    }

    private static WorkoutCategory DowngradeCategory(WorkoutCategory category, int steps)
    {
        var index = Array.IndexOf(IntensityLadder, category);
        if (index < 0)
            index = Array.IndexOf(IntensityLadder, WorkoutCategory.Threshold); // Mixed -> threshold-ish
        var target = Math.Max(0, index - steps);
        return IntensityLadder[target];
    }

    private static WorkoutCategory GetAlternativeCategory(WorkoutCategory primary, decimal score)
    {
        return primary switch
        {
            WorkoutCategory.Recovery => WorkoutCategory.Endurance,
            WorkoutCategory.Endurance => WorkoutCategory.Tempo,
            WorkoutCategory.Tempo => score > 55 ? WorkoutCategory.SweetSpot : WorkoutCategory.Endurance,
            WorkoutCategory.SweetSpot => score > 65 ? WorkoutCategory.Threshold : WorkoutCategory.Tempo,
            WorkoutCategory.Threshold => score > 75 ? WorkoutCategory.VO2Max : WorkoutCategory.SweetSpot,
            WorkoutCategory.VO2Max => WorkoutCategory.Threshold,
            WorkoutCategory.Anaerobic => WorkoutCategory.VO2Max,
            WorkoutCategory.Sprint => WorkoutCategory.Anaerobic,
            _ => WorkoutCategory.Endurance
        };
    }

    private static string BuildReason(decimal score, ReadinessData data, string mainMessage)
    {
        var parts = new List<string> { mainMessage };

        parts.Add($"Readiness score: {score:F0}/100.");

        if (data.TSB.HasValue)
            // Invariant culture: the frontend parses this token with a regex, so the decimal
            // separator must always be a dot regardless of the server's current culture.
            parts.Add($"Form (TSB): {data.TSB.Value.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)}.");

        if (data.BodyBatteryMax.HasValue)
            parts.Add($"Body Battery: {data.BodyBatteryMax.Value}/100.");

        if (data.SleepScore.HasValue)
            parts.Add($"Sleep Score: {data.SleepScore.Value}/100.");

        if (data.TrainingReadinessScore.HasValue)
            parts.Add($"Training Readiness: {data.TrainingReadinessScore.Value}/100.");

        if (data.HrvLastNightMs.HasValue)
        {
            var hrvPart = $"HRV: {data.HrvLastNightMs.Value} ms";
            if (data.HrvBaselineMs is > 0)
                hrvPart += $" (baseline {data.HrvBaselineMs.Value} ms)";
            parts.Add(hrvPart + ".");
        }

        return string.Join(" ", parts);
    }
}
