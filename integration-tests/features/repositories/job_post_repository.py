"""Reads and writes the ``JobPosts`` table."""

import json

from features.repositories.repository_base import RepositoryBase


class JobPostRepository(RepositoryBase):
    columns = (
        "Id", "EmployerId", "EmployerRole", "Title", "Description", "WorkplaceName",
        "CityArea", "State", "Pincode", "Latitude", "Longitude", "EmploymentType",
        "SalaryMin", "SalaryMax", "SalaryPeriod", "MinEducation",
        "ExperienceMinYears", "ExperienceMaxYears", "WorkingDays",
        "ShiftStartTime", "ShiftEndTime", "Openings", "RequiredSkills",
        "Languages", "Benefits", "IsActive", "CreatedAt",
    )

    def __init__(self, db_client):
        super().__init__("JobPosts", db_client)

    def _row(self, job):
        return (
            job.id,
            job.employer_id,
            job.employer_role,
            job.title,
            job.description,
            job.workplace_name,
            job.city_area,
            job.state,
            job.pincode,
            job.latitude,
            job.longitude,
            job.employment_type,
            job.salary_min,
            job.salary_max,
            job.salary_period,
            job.min_education,
            job.experience_min_years,
            job.experience_max_years,
            job.working_days,
            job.shift_start_time,
            job.shift_end_time,
            job.openings,
            json.dumps(job.required_skills or []),
            json.dumps(job.languages or []),
            json.dumps(job.benefits or []),
            job.is_active,
            job.created_at,
        )

    def for_employer(self, employer_id, active_only=None):
        sql = 'SELECT * FROM "JobPosts" WHERE "EmployerId" = %s'
        parameters = [employer_id]
        if active_only is not None:
            sql += ' AND "IsActive" = %s'
            parameters.append(active_only)
        sql += ' ORDER BY "CreatedAt" DESC'
        return self.select(sql, tuple(parameters))

    def set_active(self, job_id, is_active):
        self.update_column(job_id, "IsActive", is_active)

    def title_of(self, job_id):
        return self.column_value(job_id, "Title")
