using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Migrations
{
    /// <inheritdoc />
    public partial class RoleSeparatedJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old single-column email index; replace with (Email, Role) composite
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            // Add location columns (nullable, existing users keep working)
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Users",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Users",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LocationUpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_Location_CompleteAndValid",
                table: "Users",
                sql: @"(""Latitude"" IS NULL AND ""Longitude"" IS NULL) OR (""Latitude"" BETWEEN -90.0 AND 90.0 AND ""Longitude"" BETWEEN -180.0 AND 180.0)");

            // New composite unique index — same email allowed once per role
            migrationBuilder.CreateIndex(
                name: "IX_Users_Email_Role",
                table: "Users",
                columns: new[] { "Email", "Role" },
                unique: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Users_Id_Role",
                table: "Users",
                columns: new[] { "Id", "Role" });

            // ---------- JobPosts ----------
            migrationBuilder.CreateTable(
                name: "JobPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployerId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployerRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Hiring"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    WorkplaceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CityArea = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPosts", x => x.Id);
                    table.CheckConstraint("CK_JobPosts_Location_CompleteAndValid", @"(""Latitude"" IS NULL AND ""Longitude"" IS NULL) OR (""Latitude"" BETWEEN -90.0 AND 90.0 AND ""Longitude"" BETWEEN -180.0 AND 180.0)");
                    table.ForeignKey(
                        name: "FK_JobPosts_Users_EmployerId",
                        columns: x => new { x.EmployerId, x.EmployerRole },
                        principalTable: "Users",
                        principalColumns: new[] { "Id", "Role" },
                        onDelete: ReferentialAction.Cascade);
                });

            // ---------- JobApplications ----------
            migrationBuilder.CreateTable(
                name: "JobApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobPostId = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkerId = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkerRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "LookingForWork"),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobApplications_JobPosts_JobPostId",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobApplications_Users_WorkerId",
                        columns: x => new { x.WorkerId, x.WorkerRole },
                        principalTable: "Users",
                        principalColumns: new[] { "Id", "Role" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_EmployerId_EmployerRole",
                table: "JobPosts",
                columns: new[] { "EmployerId", "EmployerRole" });

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_JobPostId_WorkerId",
                table: "JobApplications",
                columns: new[] { "JobPostId", "WorkerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_WorkerId_WorkerRole",
                table: "JobApplications",
                columns: new[] { "WorkerId", "WorkerRole" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM "Users"
                        GROUP BY "Email"
                        HAVING COUNT(*) > 1
                    ) THEN
                        RAISE EXCEPTION 'RoleSeparatedJobs cannot be rolled back while duplicate user emails exist across roles.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropTable(
                name: "JobApplications");

            migrationBuilder.DropTable(
                name: "JobPosts");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Users_Id_Role",
                table: "Users");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_Location_CompleteAndValid",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email_Role",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LocationUpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }
    }
}
