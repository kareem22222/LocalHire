"""Client for the API's gated test-support routes.

The suite cannot rebuild the schema itself - only the API can apply the EF Core
migrations - and it cannot reach the API's in-process caches. Both are exposed by
``/api/test-support`` when the API runs with ``TestSupport__Enabled=true``.
"""

import requests

from features.utils.util import wait_until


class TestSupportUnavailableError(AssertionError):
    pass


class TestSupportClient:
    def __init__(self, base_url, timeout_seconds=180):
        self.base_url = base_url.rstrip("/") + "/"
        self.timeout_seconds = timeout_seconds
        self.__session = requests.Session()

    def wait_until_enabled(self, timeout_seconds):
        def enabled():
            response = self.__session.get(
                self.base_url + "test-support/ping", timeout=self.timeout_seconds)
            if response.status_code == 200 and "application/json" in response.headers.get(
                    "Content-Type", ""):
                return True
            if response.status_code in (404, 200):
                # 200 with HTML means the SPA fallback answered: the group is not mapped.
                return False
            return False

        try:
            wait_until(enabled, timeout_seconds, interval_seconds=2,
                       description="the API's test-support endpoints")
        except AssertionError as error:
            raise TestSupportUnavailableError(
                "The API did not expose /api/test-support. Start the stack with "
                "TestSupport__Enabled=true (docker compose does this by default) "
                f"and check {self.base_url}test-support/ping. Original error: {error}"
            ) from error

    def reset_database(self, mode):
        response = self.__session.post(
            self.base_url + "test-support/reset",
            params={"mode": mode},
            timeout=self.timeout_seconds,
        )
        if response.status_code != 200:
            raise TestSupportUnavailableError(
                f"Database reset ({mode}) failed: {response.status_code} {response.text}")
        return response.json()

    def clear_caches(self):
        response = self.__session.post(
            self.base_url + "test-support/caches/clear", timeout=self.timeout_seconds)
        if response.status_code != 204:
            raise TestSupportUnavailableError(
                f"Cache clear failed: {response.status_code} {response.text}")
