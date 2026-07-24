using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExpandWorkerProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Credentials",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "EducationHistory",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "LanguageDetails",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "SkillDetails",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "WorkHistory",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "WorkPreferences",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "{}");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Credentials",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EducationHistory",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LanguageDetails",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SkillDetails",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WorkHistory",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WorkPreferences",
                table: "Users");
        }
    }
}
