using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "workouts");

            migrationBuilder.CreateTable(
                name: "TrainingPreferences",
                schema: "workouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Goal = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DaysPerWeek = table.Column<int>(type: "int", nullable: false),
                    WeeklyHoursAvailable = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    PlanDurationWeeks = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TargetEventDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PreferredWorkoutMinutes = table.Column<int>(type: "int", nullable: false),
                    ConsiderNonCycling = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingPreferences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Workouts",
                schema: "workouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DurationMinutes = table.Column<int>(type: "int", nullable: false),
                    EstimatedTSS = table.Column<int>(type: "int", nullable: false),
                    TargetZone = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    Tags = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workouts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyRecommendations",
                schema: "workouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    RecommendedWorkoutId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AlternativeWorkoutId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReadinessScore = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CompletedActivityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyRecommendations_Workouts_AlternativeWorkoutId",
                        column: x => x.AlternativeWorkoutId,
                        principalSchema: "workouts",
                        principalTable: "Workouts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DailyRecommendations_Workouts_RecommendedWorkoutId",
                        column: x => x.RecommendedWorkoutId,
                        principalSchema: "workouts",
                        principalTable: "Workouts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WorkoutSteps",
                schema: "workouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkoutId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    PowerLow = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    PowerHigh = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    Cadence = table.Column<int>(type: "int", nullable: true),
                    Repeat = table.Column<int>(type: "int", nullable: true),
                    OnDurationSeconds = table.Column<int>(type: "int", nullable: true),
                    OffDurationSeconds = table.Column<int>(type: "int", nullable: true),
                    OnPower = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: true),
                    OffPower = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutSteps_Workouts_WorkoutId",
                        column: x => x.WorkoutId,
                        principalSchema: "workouts",
                        principalTable: "Workouts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyRecommendations_AlternativeWorkoutId",
                schema: "workouts",
                table: "DailyRecommendations",
                column: "AlternativeWorkoutId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyRecommendations_RecommendedWorkoutId",
                schema: "workouts",
                table: "DailyRecommendations",
                column: "RecommendedWorkoutId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyRecommendations_UserId_Date",
                schema: "workouts",
                table: "DailyRecommendations",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrainingPreferences_UserId_IsActive",
                schema: "workouts",
                table: "TrainingPreferences",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Workouts_Category",
                schema: "workouts",
                table: "Workouts",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Workouts_Category_DurationMinutes",
                schema: "workouts",
                table: "Workouts",
                columns: new[] { "Category", "DurationMinutes" });

            migrationBuilder.CreateIndex(
                name: "IX_Workouts_UserId",
                schema: "workouts",
                table: "Workouts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSteps_WorkoutId_Order",
                schema: "workouts",
                table: "WorkoutSteps",
                columns: new[] { "WorkoutId", "Order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyRecommendations",
                schema: "workouts");

            migrationBuilder.DropTable(
                name: "TrainingPreferences",
                schema: "workouts");

            migrationBuilder.DropTable(
                name: "WorkoutSteps",
                schema: "workouts");

            migrationBuilder.DropTable(
                name: "Workouts",
                schema: "workouts");
        }
    }
}
