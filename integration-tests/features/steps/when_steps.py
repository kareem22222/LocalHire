"""When steps.

Two layers on purpose:

* generic verb steps (``sends a GET request to "..."``) so any endpoint, query
  string, or body can be exercised without new Python;
* named domain actions (``applies to job "J01"``) for the flows that read better
  as behaviour than as HTTP.
"""

import json

from behave import when

from features.steps.given_steps import DOCX_BYTES, PDF_BYTES, TEXT_BYTES
from features.utils import data_dict as data
from features.utils.request_utils import send_request
from features.utils.resolvers import (
    expand_path,
    resolve_application_id,
    resolve_job_id,
    resolve_worker_id,
)
from features.utils.step_types import register_types
from features.utils.util import get_int_setting

register_types()


def _body(context):
    if not context.text:
        return None
    return json.loads(expand_path(context, context.text))


def _query_parameters(context):
    """Read an optional ``| name | value |`` table into query parameters."""
    if not context.table:
        return None
    return {
        row["name"]: (None if row["value"] in ("", "null") else row["value"])
        for row in context.table
    }


# --- Generic HTTP --------------------------------------------------------

@when('{actor} sends a GET request to "{path}"')
def step_get(context, actor, path):
    send_request(context, "GET", expand_path(context, path), actor,
                 query_parameters=_query_parameters(context))


@when('{actor} sends a POST request to "{path}"')
def step_post(context, actor, path):
    send_request(context, "POST", expand_path(context, path), actor,
                 body=_body(context), query_parameters=_query_parameters(context))


@when('{actor} sends a PUT request to "{path}"')
def step_put(context, actor, path):
    send_request(context, "PUT", expand_path(context, path), actor,
                 body=_body(context), query_parameters=_query_parameters(context))


@when('{actor} sends a DELETE request to "{path}"')
def step_delete(context, actor, path):
    send_request(context, "DELETE", expand_path(context, path), actor,
                 query_parameters=_query_parameters(context))


@when('a client sends a GET request to "{path}" without a token')
def step_get_anonymous(context, path):
    send_request(context, "GET", expand_path(context, path), "no",
                 query_parameters=_query_parameters(context))


# --- Authentication ------------------------------------------------------

@when('a client signs in with email "{email:Text}", password "{password:Text}" '
      'and role "{role:Text}"')
def step_sign_in(context, email, password, role):
    send_request(context, "POST", "auth/login", "no",
                 body={"email": email, "password": password, "role": role})


@when('a client signs in as the {role_name} with the correct password')
def step_sign_in_correct(context, role_name):
    email, role = (
        (data.EMPLOYER_EMAIL, data.HIRING) if "employer" in role_name.lower()
        else (data.WORKER_EMAIL, data.LOOKING_FOR_WORK))
    send_request(context, "POST", "auth/login", "no",
                 body={"email": email, "password": context.test_password, "role": role})


@when('a client registers with name "{name:Text}", email "{email:Text}", '
      'password "{password:Text}" and role "{role:Text}"')
def step_register(context, name, email, password, role):
    send_request(context, "POST", "auth/register", "no",
                 body={"name": name, "email": email, "password": password, "role": role})


@when('a client sends enough sign-in attempts to exhaust the rate limit')
def step_repeated_sign_in(context):
    """Fires ``permits + 2`` attempts for an address that does not exist.

    An unknown email short-circuits before the password hash is verified, so this
    stays fast. The permit count comes from ``auth_rate_limit_permits`` and must
    match the API's ``Auth__RateLimit__PermitLimit``.
    """
    permits = get_int_setting(context, "auth_rate_limit_permits", 5)
    for _ in range(permits + 2):
        send_request(context, "POST", "auth/login", "no", body={
            "email": "nobody.rate.limited@localhire.test",
            "password": "WrongPassword1!",
            "role": data.HIRING,
        })
        if context.response.status_code == 429:
            break


# --- Hiring flows --------------------------------------------------------

@when('the employer creates a job posting')
def step_create_job(context):
    send_request(context, "POST", "hiring/jobs", "employer", body=_body(context))
    if context.response.status_code == 201:
        context.aliases["created job"] = context.response.json()["id"]


@when('the employer updates job "{job_alias}"')
def step_update_job(context, job_alias):
    send_request(context, "PUT", f"hiring/jobs/{resolve_job_id(context, job_alias)}",
                 "employer", body=_body(context))


@when('the employer {decision} the application of worker {worker_alias} on job "{job_alias}"')
def step_application_decision(context, decision, worker_alias, job_alias):
    action = {
        "shortlists": "shortlist",
        "hires": "hire",
        "rejects": "reject",
    }.get(decision.strip().lower())
    assert action, f"Unknown decision '{decision}'. Use shortlists, hires, or rejects."

    job_id = resolve_job_id(context, job_alias)
    application_id = resolve_application_id(context, job_alias, worker_alias)
    context.aliases["application"] = application_id
    send_request(
        context, "POST",
        f"hiring/jobs/{job_id}/applications/{application_id}/{action}", "employer")


@when('the rival employer {decision} the application of worker {worker_alias} on job "{job_alias}"')
def step_rival_application_decision(context, decision, worker_alias, job_alias):
    action = {"shortlists": "shortlist", "hires": "hire", "rejects": "reject"}[
        decision.strip().lower()]
    job_id = resolve_job_id(context, job_alias)
    application_id = resolve_application_id(context, job_alias, worker_alias)
    send_request(
        context, "POST",
        f"hiring/jobs/{job_id}/applications/{application_id}/{action}", "rival employer")


@when('the employer saves candidate {worker_alias}')
def step_save_candidate(context, worker_alias):
    send_request(context, "POST",
                 f"hiring/saved-candidates/{resolve_worker_id(context, worker_alias)}",
                 "employer")


@when('the employer removes saved candidate {worker_alias}')
def step_remove_saved_candidate(context, worker_alias):
    send_request(context, "DELETE",
                 f"hiring/saved-candidates/{resolve_worker_id(context, worker_alias)}",
                 "employer")


@when('the employer opens candidate {worker_alias}')
def step_open_candidate(context, worker_alias):
    send_request(context, "GET",
                 f"hiring/candidates/{resolve_worker_id(context, worker_alias)}",
                 "employer")


@when('the rival employer opens candidate {worker_alias}')
def step_rival_opens_candidate(context, worker_alias):
    send_request(context, "GET",
                 f"hiring/candidates/{resolve_worker_id(context, worker_alias)}",
                 "rival employer")


@when('the employer downloads the resume of candidate {worker_alias}')
def step_download_candidate_resume(context, worker_alias):
    send_request(context, "GET",
                 f"hiring/candidates/{resolve_worker_id(context, worker_alias)}/resume",
                 "employer")


# --- Worker flows --------------------------------------------------------

@when('the worker applies to job "{job_alias}"')
def step_apply(context, job_alias):
    send_request(context, "POST",
                 f"work/jobs/{resolve_job_id(context, job_alias)}/apply", "worker")


@when('the worker opens job "{job_alias}"')
def step_open_job(context, job_alias):
    send_request(context, "GET",
                 f"work/jobs/{resolve_job_id(context, job_alias)}", "worker")


@when('the worker saves job "{job_alias}"')
def step_save_job(context, job_alias):
    send_request(context, "POST",
                 f"work/saved-jobs/{resolve_job_id(context, job_alias)}", "worker")


@when('the worker removes saved job "{job_alias}"')
def step_remove_saved_job(context, job_alias):
    send_request(context, "DELETE",
                 f"work/saved-jobs/{resolve_job_id(context, job_alias)}", "worker")


# --- Profile and resume --------------------------------------------------

@when('{actor} updates the profile')
def step_update_profile(context, actor):
    send_request(context, "PUT", "me/profile", actor, body=_body(context))


@when('{actor} updates the location to latitude {latitude} and longitude {longitude}')
def step_update_location(context, actor, latitude, longitude):
    def parse(value):
        value = value.strip()
        return None if value.lower() in ("null", "none") else float(value)

    send_request(context, "PUT", "me/location", actor,
                 body={"latitude": parse(latitude), "longitude": parse(longitude)})


@when('{actor} uploads a {kind} resume named "{file_name}"')
def step_upload_resume(context, actor, kind, file_name):
    content, content_type = {
        "pdf": (PDF_BYTES, "application/pdf"),
        "docx": (DOCX_BYTES,
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "text": (TEXT_BYTES, "text/plain"),
        "empty": (b"", "application/pdf"),
        "mismatched": (TEXT_BYTES, "application/pdf"),
    }[kind.strip().lower()]

    send_request(context, "PUT", "me/resume", actor,
                 files={"resume": (file_name, content, content_type)})


@when('the worker requests the stored resume')
def step_request_resume(context):
    send_request(context, "GET", "me/resume", "worker")


@when('a client downloads the presigned url from the response')
def step_download_presigned(context):
    url = context.response.json()["url"]
    context.download_response = context.api_client.session.get(url, timeout=60)


# --- Notifications -------------------------------------------------------

@when('{actor} marks notification "{alias}" as read')
def step_mark_notification_read(context, actor, alias):
    from features.utils.resolvers import lookup_alias

    notification_id = lookup_alias(context, alias.strip()) or alias.strip()
    send_request(context, "PUT", f"notifications/{notification_id}/read", actor)


@when('{actor} marks the oldest notification as read')
def step_mark_oldest_notification_read(context, actor):
    from features.utils.resolvers import resolve_user_id

    notifications = context.notification_repository.for_user(
        resolve_user_id(context, actor))
    assert notifications, f"{actor} has no notifications to mark as read."
    notification_id = str(notifications[-1]["Id"])
    context.aliases["marked notification"] = notification_id
    send_request(context, "PUT", f"notifications/{notification_id}/read", actor)


@when('{actor} marks every notification as read')
def step_mark_all_read(context, actor):
    send_request(context, "PUT", "notifications/read-all", actor)
