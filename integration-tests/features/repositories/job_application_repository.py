"""Reads and writes the ``JobApplications`` table."""

from features.repositories.repository_base import RepositoryBase


class JobApplicationRepository(RepositoryBase):
    columns = (
        "Id", "JobPostId", "WorkerId", "WorkerRole", "Status",
        "CreatedAt", "StatusUpdatedAt",
    )

    def __init__(self, db_client):
        super().__init__("JobApplications", db_client)

    def _row(self, application):
        return (
            application.id,
            application.job_post_id,
            application.worker_id,
            application.worker_role,
            application.status,
            application.created_at,
            application.status_updated_at or application.created_at,
        )

    def for_job(self, job_id, status=None):
        sql = 'SELECT * FROM "JobApplications" WHERE "JobPostId" = %s'
        parameters = [job_id]
        if status:
            sql += ' AND "Status" = %s'
            parameters.append(status)
        sql += ' ORDER BY "CreatedAt" DESC'
        return self.select(sql, tuple(parameters))

    def for_worker(self, worker_id):
        return self.select(
            'SELECT * FROM "JobApplications" WHERE "WorkerId" = %s ORDER BY "CreatedAt" DESC',
            (worker_id,))

    def find(self, job_id, worker_id):
        rows = self.select(
            'SELECT * FROM "JobApplications" WHERE "JobPostId" = %s AND "WorkerId" = %s',
            (job_id, worker_id))
        return rows[0] if rows else None

    def status_of(self, application_id):
        return self.column_value(application_id, "Status")

    def set_status(self, application_id, status):
        self.update_column(application_id, "Status", status)

    def count_by_status(self, status, worker_id=None):
        if worker_id:
            return self.count('"Status" = %s AND "WorkerId" = %s', (status, worker_id))
        return self.count('"Status" = %s', (status,))
