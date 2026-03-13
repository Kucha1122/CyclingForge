using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetTrainingPreference;

public sealed record GetTrainingPreferenceQuery(Guid UserId) : IQuery<TrainingPreferenceDto?>;
