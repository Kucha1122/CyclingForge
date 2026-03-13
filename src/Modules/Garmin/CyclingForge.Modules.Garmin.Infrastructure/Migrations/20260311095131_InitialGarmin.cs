using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Garmin.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialGarmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "garmin");

            // DailyWellness: create only if not exists (idempotent for existing DB from old migration)
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[garmin].[DailyWellness]', N'U') IS NULL
BEGIN
    CREATE TABLE [garmin].[DailyWellness] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Date] date NOT NULL,
        [Vo2MaxMlPerMinPerKg] real NULL,
        [TrainingReadinessScore] int NULL,
        [TrainingReadinessLevel] nvarchar(64) NULL,
        [BodyBatteryMin] int NULL,
        [BodyBatteryMax] int NULL,
        [AverageStressLevel] int NULL,
        [StepsCount] int NULL,
        [SyncedAt] datetime2 NOT NULL,
        [Version] int NOT NULL,
        CONSTRAINT [PK_DailyWellness] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_DailyWellness_UserId_Date] ON [garmin].[DailyWellness] ([UserId], [Date]);
END
");

            // SleepData: create only if not exists
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[garmin].[SleepData]', N'U') IS NULL
BEGIN
    CREATE TABLE [garmin].[SleepData] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Date] date NOT NULL,
        [TotalSleepSeconds] int NOT NULL,
        [DeepSleepSeconds] int NOT NULL,
        [LightSleepSeconds] int NOT NULL,
        [RemSleepSeconds] int NOT NULL,
        [AwakeSeconds] int NOT NULL,
        [SleepScore] int NULL,
        [AverageSpO2] real NULL,
        [AverageRespirationRate] real NULL,
        [SleepStartTime] datetime2 NULL,
        [SleepEndTime] datetime2 NULL,
        [SyncedAt] datetime2 NOT NULL,
        [Version] int NOT NULL,
        CONSTRAINT [PK_SleepData] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_SleepData_UserId_Date] ON [garmin].[SleepData] ([UserId], [Date]);
END
");

            // Tokens: create if not exists; if exists (old migration), alter to OAuth 1.0a schema
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[garmin].[Tokens]', N'U') IS NULL
BEGIN
    CREATE TABLE [garmin].[Tokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Token] nvarchar(2048) NOT NULL,
        [TokenSecret] nvarchar(2048) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [Version] int NOT NULL,
        CONSTRAINT [PK_Tokens] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_Tokens_UserId] ON [garmin].[Tokens] ([UserId]);
END
ELSE
BEGIN
    IF COL_LENGTH(N'garmin.Tokens', N'TokenSecret') IS NULL
        ALTER TABLE [garmin].[Tokens] ADD [TokenSecret] nvarchar(2048) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'garmin.Tokens', N'RefreshToken') IS NOT NULL
        ALTER TABLE [garmin].[Tokens] DROP COLUMN [RefreshToken];
    IF COL_LENGTH(N'garmin.Tokens', N'ExpiresAt') IS NOT NULL
        ALTER TABLE [garmin].[Tokens] DROP COLUMN [ExpiresAt];
    IF COL_LENGTH(N'garmin.Tokens', N'Scope') IS NOT NULL
        ALTER TABLE [garmin].[Tokens] DROP COLUMN [Scope];
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DailyWellness", schema: "garmin");
            migrationBuilder.DropTable(name: "SleepData", schema: "garmin");
            migrationBuilder.DropTable(name: "Tokens", schema: "garmin");
        }
    }
}
