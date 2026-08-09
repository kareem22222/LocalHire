"""Reads and writes the ``SavedCandidates`` table."""

from features.repositories.repository_base import RepositoryBase


class SavedCandidateRepository(RepositoryBase):
    columns = ("Id", "EmployerId", "EmployerRole", "WorkerId", "WorkerRole", "CreatedAt")

    def __init__(self, db_client):
        super().__init__("SavedCandidates", db_client)

    def _row(self, saved_candidate):
        return (
            saved_candidate.id,
            saved_candidate.employer_id,
            saved_candidate.employer_role,
            saved_candidate.worker_id,
            saved_candidate.worker_role,
            saved_candidate.created_at,
        )

    def for_employer(self, employer_id):
        return self.select(
            'SELECT * FROM "SavedCandidates" WHERE "EmployerId" = %s ORDER BY "CreatedAt" DESC',
            (employer_id,))

    def exists(self, employer_id, worker_id):
        return self.count(
            '"EmployerId" = %s AND "WorkerId" = %s', (employer_id, worker_id)) > 0
