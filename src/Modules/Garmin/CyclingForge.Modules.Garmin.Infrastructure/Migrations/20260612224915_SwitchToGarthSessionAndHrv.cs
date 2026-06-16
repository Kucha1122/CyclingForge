using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Garmin.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SwitchToGarthSessionAndHrv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TokenSecret",
                schema: "garmin",
                table: "Tokens");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                schema: "garmin",
                table: "Tokens",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2048)",
                oldMaxLength: 2048);

            migrationBuilder.CreateTable(
                name: "HrvData",
                schema: "garmin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    LastNightAvgMs = table.Column<int>(type: "int", nullable: true),
                    LastNight5MinHighMs = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    SyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrvData", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HrvData_UserId_Date",
                schema: "garmin",
                table: "HrvData",
                columns: new[] { "UserId", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HrvData",
                schema: "garmin");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                schema: "garmin",
                table: "Tokens",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "TokenSecret",
                schema: "garmin",
                table: "Tokens",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: false,
                defaultValue: "");
        }
    }
}
