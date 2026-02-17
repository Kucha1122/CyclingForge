using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddBest5MinPowerAndBest60MinPower : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "Best5MinPower",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "Best60MinPower",
                schema: "activities",
                table: "Activities",
                type: "real",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Best5MinPower",
                schema: "activities",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "Best60MinPower",
                schema: "activities",
                table: "Activities");
        }
    }
}
