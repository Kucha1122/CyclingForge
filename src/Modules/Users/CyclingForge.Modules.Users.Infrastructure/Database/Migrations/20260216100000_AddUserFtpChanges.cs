using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Users.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddUserFtpChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserFtpChanges",
                schema: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FtpValue = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFtpChanges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserFtpChanges_UserId_EffectiveDate",
                schema: "users",
                table: "UserFtpChanges",
                columns: new[] { "UserId", "EffectiveDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserFtpChanges",
                schema: "users");
        }
    }
}
