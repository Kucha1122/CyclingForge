# CyclingForge

A modular monolith application for cyclists, built with .NET 10, Clean Architecture, and Domain-Driven Design.

## Architecture

- **Modular Monolith** with Clean Architecture layers per module
- **Domain-Driven Design** (DDD) with Aggregates, Value Objects, Domain Events
- **CQRS** via MediatR
- **SQL Server** with EF Core (separate DbContext per module)

## Modules

| Module | Description |
|---|---|
| **Users** | Registration, authentication (JWT), user profile management |
| **Strava** | Strava OAuth 2.0, token management, athlete data sync |
| **Activities** | Activity sync from Strava, caching, listing and details |

## Tech Stack

- .NET 10 WebAPI
- Entity Framework Core 10 + SQL Server
- MediatR (CQRS)
- FluentValidation
- JWT Authentication
- React 19 + Tailwind CSS v4 + MUI v6 (frontend - planned)

## Getting Started

### Prerequisites

- .NET 10 SDK
- SQL Server (LocalDB or full instance)

### Run

```bash
cd src/Bootstrapper/CyclingForge.Bootstrapper
dotnet run
```

### Configuration

Update `appsettings.Development.json` with your SQL Server connection string and Strava API credentials.

## Project Structure

```
src/
  Bootstrapper/          - API host, composition root
  Shared/                - Shared abstractions and infrastructure
  Modules/
    Users/               - User management module
    Strava/              - Strava integration module
    Activities/          - Activities module
tests/                   - Unit, application, and integration tests
```
