"""Row model for the ``SavedJobs`` table."""

from dataclasses import dataclass, field
from datetime import datetime

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class SavedJob(Model):
    id: str
    worker_id: str
    job_post_id: str
    worker_role: str = "LookingForWork"
    created_at: datetime = field(default_factory=utc_now)
