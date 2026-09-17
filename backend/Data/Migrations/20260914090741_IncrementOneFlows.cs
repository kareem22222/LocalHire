using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class IncrementOneFlows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDiscoverable",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationSource",
                table: "JobPosts",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDiscoverable",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LocationSource",
                table: "JobPosts");
        }
    }
}
