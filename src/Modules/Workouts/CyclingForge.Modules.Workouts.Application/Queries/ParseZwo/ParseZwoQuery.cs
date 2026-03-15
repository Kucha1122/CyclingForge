using CyclingForge.Modules.Workouts.Application.DTOs;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.ParseZwo;

public sealed record ParseZwoQuery(string ZwoXmlContent) : IRequest<ParseZwoResultDto>;
