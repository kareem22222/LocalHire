#!/bin/sh
set -eu

BUCKET="${AWS_S3_BUCKET:-localhire-resumes-dev}"

if awslocal s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket '$BUCKET' already exists."
else
  echo "Creating bucket '$BUCKET' ..."
  awslocal s3 mb "s3://$BUCKET"
fi

awslocal s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Bucket '$BUCKET' is ready."
