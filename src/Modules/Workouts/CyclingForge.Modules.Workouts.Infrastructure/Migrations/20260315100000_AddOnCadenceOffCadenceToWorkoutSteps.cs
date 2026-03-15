using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    [DbContext(typeof(WorkoutsDbContext))]
    [Migration("20260315100000_AddOnCadenceOffCadenceToWorkoutSteps")]
    public partial class AddOnCadenceOffCadenceToWorkoutSteps : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OffCadence",
                schema: "workouts",
                table: "WorkoutSteps",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OnCadence",
                schema: "workouts",
                table: "WorkoutSteps",
                type: "int",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OffCadence",
                schema: "workouts",
                table: "WorkoutSteps");

            migrationBuilder.DropColumn(
                name: "OnCadence",
                schema: "workouts",
                table: "WorkoutSteps");
        }
    }
}
