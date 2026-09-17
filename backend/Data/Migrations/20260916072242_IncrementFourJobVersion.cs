using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocalHire.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class IncrementFourJobVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "JobPosts",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Version",
                table: "JobPosts");
        }
    }
}
