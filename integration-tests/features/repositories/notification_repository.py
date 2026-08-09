"""Reads and writes the ``Notifications`` table."""

from features.repositories.repository_base import RepositoryBase


class NotificationRepository(RepositoryBase):
    columns = (
        "Id", "UserId", "Type", "Title", "Message", "Link",
        "IsRead", "CreatedAt", "ReadAt",
    )

    def __init__(self, db_client):
        super().__init__("Notifications", db_client)

    def _row(self, notification):
        return (
            notification.id,
            notification.user_id,
            notification.type,
            notification.title,
            notification.message,
            notification.link,
            notification.is_read,
            notification.created_at,
            notification.read_at,
        )

    def for_user(self, user_id, is_read=None):
        sql = 'SELECT * FROM "Notifications" WHERE "UserId" = %s'
        parameters = [user_id]
        if is_read is not None:
            sql += ' AND "IsRead" = %s'
            parameters.append(is_read)
        sql += ' ORDER BY "CreatedAt" DESC'
        return self.select(sql, tuple(parameters))

    def unread_count(self, user_id):
        return self.count('"UserId" = %s AND "IsRead" = false', (user_id,))

    def read_count(self, user_id):
        return self.count('"UserId" = %s AND "IsRead" = true', (user_id,))

    def latest_for_user(self, user_id):
        rows = self.for_user(user_id)
        return rows[0] if rows else None
