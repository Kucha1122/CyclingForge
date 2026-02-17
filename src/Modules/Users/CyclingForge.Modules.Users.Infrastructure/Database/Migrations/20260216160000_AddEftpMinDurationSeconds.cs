using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Users.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddEftpMinDurationSeconds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EftpMinDurationSeconds",
                schema: "users",
                table: "Users",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EftpMinDurationSeconds",
                schema: "users",
                table: "Users");
        }
    }
}
