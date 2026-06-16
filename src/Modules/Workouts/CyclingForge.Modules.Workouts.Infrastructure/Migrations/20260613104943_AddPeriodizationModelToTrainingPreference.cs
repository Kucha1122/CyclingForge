using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPeriodizationModelToTrainingPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PeriodizationModel",
                schema: "workouts",
                table: "TrainingPreferences",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Auto");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PeriodizationModel",
                schema: "workouts",
                table: "TrainingPreferences");
        }
    }
}
