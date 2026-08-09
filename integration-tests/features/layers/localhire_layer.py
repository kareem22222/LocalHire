"""Builds the shared context once per run and proves the stack is reachable.

Sign-in happens here, through the real ``POST /api/auth/login``: the seeded user
ids are fixed, so the tokens stay valid for the whole run even though every
scenario rebuilds the schema.
"""

import os

from features.context_builders.local_context_builder import LocalContextBuilder
from features.layers.behave_layer import BehaveLayer
from features.utils import data_dict as data
from features.utils.jwt_utils import mint_expired_token
from features.utils.request_utils import sign_in
from features.utils.test_data_manager import TestDataManager
from features.utils.util import get_int_setting, get_setting


class LocalHireLayer(BehaveLayer):
    def before_all(self, context):
        context.test_password = get_setting(context, "test_password", "LocalHire1!")
        context.reset_mode = get_setting(context, "reset_mode", "recreate")
        context.jwt_secret = (
            get_setting(context, "jwt_secret")
            or os.environ.get("JWT_SECRET")
            or None)
        context.tokens = {}
        context.aliases = {}
        context.response = None
        context.response_body = None

        builder = LocalContextBuilder(context)
        builder.add_api_client()
        builder.add_test_support_client()
        builder.add_repositories()
        builder.add_s3_client()

        ready_timeout = get_int_setting(context, "api_ready_timeout_seconds", 240)
        context.api_client.wait_until_healthy(ready_timeout)
        context.db_client.wait_until_available(ready_timeout)
        context.test_support_client.wait_until_enabled(60)

        context.test_data_manager = TestDataManager(context)

        # One reset plus one seed up front, so the sign-in below has accounts to
        # authenticate against. Every scenario then repeats this itself.
        context.test_support_client.reset_database(context.reset_mode)
        context.db_client.reconnect()
        context.test_data_manager.initialize_test_data()
        context.test_support_client.clear_caches()

        self.__sign_in_seeded_accounts(context)
        context.expired_token = self.__mint_expired_token(context)

    def after_all(self, context):
        if getattr(context, "db_client", None) is not None:
            context.db_client.close()

    @staticmethod
    def __sign_in_seeded_accounts(context):
        """Authenticate the three accounts nearly every scenario uses.

        The remaining seeded workers are signed in on demand by
        ``request_utils.sign_in``, which keeps a run to a handful of bcrypt
        verifications.
        """
        for user_id in (
            context.test_data_manager.employer_id,
            context.test_data_manager.rival_employer_id,
            context.test_data_manager.worker_ids[0],
        ):
            sign_in(context, user_id)

    @staticmethod
    def __mint_expired_token(context):
        if not context.jwt_secret:
            return None
        return mint_expired_token(
            context.jwt_secret,
            context.test_data_manager.worker_ids[0],
            data.WORKER_EMAIL,
            data.LOOKING_FOR_WORK,
            "Demo Worker",
        )
