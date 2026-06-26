FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props* ./
COPY src/ src/

WORKDIR /src/src/Bootstrapper/CyclingForge.Bootstrapper
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Run as the non-root "app" user shipped in the .NET base image
USER $APP_UID

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "CyclingForge.Bootstrapper.dll"]
