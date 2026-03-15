using System.IO;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkoutsFromZip;

public sealed record ImportWorkoutsFromZipCommand(Guid UserId, Stream ZipStream) : ICommand<BulkImportZwoResult>;
