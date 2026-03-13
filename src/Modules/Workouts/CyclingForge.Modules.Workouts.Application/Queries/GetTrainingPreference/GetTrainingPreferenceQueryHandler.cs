using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetTrainingPreference;

internal sealed class GetTrainingPreferenceQueryHandler : IRequestHandler<GetTrainingPreferenceQuery, TrainingPreferenceDto?>
{
    private readonly ITrainingPreferenceRepository _repository;

    public GetTrainingPreferenceQueryHandler(ITrainingPreferenceRepository repository)
    {
        _repository = repository;
    }

    public async Task<TrainingPreferenceDto?> Handle(GetTrainingPreferenceQuery request, CancellationToken cancellationToken)
    {
        var preference = await _repository.GetActiveByUserIdAsync(request.UserId, cancellationToken);
        return preference?.ToDto();
    }
}
