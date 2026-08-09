"""Wires the clients and repositories for the local docker compose stack."""

from features.clients.api_client import ApiClient
from features.clients.db_client import DbClient, DbConfig
from features.clients.s3_client import S3Client
from features.clients.test_support_client import TestSupportClient
from features.context_builders.context_builder import ContextBuilder
from features.repositories.db_repository import DbRepository
from features.repositories.job_application_repository import JobApplicationRepository
from features.repositories.job_post_repository import JobPostRepository
from features.repositories.notification_repository import NotificationRepository
from features.repositories.saved_candidate_repository import SavedCandidateRepository
from features.repositories.saved_job_repository import SavedJobRepository
from features.repositories.user_repository import UserRepository
from features.utils.util import as_bool, get_int_setting, get_setting


class LocalContextBuilder(ContextBuilder):
    def add_api_client(self):
        context = self._context
        context.base_url = get_setting(context, "api_base_url", "http://localhost:8080/api/")
        context.api_client = ApiClient(
            context.base_url,
            get_int_setting(context, "request_timeout_seconds", 60),
            trace=as_bool(get_setting(context, "verbose_http", "false")),
        )

    def add_test_support_client(self):
        context = self._context
        context.test_support_client = TestSupportClient(
            context.base_url,
            get_int_setting(context, "request_timeout_seconds", 60) * 3,
        )

    def add_repositories(self):
        context = self._context
        context.db_client = DbClient(DbConfig(
            host=get_setting(context, "db_host", "localhost"),
            port=get_int_setting(context, "db_port", 5433),
            username=get_setting(context, "db_username", "localhire_admin"),
            password=get_setting(context, "db_password", "localhire_dev_password"),
            db_name=get_setting(context, "db_name", "localhire_dev"),
        ))
        context.db_repository = DbRepository(context.db_client)
        context.user_repository = UserRepository(context.db_client)
        context.job_post_repository = JobPostRepository(context.db_client)
        context.job_application_repository = JobApplicationRepository(context.db_client)
        context.notification_repository = NotificationRepository(context.db_client)
        context.saved_candidate_repository = SavedCandidateRepository(context.db_client)
        context.saved_job_repository = SavedJobRepository(context.db_client)

    def add_s3_client(self):
        context = self._context
        context.s3_client = S3Client(
            endpoint_url=get_setting(context, "s3_endpoint_url", "http://localhost:4566"),
            bucket=get_setting(context, "s3_bucket", "localhire-resumes-dev"),
            region=get_setting(context, "aws_region", "ap-south-2"),
            access_key_id=get_setting(context, "aws_access_key_id", "test"),
            secret_access_key=get_setting(context, "aws_secret_access_key", "test"),
        )
