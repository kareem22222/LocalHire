"""Then steps: assert on the HTTP response, on PostgreSQL, and on LocalStack.

Response assertions prove the contract; the database and S3 assertions prove the
side effect really happened rather than being echoed back by the API.
"""

import json

from behave import then

from features.utils.assert_utils import (
    assert_contains_id,
    assert_error_message_contains,
    assert_every_item,
    assert_field,
    assert_length,
    assert_status,
    assert_validation_error_for,
    body_of,
    fail,
    get_path,
    values_match,
)
from features.utils.resolvers import resolve_job_id, resolve_user_id, resolve_worker_id

TABLES = {
    "Users": "user_repository",
    "JobPosts": "job_post_repository",
    "JobApplications": "job_application_repository",
    "Notifications": "notification_repository",
    "SavedCandidates": "saved_candidate_repository",
    "SavedJobs": "saved_job_repository",
}


def _repository(context, table):
    assert table in TABLES, f"Unknown table '{table}'. Known: {sorted(TABLES)}"
    return getattr(context, TABLES[table])


# --- Response ------------------------------------------------------------

@then('the response status code is {status:d}')
def step_status_code(context, status):
    assert_status(context, status)


@then('the response body is empty')
def step_empty_body(context):
    if context.response.content:
        fail(context, f"Expected an empty body but got: {context.response.text[:500]}")


@then('the response is the single-page app shell rather than API data')
def step_spa_fallback(context):
    """Unmapped paths under /api fall through to ``MapFallbackToFile``.

    Asserting it explicitly keeps the behaviour visible: the route carries no
    data, so nothing leaks, but it is HTML rather than a JSON 404.
    """
    assert_status(context, 200)
    content_type = context.response.headers.get("Content-Type", "")
    if "text/html" not in content_type:
        fail(context, f"Expected the SPA document but the content type was '{content_type}'.")


@then('the response field "{path}" is "{expected}"')
def step_field_is(context, path, expected):
    assert_field(context, path, expected)


@then('the response field "{path}" is the id of job "{job_alias}"')
def step_field_is_job_id(context, path, job_alias):
    assert_field(context, path, resolve_job_id(context, job_alias))


@then('the response field "{path}" is the id of worker {worker_alias}')
def step_field_is_worker_id(context, path, worker_alias):
    assert_field(context, path, resolve_worker_id(context, worker_alias))


@then('the response field "{path}" is present')
def step_field_present(context, path):
    assert_field(context, path, "*")


@then('the response field "{path}" is null')
def step_field_null(context, path):
    assert_field(context, path, None)


@then('the response list "{path}" has {count:d} items')
def step_list_length(context, path, count):
    assert_length(context, path, count)


@then('the response list has {count:d} items')
def step_root_list_length(context, count):
    body = body_of(context)
    if not isinstance(body, list):
        fail(context, "Expected the response body to be a list.")
    if len(body) != count:
        fail(context, f"Expected {count} items but got {len(body)}.")


def _root_ids(context):
    """Ids from a root-level list, which may hold objects or bare ids."""
    return [item["id"] if isinstance(item, dict) else item for item in body_of(context)]


@then('the response list does not contain the id of job "{job_alias}"')
def step_root_list_excludes_job(context, job_alias):
    job_id = resolve_job_id(context, job_alias)
    ids = _root_ids(context)
    if job_id in ids:
        fail(context, f"Did not expect job {job_alias} ({job_id}) in {ids}.")


@then('the response list contains the id of job "{job_alias}"')
def step_root_list_contains_job(context, job_alias):
    job_id = resolve_job_id(context, job_alias)
    ids = _root_ids(context)
    if job_id not in ids:
        fail(context, f"Expected job {job_alias} ({job_id}) in {ids}.")


@then('the response list contains the id of worker {worker_alias}')
def step_root_list_contains_worker(context, worker_alias):
    worker_id = resolve_worker_id(context, worker_alias)
    ids = _root_ids(context)
    if worker_id not in ids:
        fail(context, f"Expected worker {worker_alias} ({worker_id}) in {ids}.")


@then('every application status in the response is a known status')
def step_known_statuses(context):
    known = {"Applied", "Shortlisted", "Rejected", "Hired"}
    body = body_of(context)
    items = body if isinstance(body, list) else get_path(body, "items")
    for index, item in enumerate(items):
        if item.get("status") not in known:
            fail(context, f"Item {index} has an unknown status {item.get('status')!r}.")


@then('the newest application on job "{job_alias}" has status {status}')
def step_newest_application_status(context, job_alias, status):
    applications = context.job_application_repository.for_job(
        resolve_job_id(context, job_alias))
    assert applications, f"Job {job_alias} has no applications."
    actual = applications[0]["Status"]
    assert actual == status, f"Expected status {status} but the row says {actual}."


@then('every item in the response list has {field} equal to "{expected}"')
def step_every_root_item(context, field, expected):
    body = body_of(context)
    if not isinstance(body, list):
        fail(context, "Expected the response body to be a list.")
    if not body:
        fail(context, "The response list is empty, so a claim about every item proves "
                      "nothing. Assert the length instead.")
    for index, item in enumerate(body):
        if not values_match(item.get(field), expected):
            fail(context, f"Item {index} has {field}={item.get(field)!r}, "
                          f"expected {expected!r}.")


@then('every item in "{path}" has {field} equal to "{expected}"')
def step_every_item(context, path, field, expected):
    assert_every_item(context, path, field, expected)


@then('the response list "{path}" contains the id of job "{job_alias}"')
def step_list_contains_job(context, path, job_alias):
    assert_contains_id(context, path, resolve_job_id(context, job_alias))


@then('the response list "{path}" does not contain the id of job "{job_alias}"')
def step_list_excludes_job(context, path, job_alias):
    assert_contains_id(context, path, resolve_job_id(context, job_alias), present=False)


@then('the response list "{path}" contains the id of worker {worker_alias}')
def step_list_contains_worker(context, path, worker_alias):
    assert_contains_id(context, path, resolve_worker_id(context, worker_alias))


@then('the response list "{path}" does not contain the id of worker {worker_alias}')
def step_list_excludes_worker(context, path, worker_alias):
    assert_contains_id(context, path, resolve_worker_id(context, worker_alias),
                       present=False)


@then('the response body contains the error "{fragment}"')
def step_error_message(context, fragment):
    assert_error_message_contains(context, fragment)


@then('the response reports a validation error for "{field}"')
def step_validation_error(context, field):
    assert_validation_error_for(context, field)


@then('the response reports validation errors for')
def step_validation_errors(context):
    for row in context.table:
        assert_validation_error_for(context, row["field"])


@then('the response matches')
def step_response_matches(context):
    """Compare the body against an inline JSON document.

    Only the fields present in the document are checked, and ``"*"`` matches any
    value, so a scenario asserts what it cares about and nothing else.
    """
    expected = json.loads(context.text)
    _assert_subset(context, body_of(context), expected, "")


def _assert_subset(context, actual, expected, path):
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            fail(context, f"Expected an object at '{path or 'body'}' but got {actual!r}.")
        for key, value in expected.items():
            if key not in actual:
                fail(context, f"Field '{path}{key}' is missing. Available: {sorted(actual)}")
            _assert_subset(context, actual[key], value, f"{path}{key}.")
    elif isinstance(expected, list):
        if not isinstance(actual, list):
            fail(context, f"Expected a list at '{path}' but got {actual!r}.")
        if len(actual) < len(expected):
            fail(context, f"Expected at least {len(expected)} items at '{path}' "
                          f"but got {len(actual)}.")
        for index, value in enumerate(expected):
            _assert_subset(context, actual[index], value, f"{path}{index}.")
    elif not values_match(actual, expected):
        fail(context, f"Expected '{path.rstrip('.')}' to be {expected!r} but it was {actual!r}.")


@then('the items in "{path}" are ordered by "{field}" descending')
def step_ordered_descending(context, path, field):
    values = [item[field] for item in get_path(body_of(context), path)]
    if values != sorted(values, reverse=True):
        fail(context, f"'{path}' is not ordered by {field} descending: {values}")


@then('the ids in "{path}" do not overlap with the previous page')
def step_pages_disjoint(context, path):
    current = {item["id"] for item in get_path(body_of(context), path)}
    previous = context.aliases.get("previous page ids")
    assert previous is not None, (
        "Remember a page first with 'the ids in \"items\" are remembered'.")
    overlap = current & previous
    if overlap:
        fail(context, f"Pages share these ids: {sorted(overlap)}")


@then('the ids in "{path}" are remembered')
def step_remember_ids(context, path):
    context.aliases["previous page ids"] = {
        item["id"] for item in get_path(body_of(context), path)}


# --- Database ------------------------------------------------------------

@then('table "{table}" has {count:d} rows')
def step_table_row_count(context, table, count):
    actual = _repository(context, table).count()
    assert actual == count, f'Expected {count} rows in "{table}" but found {actual}.'


@then('table "{table}" is empty')
def step_table_empty(context, table):
    actual = _repository(context, table).count()
    assert actual == 0, f'Expected "{table}" to be empty but it held {actual} rows.'


@then('the tables were rebuilt from scratch')
def step_tables_rebuilt(context):
    missing = context.db_repository.missing_tables()
    assert not missing, f"These tables are missing: {missing}"
    assert context.db_repository.applied_migration_count() > 0, (
        "No EF Core migrations are recorded, so the schema was not rebuilt.")


@then('the application of worker {worker_alias} on job "{job_alias}" has status {status}')
def step_application_status(context, worker_alias, job_alias, status):
    application = context.job_application_repository.find(
        resolve_job_id(context, job_alias), resolve_worker_id(context, worker_alias))
    assert application is not None, (
        f"Worker {worker_alias} has no application to job {job_alias}.")
    assert application["Status"] == status, (
        f'Expected status {status} but the row says {application["Status"]}.')


@then('worker {worker_alias} has no application to job "{job_alias}"')
def step_no_application(context, worker_alias, job_alias):
    application = context.job_application_repository.find(
        resolve_job_id(context, job_alias), resolve_worker_id(context, worker_alias))
    assert application is None, f"Unexpected application row: {application}."


@then('job "{job_alias}" has {count:d} applications in the database')
def step_job_application_count(context, job_alias, count):
    actual = len(context.job_application_repository.for_job(
        resolve_job_id(context, job_alias)))
    assert actual == count, f"Expected {count} applications but found {actual}."


@then('the created job is stored with title "{title}"')
def step_created_job_stored(context, title):
    job_id = context.aliases["created job"]
    stored = context.job_post_repository.get_by_id(job_id)
    assert stored is not None, f"Job {job_id} is not in the database."
    assert stored["Title"] == title, (
        f'Expected title "{title}" but the row says "{stored["Title"]}".')
    assert str(stored["EmployerId"]) == context.test_data_manager.employer_id, (
        "The job was stored against the wrong employer.")


@then('job "{job_alias}" is stored with title "{title}"')
def step_job_stored_with_title(context, job_alias, title):
    stored = context.job_post_repository.get_by_id(resolve_job_id(context, job_alias))
    assert stored is not None, f"Job {job_alias} is not in the database."
    assert stored["Title"] == title, (
        f'Expected title "{title}" but the row says "{stored["Title"]}".')


@then('{user_alias} has {unread:d} unread and {read:d} read notifications in the database')
def step_notification_counts(context, user_alias, unread, read):
    user_id = resolve_user_id(context, user_alias)
    actual_unread = context.notification_repository.unread_count(user_id)
    actual_read = context.notification_repository.read_count(user_id)
    assert (actual_unread, actual_read) == (unread, read), (
        f"Expected {unread} unread / {read} read but found "
        f"{actual_unread} unread / {actual_read} read.")


@then('{user_alias} has a "{notification_type}" notification in the database')
def step_notification_exists(context, user_alias, notification_type):
    rows = context.notification_repository.for_user(resolve_user_id(context, user_alias))
    types = [row["Type"] for row in rows]
    assert notification_type in types, (
        f"Expected a {notification_type} notification. Found: {types}")


@then('the stored profile field "{column}" for {user_alias} is "{expected}"')
def step_stored_profile_field(context, column, user_alias, expected):
    stored = context.user_repository.get_by_id(resolve_user_id(context, user_alias))
    actual = stored[column]
    assert str(actual) == expected, (
        f'Expected "{column}" to be "{expected}" but the row says "{actual}".')


@then('the employer has saved candidate {worker_alias} in the database')
def step_saved_candidate_stored(context, worker_alias):
    assert context.saved_candidate_repository.exists(
        context.test_data_manager.employer_id,
        resolve_worker_id(context, worker_alias)), "No SavedCandidates row was written."


@then('the employer has not saved candidate {worker_alias} in the database')
def step_saved_candidate_absent(context, worker_alias):
    assert not context.saved_candidate_repository.exists(
        context.test_data_manager.employer_id,
        resolve_worker_id(context, worker_alias)), "A SavedCandidates row still exists."


@then('the worker has saved job "{job_alias}" in the database')
def step_saved_job_stored(context, job_alias):
    assert context.saved_job_repository.exists(
        context.test_data_manager.worker_ids[0],
        resolve_job_id(context, job_alias)), "No SavedJobs row was written."


@then('the worker has not saved job "{job_alias}" in the database')
def step_saved_job_absent(context, job_alias):
    assert not context.saved_job_repository.exists(
        context.test_data_manager.worker_ids[0],
        resolve_job_id(context, job_alias)), "A SavedJobs row still exists."


# --- LocalStack S3 -------------------------------------------------------

@then('the resume object for the worker exists in S3')
def step_resume_object_exists(context):
    key = context.s3_client.resume_key(context.test_data_manager.worker_ids[0])
    assert context.s3_client.object_exists(key), (
        f"Expected {key} in bucket {context.s3_client.bucket}. "
        f"Found: {context.s3_client.list_keys('resumes/')}")


@then('no resume object exists in S3 for the worker')
def step_resume_object_absent(context):
    key = context.s3_client.resume_key(context.test_data_manager.worker_ids[0])
    assert not context.s3_client.object_exists(key), f"Unexpected object {key}."


@then('the stored resume file name for the worker is "{file_name}"')
def step_stored_resume_name(context, file_name):
    stored = context.user_repository.get_by_id(context.test_data_manager.worker_ids[0])
    assert stored["ResumeFileName"] == file_name, (
        f'Expected "{file_name}" but the row says "{stored["ResumeFileName"]}".')


@then('the download responds with {status:d} and content type "{content_type}"')
def step_download_content_type(context, status, content_type):
    response = context.download_response
    assert response.status_code == status, (
        f"Expected {status} from the presigned url but got {response.status_code}: "
        f"{response.text[:300]}")
    actual = response.headers.get("Content-Type", "")
    assert content_type in actual, (
        f'Expected content type "{content_type}" but got "{actual}".')


@then('the download is an attachment named "{file_name}"')
def step_download_attachment(context, file_name):
    disposition = context.download_response.headers.get("Content-Disposition", "")
    assert "attachment" in disposition.lower() and file_name in disposition, (
        f'Expected an attachment named "{file_name}" but got "{disposition}".')
