using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class BackfillDeviceWattsForActivitiesWithPower : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Set DeviceWatts = false (0) for activities that have power data but DeviceWatts was never set (null).
            // Those are treated as estimated power so PMC uses HRSS; backfill ensures all such rows are consistent.
            migrationBuilder.Sql(@"
                UPDATE [activities].[Activities]
                SET DeviceWatts = 0
                WHERE (NormalizedPower IS NOT NULL OR AveragePower IS NOT NULL)
                  AND DeviceWatts IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: we do not revert back to NULL (would be incorrect for PMC logic).
        }
    }
}
