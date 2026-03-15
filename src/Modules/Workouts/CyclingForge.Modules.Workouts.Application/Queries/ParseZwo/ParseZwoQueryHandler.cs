using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.ParseZwo;

internal sealed class ParseZwoQueryHandler : IRequestHandler<ParseZwoQuery, ParseZwoResultDto>
{
    private readonly IZwoImportService _zwoImportService;
    private readonly IClock _clock;

    public ParseZwoQueryHandler(IZwoImportService zwoImportService, IClock clock)
    {
        _zwoImportService = zwoImportService;
        _clock = clock;
    }

    public Task<ParseZwoResultDto> Handle(ParseZwoQuery request, CancellationToken cancellationToken)
    {
        var workout = _zwoImportService.ParseZwo(request.ZwoXmlContent, userId: null, _clock.CurrentDate());
        var result = workout.ToParseZwoResultDto();
        return Task.FromResult(result);
    }
}
