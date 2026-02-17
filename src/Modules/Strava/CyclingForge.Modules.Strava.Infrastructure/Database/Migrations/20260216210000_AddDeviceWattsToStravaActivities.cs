using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceWattsToStravaActivities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DeviceWatts",
                schema: "strava",
                table: "Activities",
                type: "bit",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeviceWatts",
                schema: "strava",
                table: "Activities");
        }
    }
}
