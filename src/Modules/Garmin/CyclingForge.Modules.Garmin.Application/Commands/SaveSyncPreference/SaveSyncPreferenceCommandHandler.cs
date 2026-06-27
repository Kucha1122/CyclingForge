using CyclingForge.Modules.Garmin.Application.Defaults;
using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.SaveSyncPreference;

internal sealed class SaveSyncPreferenceCommandHandler : IRequestHandler<SaveSyncPreferenceCommand>
{
    private readonly IGarminSyncPreferenceRepository _repository;
    private readonly IClock _clock;

    public SaveSyncPreferenceCommandHandler(IGarminSyncPreferenceRepository repository, IClock clock)
    {
        _repository = repository;
        _clock = clock;
    }

    public async Task Handle(SaveSyncPreferenceCommand command, CancellationToken cancellationToken)
    {
        var times = command.SyncTimes
            .Select(s => TimeOnly.TryParse(s, out var t) ? (TimeOnly?)t : null)
            .Where(t => t.HasValue)
            .Select(t => t!.Value)
            .Distinct()
            .OrderBy(t => t)
            .Take(GarminSyncDefaults.MaxSyncTimes)
            .ToList();

        var timeZoneId = string.IsNullOrWhiteSpace(command.TimeZoneId)
            ? GarminSyncDefaults.TimeZoneId
            : command.TimeZoneId;

        var now = _clock.CurrentDate();
        var existing = await _repository.GetByUserIdAsync(command.UserId, cancellationToken);
        if (existing is null)
        {
            var preference = GarminSyncPreference.Create(command.UserId, times, command.Enabled, timeZoneId, now);
            await _repository.AddAsync(preference, cancellationToken);
            return;
        }

        existing.Update(times, command.Enabled, timeZoneId, now);
        await _repository.UpdateAsync(existing, cancellationToken);
    }
}
