using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Services;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class RecommendationEngine : IRecommendationEngine
{
    private readonly IReadinessDataProvider _readinessDataProvider;
    private readonly IWorkoutRepository _workoutRepository;
    private readonly ITrainingPreferenceRepository _preferenceRepository;
    private readonly IDailyRecommendationRepository _recommendationRepository;

    public RecommendationEngine(
        IReadinessDataProvider readinessDataProvider,
        IWorkoutRepository workoutRepository,
        ITrainingPreferenceRepository preferenceRepository,
        IDailyRecommendationRepository recommendationRepository)
    {
        _readinessDataProvider = readinessDataProvider;
        _workoutRepository = workoutRepository;
        _preferenceRepository = preferenceRepository;
        _recommendationRepository = recommendationRepository;
    }

    public async Task<DailyRecommendationDto> GenerateRecommendationAsync(
        Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var existing = await _recommendationRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
        if (existing is not null)
            return existing.ToDto();

        var preference = await _preferenceRepository.GetActiveByUserIdAsync(userId, cancellationToken);
        var readiness = await _readinessDataProvider.GetReadinessDataAsync(userId, date, cancellationToken);
        var breakdown = ComputeReadinessBreakdown(readiness);
        var score = breakdown.OverallScore;

        var recommendationType = DetermineRecommendationType(score, preference);
        var category = DetermineWorkoutCategory(score, preference);

        Workout? primaryWorkout = null;
        Workout? alternativeWorkout = null;
        string reason;

        if (recommendationType == RecommendationType.RestDay)
        {
            reason = BuildReason(score, readiness, "Rest day recommended - your body needs recovery.");
        }
        else if (recommendationType == RecommendationType.AlternativeActivity)
        {
            reason = BuildReason(score, readiness, "Consider a light walk or other low-impact activity instead of cycling today.");
        }
        else
        {
            var preferredDuration = preference?.PreferredWorkoutMinutes ?? 60;
            var minDuration = Math.Max(20, preferredDuration - 15);
            var maxDuration = preferredDuration + 15;

            var recentWorkoutIds = await _recommendationRepository.GetRecentWorkoutIdsAsync(userId, 14, cancellationToken);
            var candidates = await _workoutRepository.GetByCategoryAndDurationAsync(category, minDuration, maxDuration, cancellationToken);

            if (candidates.Count == 0)
                candidates = await _workoutRepository.GetByCategoryAndDurationAsync(category, 15, 180, cancellationToken);

            var scored = candidates
                .Select(w => new { Workout = w, Score = ScoreWorkout(w, score, readiness, recentWorkoutIds) })
                .OrderByDescending(x => x.Score)
                .ToList();

            primaryWorkout = scored.FirstOrDefault()?.Workout;

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

            reason = BuildReason(score, readiness, $"Recommended a {category} workout based on your current readiness.");
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
        return saved!.ToDto();
    }

    public async Task<ReadinessBreakdownDto> GetReadinessBreakdownAsync(
        Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var readiness = await _readinessDataProvider.GetReadinessDataAsync(userId, date, cancellationToken);
        return ComputeReadinessBreakdown(readiness);
    }

    private static ReadinessBreakdownDto ComputeReadinessBreakdown(ReadinessData data)
    {
        decimal? tsbScore = null, bodyBatteryScore = null, sleepScore = null;
        decimal? trainingReadinessScore = null, stressScore = null;

        if (data.HasGarminData && data.HasPmcData)
        {
            tsbScore = data.TSB.HasValue ? MapTsbToScore(data.TSB.Value) * 0.30m : null;
            bodyBatteryScore = data.BodyBatteryMax.HasValue ? data.BodyBatteryMax.Value * 0.20m / 100m * 100m : null;
            sleepScore = data.SleepScore.HasValue ? data.SleepScore.Value * 0.20m / 100m * 100m : null;
            trainingReadinessScore = data.TrainingReadinessScore.HasValue ? data.TrainingReadinessScore.Value * 0.15m / 100m * 100m : null;
            stressScore = data.AverageStressLevel.HasValue ? (100 - data.AverageStressLevel.Value) * 0.15m / 100m * 100m : null;
        }
        else if (data.HasPmcData)
        {
            tsbScore = data.TSB.HasValue ? MapTsbToScore(data.TSB.Value) * 0.70m : null;
        }
        else if (data.HasGarminData)
        {
            bodyBatteryScore = data.BodyBatteryMax.HasValue ? data.BodyBatteryMax.Value * 0.35m / 100m * 100m : null;
            sleepScore = data.SleepScore.HasValue ? data.SleepScore.Value * 0.30m / 100m * 100m : null;
            trainingReadinessScore = data.TrainingReadinessScore.HasValue ? data.TrainingReadinessScore.Value * 0.20m / 100m * 100m : null;
            stressScore = data.AverageStressLevel.HasValue ? (100 - data.AverageStressLevel.Value) * 0.15m / 100m * 100m : null;
        }

        var components = new[] { tsbScore, bodyBatteryScore, sleepScore, trainingReadinessScore, stressScore };
        var overall = components.Where(c => c.HasValue).Sum(c => c!.Value);

        if (!components.Any(c => c.HasValue))
            overall = 50m;

        overall = Math.Clamp(overall, 0m, 100m);

        return new ReadinessBreakdownDto(
            Math.Round(overall, 1),
            tsbScore.HasValue ? Math.Round(tsbScore.Value, 1) : null,
            data.TSB.HasValue ? (decimal)Math.Round(data.TSB.Value, 1) : null,
            bodyBatteryScore.HasValue ? Math.Round(bodyBatteryScore.Value, 1) : null,
            data.BodyBatteryMax,
            sleepScore.HasValue ? Math.Round(sleepScore.Value, 1) : null,
            data.SleepScore,
            trainingReadinessScore.HasValue ? Math.Round(trainingReadinessScore.Value, 1) : null,
            data.TrainingReadinessScore,
            stressScore.HasValue ? Math.Round(stressScore.Value, 1) : null,
            data.AverageStressLevel);
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

        return ApplyGoalBias(baseCategory, preference.Goal, score);
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

    private static decimal ScoreWorkout(Workout workout, decimal readinessScore, ReadinessData readiness, IReadOnlyList<Guid> recentWorkoutIds)
    {
        decimal score = 50m;

        if (recentWorkoutIds.Contains(workout.Id))
            score -= 30m;

        if (readiness.CTL.HasValue && readiness.CTL.Value > 0)
        {
            var targetTss = readiness.CTL.Value * (readinessScore > 60 ? 1.2f : 0.8f);
            var tssDiff = Math.Abs(workout.EstimatedTSS - targetTss);
            score -= (decimal)(tssDiff / 10f);
        }

        if (!string.IsNullOrEmpty(workout.Tags))
        {
            if (readinessScore > 70 && workout.Tags.Contains("progressive"))
                score += 5m;
            if (readinessScore < 40 && workout.Tags.Contains("easy"))
                score += 5m;
        }

        return score;
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
            parts.Add($"Form (TSB): {data.TSB.Value:F1}.");

        if (data.BodyBatteryMax.HasValue)
            parts.Add($"Body Battery: {data.BodyBatteryMax.Value}/100.");

        if (data.SleepScore.HasValue)
            parts.Add($"Sleep Score: {data.SleepScore.Value}/100.");

        if (data.TrainingReadinessScore.HasValue)
            parts.Add($"Training Readiness: {data.TrainingReadinessScore.Value}/100.");

        return string.Join(" ", parts);
    }
}
