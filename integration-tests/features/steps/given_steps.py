"""Given steps: arrange the data a scenario needs.

The ``@db`` tag has already rebuilt the schema and seeded the baseline, so these
steps only add to it or bend it. Every step that writes to PostgreSQL clears the
API's caches afterwards, because job and profile reads are cached in process.
"""

from behave import given

from features.utils import data_dict as data
from features.utils.resolvers import resolve_job_id, resolve_user_id, resolve_worker_id

PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
DOCX_BYTES = b"PK\x03\x04" + b"\x00" * 60
TEXT_BYTES = b"This file is plain text, not a resume.\n"


def _refresh(context):
    context.test_support_client.clear_caches()


@given("the mock data is in place")
def step_mock_data_in_place(context):
    """Documents the ``@db`` contract and proves the rebuild really happened."""
    missing = context.db_repository.missing_tables()
    assert not missing, f"These tables were not rebuilt: {missing}"
    assert context.user_repository.count() == data.WORKER_COUNT + 2, (
        "The baseline users were not seeded: "
        f"found {context.user_repository.count()} rows in Users.")


@given('the employer has {count:d} open jobs')
def step_employer_open_jobs(context, count):
    """Replaces the baseline jobs with exactly ``count`` open ones.

    Deleting the jobs cascades their applications and saved-job rows, so the
    resulting counts are exact.
    """
    context.job_post_repository.delete_all()
    context.aliases["extra_jobs"] = context.test_data_manager.add_jobs(
        context.test_data_manager.employer_id, count)
    _refresh(context)


@given('the employer has {count:d} extra open jobs')
def step_employer_extra_open_jobs(context, count):
    context.aliases["extra_jobs"] = context.test_data_manager.add_jobs(
        context.test_data_manager.employer_id, count)
    _refresh(context)


@given('the employer has {count:d} closed jobs')
def step_employer_closed_jobs(context, count):
    context.aliases["closed_jobs"] = context.test_data_manager.add_jobs(
        context.test_data_manager.employer_id, count, is_active=False)
    _refresh(context)


@given('the employer has no jobs')
def step_employer_has_no_jobs(context):
    context.job_application_repository.delete_all()
    context.saved_job_repository.delete_all()
    context.job_post_repository.delete_all()
    _refresh(context)


@given('there are no applications')
def step_no_applications(context):
    context.job_application_repository.delete_all()
    _refresh(context)


@given('there are no candidates besides the applicants')
def step_only_applicant_candidates(context):
    keep = {context.test_data_manager.worker_ids[0]}
    for worker in context.user_repository.workers():
        worker_id = str(worker["Id"])
        if worker_id not in keep:
            context.db_client.execute_statement(
                'DELETE FROM "Users" WHERE "Id" = %s', (worker_id,))
    _refresh(context)


@given('job "{job_alias}" is closed')
def step_close_job(context, job_alias):
    context.job_post_repository.set_active(resolve_job_id(context, job_alias), False)
    _refresh(context)


@given('job "{job_alias}" has no applications')
def step_job_without_applications(context, job_alias):
    context.db_client.execute_statement(
        'DELETE FROM "JobApplications" WHERE "JobPostId" = %s',
        (resolve_job_id(context, job_alias),))
    _refresh(context)


@given('job "{job_alias}" has {count:d} applicants with status {status}')
def step_job_applicants(context, job_alias, count, status):
    job_id = resolve_job_id(context, job_alias)
    context.db_client.execute_statement(
        'DELETE FROM "JobApplications" WHERE "JobPostId" = %s', (job_id,))
    context.aliases[f"{job_alias}_applications"] = (
        context.test_data_manager.add_applicants(job_id, count, status))
    _refresh(context)


@given('job "{job_alias}" has {count:d} more applicants with status {status}')
def step_job_more_applicants(context, job_alias, count, status):
    job_id = resolve_job_id(context, job_alias)
    context.test_data_manager.add_applicants(job_id, count, status)
    _refresh(context)


@given('the application of worker {worker_alias} on job "{job_alias}" is {status}')
def step_set_application_status(context, worker_alias, job_alias, status):
    application = context.job_application_repository.find(
        resolve_job_id(context, job_alias), resolve_worker_id(context, worker_alias))
    assert application is not None, (
        f"Worker {worker_alias} has not applied to job {job_alias}.")
    context.job_application_repository.set_status(str(application["Id"]), status)
    _refresh(context)


@given('the worker has applied to job "{job_alias}"')
def step_worker_applied(context, job_alias):
    job_id = resolve_job_id(context, job_alias)
    worker_id = context.test_data_manager.worker_ids[0]
    if context.job_application_repository.find(job_id, worker_id) is None:
        context.test_data_manager.add_applications(job_id, [worker_id])
    _refresh(context)


@given('the worker has not applied to job "{job_alias}"')
def step_worker_not_applied(context, job_alias):
    context.db_client.execute_statement(
        'DELETE FROM "JobApplications" WHERE "JobPostId" = %s AND "WorkerId" = %s',
        (resolve_job_id(context, job_alias), context.test_data_manager.worker_ids[0]))
    _refresh(context)


@given('the worker has no applications')
def step_worker_without_applications(context):
    context.db_client.execute_statement(
        'DELETE FROM "JobApplications" WHERE "WorkerId" = %s',
        (context.test_data_manager.worker_ids[0],))
    _refresh(context)


@given('the worker has saved job "{job_alias}"')
def step_worker_saved_job(context, job_alias):
    context.test_data_manager.add_saved_job(
        context.test_data_manager.worker_ids[0], resolve_job_id(context, job_alias))
    _refresh(context)


@given('the worker has saved no jobs')
def step_worker_saved_no_jobs(context):
    context.saved_job_repository.delete_all()
    _refresh(context)


@given('the employer has saved candidate {worker_alias}')
def step_employer_saved_candidate(context, worker_alias):
    context.test_data_manager.add_saved_candidate(
        context.test_data_manager.employer_id, resolve_worker_id(context, worker_alias))
    _refresh(context)


@given('the employer has saved no candidates')
def step_employer_saved_no_candidates(context):
    context.saved_candidate_repository.delete_all()
    _refresh(context)


@given('{user_alias} has {count:d} unread notifications')
def step_unread_notifications(context, user_alias, count):
    ids = context.test_data_manager.add_notifications(
        resolve_user_id(context, user_alias), count, is_read=False)
    context.aliases[f"{user_alias} notifications"] = ids
    _refresh(context)


@given('{user_alias} has {count:d} read notifications')
def step_read_notifications(context, user_alias, count):
    ids = context.test_data_manager.add_notifications(
        resolve_user_id(context, user_alias), count, is_read=True)
    context.aliases[f"{user_alias} notifications"] = ids
    _refresh(context)


@given('{user_alias} has one unread notification linking to job "{job_alias}"')
def step_unread_notification_with_link(context, user_alias, job_alias):
    job_id = resolve_job_id(context, job_alias)
    ids = context.test_data_manager.add_notifications(
        resolve_user_id(context, user_alias), 1, is_read=False,
        notification_type="Shortlisted", link=f"/work/jobs/{job_id}")
    context.aliases["notification"] = ids[0]
    _refresh(context)


@given('{user_alias} has no notifications')
def step_no_notifications(context, user_alias):
    context.db_client.execute_statement(
        'DELETE FROM "Notifications" WHERE "UserId" = %s',
        (resolve_user_id(context, user_alias),))
    _refresh(context)


@given('{count:d} extra candidates exist')
def step_extra_candidates(context, count):
    context.aliases["extra_candidates"] = context.test_data_manager.add_workers(count)
    _refresh(context)


@given('a candidate exists with role "{role}" in area "{area}"')
def step_candidate_with_role_and_area(context, role, area):
    ids = context.test_data_manager.add_workers(
        1, job_title=role, city_area=area, state=data.STATE,
        pincode=data.EMPLOYER_PINCODE,
        latitude=data.EMPLOYER_LATITUDE, longitude=data.EMPLOYER_LONGITUDE)
    context.aliases["candidate"] = ids[0]
    _refresh(context)


@given('a job exists with title "{title}" and employment type "{employment_type}"')
def step_job_with_title(context, title, employment_type):
    ids = context.test_data_manager.add_jobs(
        context.test_data_manager.employer_id, 1,
        title=title, employment_type=employment_type)
    context.aliases["job"] = ids[0]
    _refresh(context)


# --- Resumes / LocalStack ------------------------------------------------

@given('the worker has a resume stored in S3')
def step_worker_resume_in_s3(context):
    worker_id = context.test_data_manager.worker_ids[0]
    key = context.s3_client.resume_key(worker_id)
    context.s3_client.put_object(key, PDF_BYTES)
    context.user_repository.set_resume(worker_id, key, data.RESUME_FILE_NAME)
    context.aliases["resume_key"] = key
    _refresh(context)


@given('the worker has no resume')
def step_worker_without_resume(context):
    worker_id = context.test_data_manager.worker_ids[0]
    context.db_client.execute_statement(
        'UPDATE "Users" SET "ResumeKey" = NULL, "ResumeFileName" = NULL WHERE "Id" = %s',
        (worker_id,))
    context.s3_client.clear_resumes()
    _refresh(context)


@given('candidate {worker_alias} has a resume stored in S3')
def step_candidate_resume_in_s3(context, worker_alias):
    worker_id = resolve_worker_id(context, worker_alias)
    key = context.s3_client.resume_key(worker_id)
    context.s3_client.put_object(key, PDF_BYTES)
    context.user_repository.set_resume(worker_id, key, data.RESUME_FILE_NAME)
    _refresh(context)
