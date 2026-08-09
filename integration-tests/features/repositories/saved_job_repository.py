"""Reads and writes the ``SavedJobs`` table."""

from features.repositories.repository_base import RepositoryBase


class SavedJobRepository(RepositoryBase):
    columns = ("Id", "WorkerId", "WorkerRole", "JobPostId", "CreatedAt")

    def __init__(self, db_client):
        super().__init__("SavedJobs", db_client)

    def _row(self, saved_job):
        return (
            saved_job.id,
            saved_job.worker_id,
            saved_job.worker_role,
            saved_job.job_post_id,
            saved_job.created_at,
        )

    def for_worker(self, worker_id):
        return self.select(
            'SELECT * FROM "SavedJobs" WHERE "WorkerId" = %s ORDER BY "CreatedAt" DESC',
            (worker_id,))

    def exists(self, worker_id, job_id):
        return self.count('"WorkerId" = %s AND "JobPostId" = %s', (worker_id, job_id)) > 0
