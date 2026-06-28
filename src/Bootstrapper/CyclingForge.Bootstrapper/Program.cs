using System.Reflection;
using CyclingForge.Modules.Activities.Infrastructure;
using CyclingForge.Modules.Garmin.Infrastructure;
using CyclingForge.Modules.Strava.Infrastructure;
using CyclingForge.Modules.Users.Infrastructure;
using CyclingForge.Modules.Workouts.Infrastructure;
using CyclingForge.Shared.Infrastructure;
using CyclingForge.Shared.Infrastructure.Exceptions;
using CyclingForge.Shared.Infrastructure.Modules;
using CyclingForge.Bootstrapper.Composition;

var builder = WebApplication.CreateBuilder(args);

// Ensure module assemblies are loaded so LoadModules() and controller discovery can find them
var moduleAssemblyNames = new[]
{
    "CyclingForge.Modules.Users.Api",
    "CyclingForge.Modules.Strava.Api",
    "CyclingForge.Modules.Activities.Api",
    "CyclingForge.Modules.Garmin.Api",
    "CyclingForge.Modules.Workouts.Api",
};
foreach (var name in moduleAssemblyNames)
    Assembly.Load(name);

var modules = ModuleLoader.LoadModules(builder.Configuration);

builder.Services.AddSharedInfrastructure(builder.Configuration);
builder.Services.RegisterModules(modules, builder.Configuration);

builder.Services.AddMemoryCache();

// Real-time sync notifications (web + mobile auto-refresh after a sync completes).
builder.Services.AddSignalR();
builder.Services.AddSingleton<CyclingForge.Shared.Abstractions.RealTime.ISyncNotifier, CyclingForge.Bootstrapper.RealTime.SignalRSyncNotifier>();

// Configure eFTP estimation thresholds (can be overridden via configuration section "FtpEstimation").
builder.Services.Configure<FtpEstimationOptions>(builder.Configuration.GetSection("FtpEstimation"));

// Composition: provide user FTP and LTHR to Activities module for TSS calculation
builder.Services.AddScoped<CyclingForge.Modules.Activities.Application.Services.IUserFtpProvider, CyclingForge.Bootstrapper.Composition.UserFtpProvider>();
builder.Services.AddScoped<CyclingForge.Modules.Activities.Application.Services.IUserLthrProvider, CyclingForge.Bootstrapper.Composition.UserLthrProvider>();

// Composition: provide readiness data to Workouts module for recommendation engine
builder.Services.AddScoped<CyclingForge.Shared.Abstractions.Services.IReadinessDataProvider, CyclingForge.Bootstrapper.Composition.ReadinessDataProvider>();
builder.Services.AddScoped<CyclingForge.Modules.Workouts.Application.Services.IRecommendationEngine, CyclingForge.Bootstrapper.Composition.RecommendationEngine>();
// Composition: provide user FTP to Workouts module for FIT import (watts → % FTP)
builder.Services.AddScoped<CyclingForge.Modules.Workouts.Application.Services.IWorkoutImportFtpProvider, CyclingForge.Bootstrapper.Composition.WorkoutImportFtpProvider>();

var mvcBuilder = builder.Services.AddControllers();
foreach (var assembly in ModuleLoader.GetModuleAssemblies())
{
    mvcBuilder.AddApplicationPart(assembly);
}

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins",
        policy =>
        {
            var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:5173"];
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "CyclingForge API",
        Version = "v1",
        Description = "Modular monolith API for cycling data management with Strava integration."
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Apply pending EF migrations so new columns (e.g. FunctionalThresholdPower, WeightKg, Activity metrics, DeviceWatts) exist
app.UseUsersMigrations();
app.UseStravaMigrations();
app.UseActivitiesMigrations();
app.UseGarminMigrations();
app.UseWorkoutsMigrations();
await CyclingForge.Modules.Workouts.Infrastructure.Services.WorkoutSeeder.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseErrorHandling();
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowedOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<CyclingForge.Bootstrapper.RealTime.SyncHub>("/api/hubs/sync");
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
