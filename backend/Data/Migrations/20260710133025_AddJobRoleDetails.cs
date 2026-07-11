using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobRoleDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Benefits",
                table: "JobPosts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmploymentType",
                table: "JobPosts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExperienceMaxYears",
                table: "JobPosts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExperienceMinYears",
                table: "JobPosts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Languages",
                table: "JobPosts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MinEducation",
                table: "JobPosts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Openings",
                table: "JobPosts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredSkills",
                table: "JobPosts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "SalaryMax",
                table: "JobPosts",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SalaryMin",
                table: "JobPosts",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalaryPeriod",
                table: "JobPosts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ShiftEndTime",
                table: "JobPosts",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ShiftStartTime",
                table: "JobPosts",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkingDays",
                table: "JobPosts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Benefits",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "EmploymentType",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "ExperienceMaxYears",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "ExperienceMinYears",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "Languages",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "MinEducation",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "Openings",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "RequiredSkills",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "SalaryMax",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "SalaryMin",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "SalaryPeriod",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "ShiftEndTime",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "ShiftStartTime",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "WorkingDays",
                table: "JobPosts");
        }
    }
}
