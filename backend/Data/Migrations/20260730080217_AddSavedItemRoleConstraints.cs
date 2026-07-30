using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedItemRoleConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SavedCandidates_Users_EmployerId",
                table: "SavedCandidates");

            migrationBuilder.DropForeignKey(
                name: "FK_SavedCandidates_Users_WorkerId",
                table: "SavedCandidates");

            migrationBuilder.DropForeignKey(
                name: "FK_SavedJobs_Users_WorkerId",
                table: "SavedJobs");

            migrationBuilder.DropIndex(
                name: "IX_SavedCandidates_WorkerId",
                table: "SavedCandidates");

            migrationBuilder.AddColumn<string>(
                name: "WorkerRole",
                table: "SavedJobs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LookingForWork");

            migrationBuilder.AddColumn<string>(
                name: "EmployerRole",
                table: "SavedCandidates",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Hiring");

            migrationBuilder.AddColumn<string>(
                name: "WorkerRole",
                table: "SavedCandidates",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "LookingForWork");

            migrationBuilder.CreateIndex(
                name: "IX_SavedJobs_WorkerId_WorkerRole",
                table: "SavedJobs",
                columns: new[] { "WorkerId", "WorkerRole" });

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_EmployerId_EmployerRole",
                table: "SavedCandidates",
                columns: new[] { "EmployerId", "EmployerRole" });

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_WorkerId_WorkerRole",
                table: "SavedCandidates",
                columns: new[] { "WorkerId", "WorkerRole" });

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCandidates_Users_EmployerId_EmployerRole",
                table: "SavedCandidates",
                columns: new[] { "EmployerId", "EmployerRole" },
                principalTable: "Users",
                principalColumns: new[] { "Id", "Role" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCandidates_Users_WorkerId_WorkerRole",
                table: "SavedCandidates",
                columns: new[] { "WorkerId", "WorkerRole" },
                principalTable: "Users",
                principalColumns: new[] { "Id", "Role" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SavedJobs_Users_WorkerId_WorkerRole",
                table: "SavedJobs",
                columns: new[] { "WorkerId", "WorkerRole" },
                principalTable: "Users",
                principalColumns: new[] { "Id", "Role" },
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SavedCandidates_Users_EmployerId_EmployerRole",
                table: "SavedCandidates");

            migrationBuilder.DropForeignKey(
                name: "FK_SavedCandidates_Users_WorkerId_WorkerRole",
                table: "SavedCandidates");

            migrationBuilder.DropForeignKey(
                name: "FK_SavedJobs_Users_WorkerId_WorkerRole",
                table: "SavedJobs");

            migrationBuilder.DropIndex(
                name: "IX_SavedJobs_WorkerId_WorkerRole",
                table: "SavedJobs");

            migrationBuilder.DropIndex(
                name: "IX_SavedCandidates_EmployerId_EmployerRole",
                table: "SavedCandidates");

            migrationBuilder.DropIndex(
                name: "IX_SavedCandidates_WorkerId_WorkerRole",
                table: "SavedCandidates");

            migrationBuilder.DropColumn(
                name: "WorkerRole",
                table: "SavedJobs");

            migrationBuilder.DropColumn(
                name: "EmployerRole",
                table: "SavedCandidates");

            migrationBuilder.DropColumn(
                name: "WorkerRole",
                table: "SavedCandidates");

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_WorkerId",
                table: "SavedCandidates",
                column: "WorkerId");

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCandidates_Users_EmployerId",
                table: "SavedCandidates",
                column: "EmployerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCandidates_Users_WorkerId",
                table: "SavedCandidates",
                column: "WorkerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SavedJobs_Users_WorkerId",
                table: "SavedJobs",
                column: "WorkerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
