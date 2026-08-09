@resume @s3
Feature: Resume upload and download through LocalStack S3

  The browser suite could not test this against a real backend at all: the resume
  download specs were skipped unless the mock API was in use. Here the file really
  travels to the S3 bucket LocalStack serves, the object is asserted in the
  bucket, and the presigned link is followed and read back.

  Background:
    Given the mock data is in place

  @db
  Scenario: A worker uploads a PDF resume
    Given the worker has no resume
    When the worker uploads a pdf resume named "worker-resume.pdf"
    Then the response status code is 200
    And the response field "resumeFileName" is "worker-resume.pdf"
    And the resume object for the worker exists in S3
    And the stored resume file name for the worker is "worker-resume.pdf"

  @db
  Scenario: A worker uploads a DOCX resume
    Given the worker has no resume
    When the worker uploads a docx resume named "worker-resume.docx"
    Then the response status code is 200
    And the response field "resumeFileName" is "worker-resume.docx"
    And the resume object for the worker exists in S3

  @db
  Scenario: A replacement upload overwrites the stored resume
    Given the worker has a resume stored in S3
    When the worker uploads a pdf resume named "second-attempt.pdf"
    Then the response status code is 200
    And the stored resume file name for the worker is "second-attempt.pdf"
    And the resume object for the worker exists in S3

  @db
  Scenario: A plain-text file is not a resume
    Given the worker has no resume
    When the worker uploads a text resume named "notes.txt"
    Then the response status code is 400
    And the response body contains the error "PDF, DOC, or DOCX"
    And no resume object exists in S3 for the worker

  @db
  Scenario: An empty file is rejected
    Given the worker has no resume
    When the worker uploads a empty resume named "empty.pdf"
    Then the response status code is 400
    And no resume object exists in S3 for the worker

  @db
  Scenario: A file whose contents do not match its extension is rejected
    Given the worker has no resume
    When the worker uploads a mismatched resume named "pretend.pdf"
    Then the response status code is 400
    And the response body contains the error "do not match"
    And no resume object exists in S3 for the worker

  @db
  Scenario: An employer cannot upload a resume
    When the employer uploads a pdf resume named "employer-resume.pdf"
    Then the response status code is 403

  @db
  Scenario: A worker downloads their own resume through a presigned link
    Given the worker has a resume stored in S3
    When the worker requests the stored resume
    Then the response status code is 200
    And the response field "fileName" is "demo-worker-resume.pdf"
    And the response field "url" is present
    When a client downloads the presigned url from the response
    Then the download responds with 200 and content type "application/pdf"
    And the download is an attachment named "demo-worker-resume.pdf"

  @db
  Scenario: A worker without a resume gets a clear not-found
    Given the worker has no resume
    When the worker requests the stored resume
    Then the response status code is 404
    And the response body contains the error "Resume not found"

  @db
  Scenario: An employer downloads the resume of someone who applied to their job
    Given the worker has a resume stored in S3
    And the worker has applied to job "J01"
    When the employer downloads the resume of candidate worker 1
    Then the response status code is 200
    And the response field "fileName" is "demo-worker-resume.pdf"
    When a client downloads the presigned url from the response
    Then the download responds with 200 and content type "application/pdf"

  @db
  Scenario: An employer cannot download the resume of a candidate who never applied
    Given candidate worker 9 has a resume stored in S3
    When the employer downloads the resume of candidate worker 9
    Then the response status code is 404
    And the response body contains the error "Resume not found"

  @db
  Scenario: A rival employer cannot download an applicant's resume
    Given the worker has a resume stored in S3
    When the rival employer sends a GET request to "hiring/candidates/{worker:worker 1}/resume"
    Then the response status code is 404

  @db
  Scenario: Resume availability is only advertised to an employer the candidate applied to
    Given the worker has a resume stored in S3
    When the employer opens candidate worker 1
    Then the response status code is 200
    And the response field "hasApplied" is "true"
    And the response field "hasResume" is "true"
    When the rival employer opens candidate worker 1
    Then the response status code is 200
    And the response field "hasApplied" is "false"
    And the response field "hasResume" is "false"
