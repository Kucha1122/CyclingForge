using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "IntensityFactor",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "MaxPower",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "NormalizedPower",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "TrainingStressScore",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IntensityFactor",
                schema: "activities",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "MaxPower",
                schema: "activities",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "NormalizedPower",
                schema: "activities",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "TrainingStressScore",
                schema: "activities",
                table: "Activities");
        }
    }
}
