using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Strava.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivitySyncFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActivitySyncFilters",
                schema: "strava",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExcludedDevicePattern = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivitySyncFilters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivitySyncFilters_UserId",
                schema: "strava",
                table: "ActivitySyncFilters",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivitySyncFilters",
                schema: "strava");
        }
    }
}
