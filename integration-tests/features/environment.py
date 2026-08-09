"""behave hooks for the LocalHire integration suite.

Run from the ``integration-tests`` directory:

    behave                       # every feature, schema rebuilt per scenario
    behave -D reset_mode=truncate
    behave features/hiring_jobs.feature
    behave --tags=worker
"""

import os
import sys

# Windows consoles default to cp1252, which cannot print the characters the API
# uses in some validation messages. Reconfiguring here keeps a failure readable
# instead of turning it into a UnicodeEncodeError.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):  # pragma: no cover - non-reconfigurable stream
        pass

# Make ``features.*`` importable no matter which directory behave was started
# from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from features.layers.behave_layer import BehaveLayerStack  # noqa: E402
from features.layers.db_layer import DbLayer  # noqa: E402
from features.layers.localhire_layer import LocalHireLayer  # noqa: E402
from features.layers.s3_layer import S3Layer  # noqa: E402

layers = BehaveLayerStack(
    LocalHireLayer(),
    DbLayer(),
    S3Layer(),
)


def before_all(context):
    layers.before_all(context)


def before_feature(context, feature):
    layers.before_feature(context, feature)


def before_scenario(context, scenario):
    if "jwt_secret" in scenario.effective_tags and not context.jwt_secret:
        scenario.skip(
            "No JWT secret configured. Set JWT_SECRET (or -D jwt_secret=...) to the "
            "value the API runs with to enable the forged-token scenarios.")
        return

    context.response = None
    context.response_body = None
    context.aliases = {}
    layers.before_scenario(context, scenario)


def before_step(context, step):
    layers.before_step(context, step)


def after_step(context, step):
    layers.after_step(context, step)


def after_scenario(context, scenario):
    layers.after_scenario(context, scenario)


def after_feature(context, feature):
    layers.after_feature(context, feature)


def after_all(context):
    layers.after_all(context)
