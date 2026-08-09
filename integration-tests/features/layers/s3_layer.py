"""Prepares LocalStack S3 for every ``@s3`` scenario.

Makes sure the resume bucket exists and empties the ``resumes/`` prefix, so a
resume uploaded by one scenario can never satisfy the next one.
"""

from features.layers.behave_layer import TaggedLayer


class S3Layer(TaggedLayer):
    def __init__(self):
        super().__init__("s3")

    def before_feature(self, context, feature):
        tagged_scenarios = any(
            "s3" in getattr(scenario, "effective_tags", scenario.tags)
            for scenario in feature.scenarios)
        if "s3" not in feature.tags and not tagged_scenarios:
            return
        if not context.s3_client.is_available():
            feature.skip(
                "LocalStack is not reachable at "
                f"{context.s3_client.endpoint_url}. Start it with "
                "'docker compose --profile localstack up'.")

    def _setup(self, context):
        context.s3_client.ensure_bucket()
        context.s3_client.clear_resumes()

    def _cleanup(self, context, scenario):
        pass
