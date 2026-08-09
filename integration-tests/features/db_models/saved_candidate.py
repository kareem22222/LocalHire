"""Row model for the ``SavedCandidates`` table."""

from dataclasses import dataclass, field
from datetime import datetime

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class SavedCandidate(Model):
    id: str
    employer_id: str
    worker_id: str
    employer_role: str = "Hiring"
    worker_role: str = "LookingForWork"
    created_at: datetime = field(default_factory=utc_now)
