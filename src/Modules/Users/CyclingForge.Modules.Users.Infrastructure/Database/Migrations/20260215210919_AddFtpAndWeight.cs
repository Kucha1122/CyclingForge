using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Users.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddFtpAndWeight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FunctionalThresholdPower",
                schema: "users",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightKg",
                schema: "users",
                table: "Users",
                type: "decimal(5,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FunctionalThresholdPower",
                schema: "users",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                schema: "users",
                table: "Users");
        }
    }
}
