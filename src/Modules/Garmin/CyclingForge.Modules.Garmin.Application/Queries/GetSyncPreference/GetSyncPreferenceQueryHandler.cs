using CyclingForge.Modules.Garmin.Application.Defaults;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetSyncPreference;

internal sealed class GetSyncPreferenceQueryHandler : IRequestHandler<GetSyncPreferenceQuery, GarminSyncPreferenceDto>
{
    private readonly IGarminSyncPreferenceRepository _repository;

    public GetSyncPreferenceQueryHandler(IGarminSyncPreferenceRepository repository)
    {
        _repository = repository;
    }

    public async Task<GarminSyncPreferenceDto> Handle(GetSyncPreferenceQuery request, CancellationToken cancellationToken)
    {
        var preference = await _repository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (preference is null)
        {
            return new GarminSyncPreferenceDto(
                GarminSyncDefaults.SyncTimes.Select(t => t.ToString("HH\\:mm")).ToList(),
                GarminSyncDefaults.Enabled,
                GarminSyncDefaults.TimeZoneId);
        }

        return new GarminSyncPreferenceDto(
            preference.GetSyncTimes().Select(t => t.ToString("HH\\:mm")).ToList(),
            preference.Enabled,
            preference.TimeZoneId);
    }
}
