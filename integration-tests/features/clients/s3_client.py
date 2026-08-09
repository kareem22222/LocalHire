"""S3 client pointed at LocalStack (``docker compose --profile localstack``).

Used by the resume scenarios to guarantee the bucket exists, to clear it between
scenarios, and to assert that the API really wrote ``resumes/{user-id}/current``.
"""

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from features.utils.util import wait_until

RESUME_PREFIX = "resumes/"


class S3Client:
    def __init__(self, endpoint_url, bucket, region, access_key_id, secret_access_key):
        self.endpoint_url = endpoint_url
        self.bucket = bucket
        self.__client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            # LocalStack serves buckets path-style on the edge port.
            config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3}),
        )

    def is_available(self):
        try:
            self.__client.list_buckets()
            return True
        except Exception:  # noqa: BLE001 - availability probe
            return False

    def wait_until_available(self, timeout_seconds):
        wait_until(self.is_available, timeout_seconds, interval_seconds=2,
                   description=f"LocalStack S3 at {self.endpoint_url}")

    def ensure_bucket(self):
        try:
            self.__client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.__client.create_bucket(Bucket=self.bucket)

    def clear_resumes(self):
        """Delete every object under ``resumes/`` so each scenario starts empty."""
        keys = [{"Key": key} for key in self.list_keys(RESUME_PREFIX)]
        for index in range(0, len(keys), 1000):
            self.__client.delete_objects(
                Bucket=self.bucket, Delete={"Objects": keys[index:index + 1000]})

    def list_keys(self, prefix=""):
        paginator = self.__client.get_paginator("list_objects_v2")
        keys = []
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            keys.extend(item["Key"] for item in page.get("Contents", []))
        return keys

    def put_object(self, key, content, content_type="application/pdf"):
        self.__client.put_object(
            Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)

    def object_exists(self, key):
        try:
            self.__client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def get_object_bytes(self, key):
        return self.__client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def resume_key(self, user_id):
        return f"{RESUME_PREFIX}{user_id}/current"
