"""Row model for the ``Users`` table.

Mirrors ``backend/Models/User.cs``. The list/object properties are stored by EF
Core as JSON text, so they are held here as Python values and serialised on
insert by ``UserRepository``.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class User(Model):
    id: str
    name: str
    email: str
    password_hash: str
    role: str  # "Hiring" | "LookingForWork"
    created_at: datetime = field(default_factory=utc_now)

    phone: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO date, e.g. "1996-04-12"
    gender: Optional[str] = None
    job_title: Optional[str] = None
    professional_summary: Optional[str] = None
    experience_years: Optional[int] = None
    education: Optional[str] = None
    skills: list = field(default_factory=list)
    languages: list = field(default_factory=list)
    work_preferences: dict = field(default_factory=dict)
    work_history: list = field(default_factory=list)
    education_history: list = field(default_factory=list)
    skill_details: list = field(default_factory=list)
    language_details: list = field(default_factory=list)
    credentials: list = field(default_factory=list)
    resume_key: Optional[str] = None
    resume_file_name: Optional[str] = None

    address_line: Optional[str] = None
    city_area: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_updated_at: Optional[Any] = None

    @property
    def is_worker(self):
        return self.role == "LookingForWork"
