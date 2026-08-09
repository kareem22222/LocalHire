"""Turns the names used in feature files into ids.

Feature files talk about ``job "J01"``, ``worker 3`` or ``"the created job"``.
Everything is resolved here so the steps stay declarative and a scenario never
hard-codes a GUID.
"""

import re

from features.utils import data_dict as data

MISSING_ID = "00000000-0000-0000-0000-000000000000"
GUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _clean(alias):
    return (alias or "").strip().strip('"').strip("'").strip()


def resolve_job_id(context, alias):
    key = _clean(alias)
    if key in context.aliases:
        return context.aliases[key]
    if GUID_PATTERN.match(key):
        return key
    if key.lower() in ("missing", "unknown", "a missing job", "an unknown job"):
        return MISSING_ID
    if key.lower() in ("the rival employer's job", "rival job", "j90"):
        return context.test_data_manager.rival_job_id
    match = re.fullmatch(r"j(\d+)", key, re.IGNORECASE)
    if match:
        return data.job_id(int(match.group(1)))
    raise AssertionError(f"Cannot resolve job '{alias}'.")


def resolve_worker_id(context, alias):
    key = _clean(alias)
    if key in context.aliases:
        return context.aliases[key]
    if GUID_PATTERN.match(key):
        return key
    if key.lower() in ("missing", "unknown", "a missing candidate", "an unknown candidate"):
        return MISSING_ID
    if key.isdigit():
        return data.worker_id(int(key))
    match = re.fullmatch(r"(?:worker|w)\s*0*(\d+)", key, re.IGNORECASE)
    if match:
        return data.worker_id(int(match.group(1)))
    if key.lower() in ("the worker", "worker", "demo worker"):
        return context.test_data_manager.worker_ids[0]
    raise AssertionError(f"Cannot resolve worker '{alias}'.")


def resolve_newest_application_id(context, job_alias):
    """The most recently created application on a job.

    Lets a scenario act on an applicant it just arranged without knowing which
    generated worker ended up applying.
    """
    job_id = resolve_job_id(context, job_alias)
    applications = context.job_application_repository.for_job(job_id)
    assert applications, f"Job {job_alias} has no applications."
    return str(applications[0]["Id"])


def resolve_user_id(context, alias):
    key = _clean(alias).lower()
    manager = context.test_data_manager
    if key in ("the employer", "employer", "e1"):
        return manager.employer_id
    if key in ("the rival employer", "rival employer", "e2"):
        return manager.rival_employer_id
    return resolve_worker_id(context, alias)


def resolve_application_id(context, job_alias, worker_alias):
    job_id = resolve_job_id(context, job_alias)
    worker_id = resolve_worker_id(context, worker_alias)
    application = context.job_application_repository.find(job_id, worker_id)
    if application is None:
        raise AssertionError(
            f"Worker {worker_id} has no application to job {job_id}.")
    return str(application["Id"])


def lookup_alias(context, token):
    """Read an alias, optionally indexing into a list one (``extra_jobs.0``)."""
    if token in context.aliases:
        value = context.aliases[token]
        return value[0] if isinstance(value, list) else value
    if "." in token:
        name, _, index = token.rpartition(".")
        if index.isdigit() and name in context.aliases:
            value = context.aliases[name]
            if isinstance(value, list):
                return value[int(index)]
    return None


def expand_path(context, path):
    """Replace ``{...}`` placeholders in a request path with resolved ids.

    ``hiring/jobs/{J01}/applications/{application:J01,worker 2}`` becomes a real
    URL. Unknown placeholders are left alone so literal braces still work.
    """
    def replace(match):
        token = match.group(1)
        if token.startswith("application:"):
            job_alias, worker_alias = token[len("application:"):].split(",", 1)
            return resolve_application_id(context, job_alias, worker_alias)
        if token.startswith("newest application:"):
            return resolve_newest_application_id(
                context, token[len("newest application:"):])
        if token.startswith("worker:"):
            return resolve_worker_id(context, token[len("worker:"):])
        if token.startswith("user:"):
            return resolve_user_id(context, token[len("user:"):])
        if token.startswith("job:"):
            return resolve_job_id(context, token[len("job:"):])

        alias_value = lookup_alias(context, token)
        if alias_value is not None:
            return alias_value

        try:
            return resolve_job_id(context, token)
        except AssertionError:
            return match.group(0)

    return re.sub(r"\{([^{}]+)\}", replace, path)
