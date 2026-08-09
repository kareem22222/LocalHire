"""HTTP client for the LocalHire API.

Keeps the last request and response on the instance so ``then`` steps can assert
against them without the ``when`` step having to hand anything over, which is the
pattern the rest of the suite is built around.
"""

import json as json_module
from urllib.parse import urlencode

import re

import requests

from features.utils.util import wait_until

TRACE_BODY_LIMIT = 400
#: Keep bearer tokens out of a trace that may be pasted into an issue or CI log.
SECRET_PATTERN = re.compile(r'("(?:token|password)"\s*:\s*")[^"]*(")')


def _shorten(text, limit=TRACE_BODY_LIMIT):
    """One-line, console-safe, secret-free excerpt of a request or response body."""
    if not text:
        return "(empty)"
    collapsed = " ".join(str(text).split())
    redacted = SECRET_PATTERN.sub(r"\1<redacted>\2", collapsed)
    excerpt = redacted[:limit] + ("..." if len(redacted) > limit else "")
    return excerpt.encode("ascii", "backslashreplace").decode("ascii")


class ApiClient:
    def __init__(self, base_url, timeout_seconds=60, trace=False):
        self.base_url = base_url.rstrip("/") + "/"
        self.timeout_seconds = timeout_seconds
        self.trace = trace
        self.session = requests.Session()
        self.response = None
        self.last_request = None

    # --- URL handling ----------------------------------------------------

    def build_url(self, path, query_parameters=None):
        """Join ``path`` onto the API base url and append a query string.

        ``path`` may be given with or without a leading slash, and may already be
        absolute (used for presigned S3 download links).
        """
        if path.startswith("http://") or path.startswith("https://"):
            url = path
        else:
            url = self.base_url + path.lstrip("/")

        if query_parameters:
            filtered = {
                key: value
                for key, value in query_parameters.items()
                if value is not None
            }
            if filtered:
                separator = "&" if "?" in url else "?"
                url = f"{url}{separator}{urlencode(filtered)}"
        return url

    # --- Verbs -----------------------------------------------------------

    def do_get_request(self, path, headers=None, query_parameters=None):
        return self.__send("GET", path, headers=headers, query_parameters=query_parameters)

    def do_post_request(self, path, headers=None, body=None, query_parameters=None, files=None):
        return self.__send(
            "POST", path, headers=headers, body=body,
            query_parameters=query_parameters, files=files)

    def do_put_request(self, path, headers=None, body=None, query_parameters=None, files=None):
        return self.__send(
            "PUT", path, headers=headers, body=body,
            query_parameters=query_parameters, files=files)

    def do_delete_request(self, path, headers=None, query_parameters=None):
        return self.__send("DELETE", path, headers=headers, query_parameters=query_parameters)

    def do_patch_request(self, path, headers=None, body=None, query_parameters=None):
        return self.__send("PATCH", path, headers=headers, body=body,
                           query_parameters=query_parameters)

    # --- Readiness -------------------------------------------------------

    def wait_until_healthy(self, timeout_seconds):
        def healthy():
            response = self.session.get(
                self.build_url("health"), timeout=self.timeout_seconds)
            return response.status_code == 200

        wait_until(healthy, timeout_seconds, interval_seconds=2,
                   description=f"the API at {self.base_url}")

    # --- Response helpers ------------------------------------------------

    @property
    def status_code(self):
        return None if self.response is None else self.response.status_code

    def json_body(self):
        """Parsed JSON body, or ``None`` when the body is empty or not JSON."""
        if self.response is None or not self.response.content:
            return None
        try:
            return self.response.json()
        except ValueError:
            return None

    def describe_last_call(self):
        if self.last_request is None:
            return "no request has been sent yet"
        method, url = self.last_request
        body = "" if self.response is None else self.response.text[:2000]
        return f"{method} {url} -> {self.status_code} {body}"

    # --- Internals -------------------------------------------------------

    def __send(self, method, path, headers=None, body=None, query_parameters=None, files=None):
        url = self.build_url(path, query_parameters)
        request_headers = dict(headers or {})
        data = None

        if files is None and body is not None:
            request_headers.setdefault("Content-Type", "application/json")
            data = json_module.dumps(body)

        self.response = self.session.request(
            method,
            url,
            headers=request_headers,
            data=data,
            files=files,
            timeout=self.timeout_seconds,
        )
        self.last_request = (method, url)
        if self.trace:
            self.__trace(method, url, request_headers, data, files)
        return self.response

    def __trace(self, method, url, headers, data, files):
        """Print the call so a run can be followed live (``-D verbose_http=true``)."""
        actor = "anonymous"
        if "Authorization" in headers:
            actor = "bearer " + headers["Authorization"].split(" ")[-1][-8:]
        print(f"    -> {method} {url}  [{actor}]")
        if data:
            print(f"       body {_shorten(data)}")
        if files:
            print(f"       files {list(files)}")
        print(f"    <- {self.response.status_code} {_shorten(self.response.text)}")
