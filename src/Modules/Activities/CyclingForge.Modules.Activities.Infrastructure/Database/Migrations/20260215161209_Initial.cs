using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "activities");

            migrationBuilder.CreateTable(
                name: "Activities",
                schema: "activities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StravaActivityId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Distance = table.Column<float>(type: "real", nullable: false),
                    MovingTime = table.Column<int>(type: "int", nullable: false),
                    ElapsedTime = table.Column<int>(type: "int", nullable: false),
                    TotalElevationGain = table.Column<float>(type: "real", nullable: false),
                    AverageSpeed = table.Column<float>(type: "real", nullable: true),
                    MaxSpeed = table.Column<float>(type: "real", nullable: true),
                    AverageHeartRate = table.Column<float>(type: "real", nullable: true),
                    MaxHeartRate = table.Column<float>(type: "real", nullable: true),
                    AveragePower = table.Column<float>(type: "real", nullable: true),
                    SyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_StravaActivityId_UserId",
                schema: "activities",
                table: "Activities",
                columns: new[] { "StravaActivityId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId",
                schema: "activities",
                table: "Activities",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activities",
                schema: "activities");
        }
    }
}
