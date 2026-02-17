using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddEstimatedFtpFromActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EstimatedFtpFromActivity",
                schema: "activities",
                table: "Activities",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedFtpFromActivity",
                schema: "activities",
                table: "Activities");
        }
    }
}
