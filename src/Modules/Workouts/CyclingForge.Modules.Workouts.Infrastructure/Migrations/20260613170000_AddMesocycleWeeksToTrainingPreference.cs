using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Workouts.Infrastructure.Migrations
{
    [DbContext(typeof(WorkoutsDbContext))]
    [Migration("20260613170000_AddMesocycleWeeksToTrainingPreference")]
    public partial class AddMesocycleWeeksToTrainingPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MesocycleWeeks",
                schema: "workouts",
                table: "TrainingPreferences",
                type: "int",
                nullable: false,
                defaultValue: 4);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MesocycleWeeks",
                schema: "workouts",
                table: "TrainingPreferences");
        }
    }
}
