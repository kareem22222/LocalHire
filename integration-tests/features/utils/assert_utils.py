"""Assertion helpers.

Every failure message includes the request that was sent and the body that came
back, so a red scenario says what happened without a re-run.
"""

import json


def printable(value):
    """Strip characters a legacy console cannot encode.

    Validation messages come back with typographic quotes, which crash a cp1252
    Windows console mid-report. Escaping them keeps the failure readable
    everywhere.
    """
    return str(value).encode("ascii", "backslashreplace").decode("ascii")


def fail(context, message):
    raise AssertionError(printable(
        f"{message}\nLast call: {context.api_client.describe_last_call()}"))


def assert_status(context, expected):
    actual = context.response.status_code
    if actual != expected:
        fail(context, f"Expected status {expected} but got {actual}.")


def body_of(context):
    if context.response_body is None:
        fail(context, "Expected a JSON body but the response had none.")
    return context.response_body


def get_path(payload, path):
    """Read a dotted path such as ``items.0.status`` out of a parsed body."""
    current = payload
    for part in path.split("."):
        if isinstance(current, list):
            index = int(part)
            if index >= len(current):
                raise AssertionError(
                    f"Index {index} is out of range for a list of {len(current)} items.")
            current = current[index]
        elif isinstance(current, dict):
            if part not in current:
                raise AssertionError(
                    f"Field '{part}' is missing. Available: {sorted(current)}")
            current = current[part]
        else:
            raise AssertionError(f"Cannot read '{part}' from {current!r}.")
    return current


def assert_field(context, path, expected):
    actual = get_path(body_of(context), path)
    if not values_match(actual, expected):
        fail(context, f"Expected '{path}' to be {expected!r} but it was {actual!r}.")


def values_match(actual, expected):
    """Compare loosely so feature files can stay readable.

    ``*`` matches anything present, and numbers/booleans written as text in a
    feature file still compare equal to their JSON counterparts.
    """
    if expected == "*":
        return actual is not None
    if isinstance(expected, str):
        if expected.lower() in ("null", "none"):
            return actual is None
        if expected.lower() == "true":
            return actual is True
        if expected.lower() == "false":
            return actual is False
        if isinstance(actual, bool):
            return str(actual).lower() == expected.lower()
        if isinstance(actual, (int, float)) and not isinstance(actual, bool):
            try:
                return float(actual) == float(expected)
            except ValueError:
                return False
        if isinstance(actual, list):
            return json.loads(expected) == actual if expected.strip().startswith("[") \
                else str(actual) == expected
        return str(actual) == expected
    return actual == expected


def assert_length(context, path, expected):
    value = body_of(context) if path in ("", ".") else get_path(body_of(context), path)
    if not isinstance(value, list):
        fail(context, f"Expected '{path}' to be a list but it was {type(value).__name__}.")
    if len(value) != expected:
        fail(context, f"Expected '{path}' to hold {expected} items but it held {len(value)}.")
    return value


def assert_every_item(context, path, field, expected):
    items = get_path(body_of(context), path)
    if not items:
        fail(context, f"'{path}' is empty, so a claim about every item proves nothing. "
                      "Assert the count instead.")
    for index, item in enumerate(items):
        actual = item.get(field)
        if not values_match(actual, expected):
            fail(context, f"Item {index} has {field}={actual!r}, expected {expected!r}.")


def assert_contains_id(context, path, expected_id, present=True):
    items = get_path(body_of(context), path)
    ids = [item["id"] if isinstance(item, dict) else item for item in items]
    if present and expected_id not in ids:
        fail(context, f"Expected {expected_id} in {ids}.")
    if not present and expected_id in ids:
        fail(context, f"Did not expect {expected_id} in {ids}.")


def assert_validation_error_for(context, field):
    payload = body_of(context)
    errors = payload.get("errors") or {}
    matches = [key for key in errors if key.lower() == field.lower()]
    if not matches:
        fail(context, f"Expected a validation error for '{field}'. Got: {sorted(errors)}")


def assert_error_message_contains(context, fragment):
    payload = body_of(context)
    message = payload.get("error") or payload.get("message") or payload.get("title") or ""
    if fragment.lower() not in str(message).lower():
        fail(context, f"Expected the error message to contain '{fragment}' but it was '{message}'.")
