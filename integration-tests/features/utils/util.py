"""Small helpers shared by the whole suite: settings resolution, polling, and
value coercion."""

import os
import time
import uuid
from datetime import date, datetime, timezone

ENV_PREFIX = "LOCALHIRE_"


def get_setting(context, key, default=None):
    """Resolve a configuration value.

    Precedence: ``-D key=value`` on the command line, then the environment
    variable ``LOCALHIRE_<KEY>``, then ``behave.ini``, then ``default``. behave
    merges ``-D`` values into ``userdata`` on top of the ini file, so the only
    extra work here is the environment override, which is what CI uses.
    """
    env_value = os.environ.get(ENV_PREFIX + key.upper())
    if env_value not in (None, ""):
        return env_value

    value = context.config.userdata.get(key, default)
    return default if value in (None, "") else value


def get_int_setting(context, key, default):
    return int(get_setting(context, key, default))


def get_env_var(name):
    value = os.environ.get(name)
    return value or None


def utc_now():
    return datetime.now(timezone.utc)


def convert_to_iso_format_if_datetime(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def new_id():
    return str(uuid.uuid4())


def deterministic_id(prefix, index):
    """Build a stable, readable UUID such as ``d0000000-0000-4000-8000-000000000007``.

    Fixed ids keep failures easy to read and let a token minted once per run
    keep working after the schema is rebuilt, because the same user id is seeded
    again.
    """
    return f"{prefix}-0000-4000-8000-{index:012d}"


def wait_until(predicate, timeout_seconds, interval_seconds=0.5, description=""):
    """Poll ``predicate`` until it returns a truthy value or the timeout passes."""
    deadline = time.time() + timeout_seconds
    last_error = None
    while time.time() < deadline:
        try:
            result = predicate()
            if result:
                return result
            last_error = None
        except Exception as error:  # noqa: BLE001 - the point is to keep retrying
            last_error = error
        time.sleep(interval_seconds)

    message = f"Timed out after {timeout_seconds}s waiting for {description or 'condition'}."
    if last_error is not None:
        message = f"{message} Last error: {last_error!r}"
    raise AssertionError(message)


def as_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def parse_optional(value):
    """Turn Gherkin placeholders for "nothing" into ``None``."""
    if value is None:
        return None
    text = str(value).strip()
    if text in ("", "none", "None", "null", "no", "-"):
        return None
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ("'", '"'):
        return text[1:-1]
    return text
