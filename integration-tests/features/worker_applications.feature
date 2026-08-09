@worker @worker_applications
Feature: Applying for work and tracking applications

  Converted from the Working_role apply and applications specs. The browser suite
  stubbed the duplicate-application conflict; here the second attempt really hits
  the unique constraint, and every application is confirmed in PostgreSQL.

  Background:
    Given the mock data is in place

  @db
  Scenario: A worker applies to an open role and the application is stored
    Given the worker has not applied to job "J13"
    When the worker applies to job "J13"
    Then the response status code is 201
    And the response field "status" is "Applied"
    And the response field "jobPostId" is the id of job "J13"
    And the response field "jobTitle" is "Store Associate 13"
    And the response field "workplaceName" is "LocalHire Test Store 13"
    And the response field "createdAt" is present
    And the response field "statusUpdatedAt" is present
    And the application of worker 1 on job "J13" has status Applied
    And job "J13" has 1 applications in the database

  @db
  Scenario: Applying notifies the employer who posted the role
    When the worker applies to job "J13"
    Then the response status code is 201
    And the employer has a "NewApplication" notification in the database
    And the employer has 1 unread and 0 read notifications in the database

  @db
  Scenario: A new application appears at the top of the worker's tracker
    When the worker applies to job "J13"
    Then the response status code is 201
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "13"
    And the response field "items.0.jobPostId" is the id of job "J13"
    And the response field "items.0.status" is "Applied"

  @db
  Scenario: A worker cannot apply to the same role twice
    When the worker applies to job "J01"
    Then the response status code is 409
    And the response body contains the error "already applied"
    And job "J01" has 8 applications in the database

  @db
  Scenario: Applying to a closed role is refused
    Given job "J13" is closed
    When the worker applies to job "J13"
    Then the response status code is 404
    And the response body contains the error "no longer active"
    And worker 1 has no application to job "J13"

  @db
  Scenario: Applying to a role that does not exist is refused
    When the worker applies to job "missing"
    Then the response status code is 404
    And table "JobApplications" has 96 rows

  @db
  Scenario: The application tracker lists every application newest first
    When the worker sends a GET request to "work/applications"
    Then the response status code is 200
    And the response list has 12 items
    And the response field "0.jobTitle" is present
    And the response field "0.status" is present

  @db
  Scenario: The tracker pages six at a time and counts outcomes
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response status code is 200
    And the response list "items" has 6 items
    And the response field "page" is "1"
    And the response field "pageSize" is "6"
    And the response field "totalCount" is "12"
    And the response field "totalPages" is "2"
    And the response field "shortlistedCount" is "3"
    And the response field "hiredCount" is "3"
    And the ids in "items" are remembered
    When the worker sends a GET request to "work/applications/paged?page=2&pageSize=6"
    Then the response list "items" has 6 items
    And the ids in "items" do not overlap with the previous page

  @db
  Scenario: Outcome counters follow the employer's decisions
    Given the worker has no applications
    And the worker has applied to job "J01"
    And the worker has applied to job "J02"
    When the employer shortlists the application of worker 1 on job "J01"
    Then the response status code is 200
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response field "totalCount" is "2"
    And the response field "shortlistedCount" is "1"
    And the response field "hiredCount" is "0"
    When the employer hires the application of worker 1 on job "J01"
    Then the response status code is 200
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response field "shortlistedCount" is "0"
    And the response field "hiredCount" is "1"

  @db
  Scenario: Every application carries one of the four lifecycle statuses
    When the worker sends a GET request to "work/applications"
    Then the response status code is 200
    And the response list has 12 items
    And every application status in the response is a known status

  @db
  Scenario: A worker with no applications gets an empty, well-formed page
    Given the worker has no applications
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"
    And the response field "totalPages" is "0"
    And the response field "shortlistedCount" is "0"
    And the response field "hiredCount" is "0"

  @db
  Scenario: An applied role is still readable while it stays open
    When the worker opens job "J01"
    Then the response status code is 200
    And the response field "applicationCount" is "8"

  @db
  Scenario: One worker's applications are invisible to another worker
    When worker 2 sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "12"
    And the response field "shortlistedCount" is "0"
    And the response field "hiredCount" is "0"
