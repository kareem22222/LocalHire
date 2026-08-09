"""Row model for the ``Notifications`` table."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from features.db_models.model import Model
from features.utils.util import utc_now


@dataclass
class Notification(Model):
    id: str
    user_id: str
    type: str  # NewApplication | Shortlisted | Hired | Rejected | JobUpdated
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime = field(default_factory=utc_now)
    read_at: Optional[datetime] = None
