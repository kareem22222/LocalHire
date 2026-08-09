"""Schema-level checks that back the "tables are rebuilt" guarantee."""

EXPECTED_TABLES = (
    "Users",
    "JobPosts",
    "JobApplications",
    "Notifications",
    "SavedCandidates",
    "SavedJobs",
)


class DbRepository:
    def __init__(self, db_client):
        self.__db_client = db_client
        self.tables_to_search_for = EXPECTED_TABLES

    def table_exists(self, table_name):
        return self.__db_client.scalar(
            """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        ) == 1

    def missing_tables(self):
        return [table for table in self.tables_to_search_for if not self.table_exists(table)]

    def schema_is_ready(self):
        return not self.missing_tables()

    def applied_migration_count(self):
        return int(self.__db_client.scalar(
            'SELECT COUNT(*) FROM "__EFMigrationsHistory"') or 0)

    def row_counts(self):
        return {
            table: int(self.__db_client.scalar(f'SELECT COUNT(*) FROM "{table}"') or 0)
            for table in self.tables_to_search_for
        }

    def total_row_count(self):
        return sum(self.row_counts().values())
