using System.Reflection;
using CyclingForge.Shared.Infrastructure;
using CyclingForge.Shared.Infrastructure.Exceptions;
using CyclingForge.Shared.Infrastructure.Modules;

var builder = WebApplication.CreateBuilder(args);

// Ensure module assemblies are loaded so LoadModules() and controller discovery can find them
var moduleAssemblyNames = new[]
{
    "CyclingForge.Modules.Users.Api",
    "CyclingForge.Modules.Strava.Api",
    "CyclingForge.Modules.Activities.Api",
};
foreach (var name in moduleAssemblyNames)
    Assembly.Load(name);

var modules = ModuleLoader.LoadModules(builder.Configuration);

builder.Services.AddSharedInfrastructure(builder.Configuration);
builder.Services.RegisterModules(modules, builder.Configuration);

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
            policy.WithOrigins("http://localhost:5173")
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseErrorHandling();
app.UseHttpsRedirection();
app.UseCors("AllowedOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
