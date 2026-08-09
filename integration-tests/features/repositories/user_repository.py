"""Reads and writes the ``Users`` table."""

import json

from features.repositories.repository_base import RepositoryBase


class UserRepository(RepositoryBase):
    columns = (
        "Id", "Name", "Email", "PasswordHash", "Role", "CreatedAt",
        "Phone", "DateOfBirth", "Gender", "JobTitle", "ProfessionalSummary",
        "ExperienceYears", "Education", "Skills", "Languages", "WorkPreferences",
        "WorkHistory", "EducationHistory", "SkillDetails", "LanguageDetails",
        "Credentials", "ResumeKey", "ResumeFileName", "AddressLine", "CityArea",
        "State", "Pincode", "Latitude", "Longitude", "LocationUpdatedAt",
    )

    def __init__(self, db_client):
        super().__init__("Users", db_client)

    def _row(self, user):
        return (
            user.id,
            user.name,
            user.email,
            user.password_hash,
            user.role,
            user.created_at,
            user.phone,
            user.date_of_birth,
            user.gender,
            user.job_title,
            user.professional_summary,
            user.experience_years,
            user.education,
            json.dumps(user.skills or []),
            json.dumps(user.languages or []),
            json.dumps(user.work_preferences or {}),
            json.dumps(user.work_history or []),
            json.dumps(user.education_history or []),
            json.dumps(user.skill_details or []),
            json.dumps(user.language_details or []),
            json.dumps(user.credentials or []),
            user.resume_key,
            user.resume_file_name,
            user.address_line,
            user.city_area,
            user.state,
            user.pincode,
            user.latitude,
            user.longitude,
            user.location_updated_at,
        )

    def get_by_email_and_role(self, email, role):
        rows = self.select(
            'SELECT * FROM "Users" WHERE "Email" = %s AND "Role" = %s', (email, role))
        return rows[0] if rows else None

    def workers(self):
        return self.select(
            'SELECT * FROM "Users" WHERE "Role" = %s ORDER BY "CreatedAt" DESC',
            ("LookingForWork",))

    def employers(self):
        return self.select(
            'SELECT * FROM "Users" WHERE "Role" = %s ORDER BY "CreatedAt" DESC',
            ("Hiring",))

    def set_resume(self, user_id, resume_key, resume_file_name):
        self._db_client.execute_statement(
            'UPDATE "Users" SET "ResumeKey" = %s, "ResumeFileName" = %s WHERE "Id" = %s',
            (resume_key, resume_file_name, user_id))
