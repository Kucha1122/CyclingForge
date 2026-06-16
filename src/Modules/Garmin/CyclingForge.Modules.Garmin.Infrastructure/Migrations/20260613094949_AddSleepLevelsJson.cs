using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Garmin.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSleepLevelsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SleepLevelsJson",
                schema: "garmin",
                table: "SleepData",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SleepLevelsJson",
                schema: "garmin",
                table: "SleepData");
        }
    }
}
