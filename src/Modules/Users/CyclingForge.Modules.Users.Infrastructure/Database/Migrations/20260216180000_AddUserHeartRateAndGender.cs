using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Users.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddUserHeartRateAndGender : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxHeartRate",
                schema: "users",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RestingHeartRate",
                schema: "users",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                schema: "users",
                table: "Users",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxHeartRate",
                schema: "users",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RestingHeartRate",
                schema: "users",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Gender",
                schema: "users",
                table: "Users");
        }
    }
}
