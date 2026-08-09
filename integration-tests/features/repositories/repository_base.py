"""Shared repository behaviour.

Every repository writes through parameter placeholders rather than string
interpolation, so seeded values (names, search terms, JSON payloads) cannot break
the statement or inject SQL.
"""


class RepositoryBase:
    #: Quoted column names, in the order ``_row`` yields values.
    columns: tuple = ()

    def __init__(self, table_name, db_client):
        self._table_name = table_name
        self._db_client = db_client

    # --- Writing ---------------------------------------------------------

    def insert(self, model):
        self.insert_many([model])

    def insert_many(self, models):
        models = list(models)
        if not models:
            return
        column_list = ", ".join(f'"{column}"' for column in self.columns)
        placeholders = ", ".join(["%s"] * len(self.columns))
        sql = f'INSERT INTO "{self._table_name}" ({column_list}) VALUES ({placeholders})'
        self._db_client.execute_many(sql, [self._row(model) for model in models])

    def delete_all(self):
        self._db_client.execute_statement(f'DELETE FROM "{self._table_name}"')

    # --- Reading ---------------------------------------------------------

    def count(self, where=None, parameters=None):
        sql = f'SELECT COUNT(*) FROM "{self._table_name}"'
        if where:
            sql += f" WHERE {where}"
        return int(self._db_client.scalar(sql, parameters) or 0)

    def is_empty(self):
        return self.count() == 0

    def get_all(self, order_by=None):
        sql = f'SELECT * FROM "{self._table_name}"'
        if order_by:
            sql += f" ORDER BY {order_by}"
        return self.select(sql)

    def get_by_id(self, row_id):
        rows = self.select(f'SELECT * FROM "{self._table_name}" WHERE "Id" = %s', (row_id,))
        return rows[0] if rows else None

    def select(self, sql, parameters=None):
        """Run a query and return rows as dictionaries keyed by column name."""
        return self._db_client.select_dicts(sql, parameters)

    def column_value(self, row_id, column):
        return self._db_client.scalar(
            f'SELECT "{column}" FROM "{self._table_name}" WHERE "Id" = %s', (row_id,))

    def update_column(self, row_id, column, value):
        self._db_client.execute_statement(
            f'UPDATE "{self._table_name}" SET "{column}" = %s WHERE "Id" = %s',
            (value, row_id))

    # --- To implement in subclasses --------------------------------------

    def _row(self, model):
        raise NotImplementedError
