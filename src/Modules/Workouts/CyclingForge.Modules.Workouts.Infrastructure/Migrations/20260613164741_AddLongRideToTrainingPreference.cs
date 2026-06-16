using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLongRideToTrainingPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LongRideDay",
                schema: "workouts",
                table: "TrainingPreferences",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxLongRideMinutes",
                schema: "workouts",
                table: "TrainingPreferences",
                type: "int",
                nullable: false,
                defaultValue: 180);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LongRideDay",
                schema: "workouts",
                table: "TrainingPreferences");

            migrationBuilder.DropColumn(
                name: "MaxLongRideMinutes",
                schema: "workouts",
                table: "TrainingPreferences");
        }
    }
}
