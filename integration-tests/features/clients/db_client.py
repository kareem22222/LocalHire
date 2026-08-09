"""Thin PostgreSQL client used by the repositories.

Talks to the ``database`` container over the port docker compose publishes
(5433 by default), so the suite runs unchanged from Windows, WSL, or a Linux
CI runner. pg8000 is pure Python: no libpq, no compiler.
"""

from dataclasses import dataclass

import pg8000.dbapi

from features.utils.util import wait_until


@dataclass(frozen=True)
class DbConfig:
    host: str
    port: int
    username: str
    password: str
    db_name: str


class DbClient:
    def __init__(self, db_config: DbConfig):
        self.__db_config = db_config
        self.__connection = None

    def get_db_config(self) -> DbConfig:
        return self.__db_config

    def wait_until_available(self, timeout_seconds):
        wait_until(
            lambda: self.execute_statement("SELECT 1") == [[1]],
            timeout_seconds,
            description=(
                f"PostgreSQL at {self.__db_config.host}:{self.__db_config.port}"
                f"/{self.__db_config.db_name}"
            ),
        )

    def execute_statement(self, sql, parameters=None):
        """Run one statement and return the rows as a list of lists.

        Returns ``[]`` for statements that produce no result set.
        """
        connection = self.__ensure_connection()
        cursor = connection.cursor()
        try:
            cursor.execute(sql, parameters or ())
            rows = [] if cursor.description is None else [list(row) for row in cursor.fetchall()]
            connection.commit()
            return rows
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()

    def execute_many(self, sql, parameter_sets):
        """Insert/update many rows in one transaction."""
        parameter_sets = list(parameter_sets)
        if not parameter_sets:
            return
        connection = self.__ensure_connection()
        cursor = connection.cursor()
        try:
            cursor.executemany(sql, parameter_sets)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()

    def scalar(self, sql, parameters=None):
        rows = self.execute_statement(sql, parameters)
        return rows[0][0] if rows else None

    def select_dicts(self, sql, parameters=None):
        """Run a query and return each row as a dict keyed by column name."""
        connection = self.__ensure_connection()
        cursor = connection.cursor()
        try:
            cursor.execute(sql, parameters or ())
            column_names = [column[0] for column in (cursor.description or [])]
            rows = [dict(zip(column_names, row)) for row in cursor.fetchall()]
            connection.commit()
            return rows
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()

    def close(self):
        if self.__connection is not None:
            try:
                self.__connection.close()
            finally:
                self.__connection = None

    def reconnect(self):
        """Drop the pooled connection. Used after the schema is rebuilt."""
        self.close()
        self.__ensure_connection()

    def __ensure_connection(self):
        if self.__connection is None:
            self.__connection = pg8000.dbapi.connect(
                host=self.__db_config.host,
                port=self.__db_config.port,
                user=self.__db_config.username,
                password=self.__db_config.password,
                database=self.__db_config.db_name,
                timeout=30,
            )
            self.__connection.autocommit = False
        return self.__connection
