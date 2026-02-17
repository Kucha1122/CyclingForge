using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddStravaAthleteZones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AthleteZones",
                schema: "strava",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AthleteId = table.Column<long>(type: "bigint", nullable: false),
                    HeartRateZonesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PowerZonesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AthleteZones", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteZones_UserId",
                schema: "strava",
                table: "AthleteZones",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AthleteZones",
                schema: "strava");
        }
    }
}

