"""Rebuilds the database and reseeds the mock data before every ``@db`` scenario.

``reset_mode=recreate`` (the default) drops the ``public`` schema and re-runs
every EF Core migration through the API, so the tables really are created from
scratch each time. ``reset_mode=truncate`` empties them instead, which gives the
same isolation in a fraction of the time.

The API's in-process caches are cleared after the reset and after the reseed:
job queries and profiles are cached for minutes, so without this a scenario could
read rows that no longer exist.
"""

from features.layers.behave_layer import TaggedLayer


class DbLayer(TaggedLayer):
    def __init__(self):
        super().__init__("db")

    def _setup(self, context):
        context.test_support_client.reset_database(context.reset_mode)
        if context.reset_mode == "recreate":
            # The dropped schema takes the session's view of it along, so start
            # a fresh connection before seeding.
            context.db_client.reconnect()
        context.test_data_manager.initialize_test_data()
        context.test_support_client.clear_caches()
        context.aliases = {}

    def _cleanup(self, context, scenario):
        # Nothing to undo: the next scenario rebuilds from scratch, and leaving
        # the rows in place makes a failure easy to inspect in psql.
        pass
