"""Row model for the ``JobPosts`` table (see ``backend/Models/JobPost.cs``)."""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class JobPost(Model):
    id: str
    employer_id: str
    title: str
    description: str
    workplace_name: str
    city_area: str
    employer_role: str = "Hiring"
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    employment_type: Optional[str] = None  # FullTime | PartTime | Contract | Temporary
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_period: Optional[str] = None  # Hourly | Daily | Weekly | Monthly | Yearly
    min_education: Optional[str] = None
    experience_min_years: Optional[int] = None
    experience_max_years: Optional[int] = None
    working_days: Optional[str] = None
    shift_start_time: Optional[str] = None  # "HH:MM"
    shift_end_time: Optional[str] = None
    openings: Optional[int] = None
    required_skills: list = field(default_factory=list)
    languages: list = field(default_factory=list)
    benefits: list = field(default_factory=list)
    is_active: bool = True
    created_at: datetime = field(default_factory=utc_now)
