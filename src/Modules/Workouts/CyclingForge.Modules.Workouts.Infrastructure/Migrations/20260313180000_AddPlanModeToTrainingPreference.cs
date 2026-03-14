using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    [DbContext(typeof(WorkoutsDbContext))]
    [Migration("20260313180000_AddPlanModeToTrainingPreference")]
    public partial class AddPlanModeToTrainingPreference : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlanMode",
                schema: "workouts",
                table: "TrainingPreferences",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "DailyRecommendations");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlanMode",
                schema: "workouts",
                table: "TrainingPreferences");
        }
    }
}
