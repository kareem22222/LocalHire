"""Row model for the ``JobApplications`` table."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class JobApplication(Model):
    id: str
    job_post_id: str
    worker_id: str
    status: str = "Applied"  # Applied | Shortlisted | Rejected | Hired
    worker_role: str = "LookingForWork"
    created_at: datetime = field(default_factory=utc_now)
    status_updated_at: Optional[datetime] = None
