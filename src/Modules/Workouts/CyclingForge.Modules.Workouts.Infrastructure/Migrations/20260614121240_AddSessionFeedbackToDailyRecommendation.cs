using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionFeedbackToDailyRecommendation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FeedbackAt",
                schema: "workouts",
                table: "DailyRecommendations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeedbackNote",
                schema: "workouts",
                table: "DailyRecommendations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LegsFeel",
                schema: "workouts",
                table: "DailyRecommendations",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Rpe",
                schema: "workouts",
                table: "DailyRecommendations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SessionQuality",
                schema: "workouts",
                table: "DailyRecommendations",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeedbackAt",
                schema: "workouts",
                table: "DailyRecommendations");

            migrationBuilder.DropColumn(
                name: "FeedbackNote",
                schema: "workouts",
                table: "DailyRecommendations");

            migrationBuilder.DropColumn(
                name: "LegsFeel",
                schema: "workouts",
                table: "DailyRecommendations");

            migrationBuilder.DropColumn(
                name: "Rpe",
                schema: "workouts",
                table: "DailyRecommendations");

            migrationBuilder.DropColumn(
                name: "SessionQuality",
                schema: "workouts",
                table: "DailyRecommendations");
        }
    }
}
