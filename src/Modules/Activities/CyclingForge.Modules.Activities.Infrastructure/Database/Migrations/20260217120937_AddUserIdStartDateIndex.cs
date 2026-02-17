using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdStartDateIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId_StartDate",
                schema: "activities",
                table: "Activities",
                columns: new[] { "UserId", "StartDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Activities_UserId_StartDate",
                schema: "activities",
                table: "Activities");
        }
    }
}
