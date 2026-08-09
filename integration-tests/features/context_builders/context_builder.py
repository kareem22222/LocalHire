"""Interface for assembling the objects a run needs onto the behave context.

Only a local (docker compose) builder exists today. Keeping the seam means a
deployed-environment builder can be added later without touching the layers.
"""


class ContextBuilder:
    def __init__(self, context):
        self._context = context

    def add_api_client(self):
        pass

    def add_test_support_client(self):
        pass

    def add_repositories(self):
        pass

    def add_s3_client(self):
        pass
