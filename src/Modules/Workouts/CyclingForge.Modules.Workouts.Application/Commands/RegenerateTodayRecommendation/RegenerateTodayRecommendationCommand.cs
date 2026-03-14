using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.RegenerateTodayRecommendation;

public sealed record RegenerateTodayRecommendationCommand(Guid UserId) : ICommand<DailyRecommendationDto>;
