@hiring @applications
Feature: Applicants and hiring decisions

  Converted from the Hiring_role applicant_shortlisting and
  shortlists_and_applicants specs. The browser suite had to hunt for an applicant
  nobody had decided on yet, because decisions are irreversible; here every
  scenario arranges the exact state it needs and asserts both the response and
  the stored row.

  Background:
    Given the mock data is in place

  @db
  Scenario: A role's applicants are listed newest first with their status
    When the employer sends a GET request to "hiring/jobs/{J01}/applications"
    Then the response status code is 200
    And the response list has 8 items
    And the response field "0.workerName" is present
    And the response field "0.status" is "Applied"

  @db
  Scenario: Applicants are paged ten at a time
    Given job "J01" has 12 applicants with status Applied
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 10 items
    And the response field "totalCount" is "12"
    And the response field "totalPages" is "2"
    And the ids in "items" are remembered
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?page=2&pageSize=10"
    Then the response list "items" has 2 items
    And the ids in "items" do not overlap with the previous page

  @db
  Scenario: A role's shortlist can be read on its own
    When the employer sends a GET request to "hiring/jobs/{J02}/applications/paged?status=Shortlisted&page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "1"
    And every item in "items" has status equal to "Shortlisted"
    And the response field "items.0.workerId" is the id of worker 1

  @db
  Scenario: A role nobody has applied to reports an empty applicant list
    Given job "J01" has no applications
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"
    And the response field "totalPages" is "0"

  @db
  Scenario: A role with no shortlisted candidates reports an empty shortlist
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?status=Shortlisted&page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"

  @db
  Scenario: An unknown application status is rejected
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?status=Interviewing&page=1&pageSize=10"
    Then the response status code is 400
    And the response reports a validation error for "status"

  @db
  Scenario: Applicants of a job that does not exist are not served
    When the employer sends a GET request to "hiring/jobs/{missing}/applications/paged?page=1&pageSize=10"
    Then the response status code is 404
    And the response body contains the error "Job post not found"

  @db
  Scenario: Shortlisting an applicant is stored and notifies the worker
    When the employer shortlists the application of worker 2 on job "J01"
    Then the response status code is 200
    And the response field "status" is "Shortlisted"
    And the response field "workerId" is the id of worker 2
    And the application of worker 2 on job "J01" has status Shortlisted
    And worker 2 has a "Shortlisted" notification in the database

  @db
  Scenario: A shortlisted applicant shows up in the role's shortlist and counters
    When the employer shortlists the application of worker 2 on job "J01"
    Then the response status code is 200
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?status=Shortlisted&page=1&pageSize=10"
    Then the response field "totalCount" is "1"
    And the response field "items.0.workerId" is the id of worker 2
    When the employer sends a GET request to "hiring/jobs/{J01}"
    Then the response field "shortlistedCount" is "1"

  @db
  Scenario: A shortlisted applicant can be hired, and being hired is terminal
    When the employer hires the application of worker 1 on job "J02"
    Then the response status code is 200
    And the response field "status" is "Hired"
    And the application of worker 1 on job "J02" has status Hired
    And the worker has a "Hired" notification in the database
    When the employer rejects the application of worker 1 on job "J02"
    Then the response status code is 409
    And the response body contains the error "cannot move from Hired"
    And the application of worker 1 on job "J02" has status Hired

  @db
  Scenario: An applied candidate can be rejected, and rejection is terminal
    When the employer rejects the application of worker 2 on job "J01"
    Then the response status code is 200
    And the response field "status" is "Rejected"
    And the application of worker 2 on job "J01" has status Rejected
    And worker 2 has a "Rejected" notification in the database
    When the employer shortlists the application of worker 2 on job "J01"
    Then the response status code is 409
    And the application of worker 2 on job "J01" has status Rejected

  @db
  Scenario: A shortlisted candidate can also be rejected
    When the employer rejects the application of worker 1 on job "J02"
    Then the response status code is 200
    And the response field "status" is "Rejected"
    And the application of worker 1 on job "J02" has status Rejected

  @db
  Scenario Outline: Illegal status transitions are refused
    When the employer <decision> the application of worker 1 on job "<job>"
    Then the response status code is 409
    And the response body contains the error "cannot move from <current>"
    And the application of worker 1 on job "<job>" has status <current>

    Examples:
      | job | current     | decision   |
      | J01 | Applied     | hires      |
      | J02 | Shortlisted | shortlists |
      | J03 | Rejected    | shortlists |
      | J03 | Rejected    | hires      |
      | J03 | Rejected    | rejects    |
      | J04 | Hired       | shortlists |
      | J04 | Hired       | hires      |

  @db
  Scenario: A decision on an application that does not exist is refused
    When the employer sends a POST request to "hiring/jobs/{J01}/applications/{missing}/shortlist"
    Then the response status code is 404
    And the response body contains the error "Application not found"

  @db
  Scenario: A decision on an application that belongs to another role is refused
    When the employer sends a POST request to "hiring/jobs/{J05}/applications/{application:J01,worker 2}/shortlist"
    Then the response status code is 404
    And the application of worker 2 on job "J01" has status Applied

  @db
  Scenario: An employer's own applicant list is unaffected by another employer's decisions
    Given job "j90" has 1 applicants with status Applied
    When the rival employer sends a POST request to "hiring/jobs/{j90}/applications/{newest application:j90}/shortlist"
    Then the response status code is 200
    And the newest application on job "j90" has status Shortlisted
    When the employer sends a GET request to "hiring/jobs/{J01}/applications/paged?status=Shortlisted&page=1&pageSize=10"
    Then the response field "totalCount" is "0"
