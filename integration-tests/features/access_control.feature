@access_control
Feature: Role and ownership isolation

  Converted from the Hiring_role and Working_role access-control specs. The
  browser tests could only observe that a page showed no data; here the refusal
  itself is asserted, for every protected endpoint and for cross-account reads.

  Background:
    Given the mock data is in place

  @db
  Scenario Outline: A worker token cannot reach employer data
    When the worker sends a GET request to "<path>"
    Then the response status code is 403

    Examples:
      | path                                          |
      | hiring/jobs                                   |
      | hiring/jobs/paged?status=open&page=1&pageSize=15 |
      | hiring/jobs/paged?status=open&shortlistedOnly=true&page=1&pageSize=6 |
      | hiring/candidates/nearby                      |
      | hiring/candidates/search?page=1&pageSize=10   |
      | hiring/saved-candidates                       |
      | hiring/saved-candidates/paged?page=1&pageSize=10 |

  @db
  Scenario: A worker cannot open an employer's job, even one that does not exist
    When the worker sends a GET request to "hiring/jobs/{missing}"
    Then the response status code is 403

  @db
  Scenario: A worker cannot create a job posting
    When the worker sends a POST request to "hiring/jobs"
      """
      {
        "title": "Sneaky Role",
        "description": "A worker should not be able to post this.",
        "workplaceName": "Nowhere",
        "cityArea": "Indiranagar"
      }
      """
    Then the response status code is 403
    And table "JobPosts" has 19 rows

  @db
  Scenario: A worker cannot decide on an application
    When the worker sends a POST request to "hiring/jobs/{J01}/applications/{application:J01,worker 2}/shortlist"
    Then the response status code is 403
    And the application of worker 2 on job "J01" has status Applied

  @db
  Scenario Outline: An employer token cannot reach worker data
    When the employer sends a GET request to "<path>"
    Then the response status code is 403

    Examples:
      | path                                        |
      | work/jobs/nearby                            |
      | work/jobs/search?page=1&pageSize=6          |
      | work/applications                           |
      | work/applications/paged?page=1&pageSize=6   |
      | work/saved-jobs                             |
      | work/saved-jobs/paged?page=1&pageSize=6     |

  @db
  Scenario: An employer cannot apply to a job
    When the employer sends a POST request to "work/jobs/{J01}/apply"
    Then the response status code is 403
    And table "JobApplications" has 96 rows

  @db
  Scenario: An employer cannot read their own resume through the worker endpoint
    When the employer sends a GET request to "me/resume"
    Then the response status code is 403

  @db
  Scenario Outline: Protected endpoints refuse anonymous callers
    When a client sends a GET request to "<path>" without a token
    Then the response status code is 401

    Examples:
      | path                                      |
      | auth/me                                   |
      | me/resume                                 |
      | hiring/jobs                               |
      | hiring/candidates/search?page=1&pageSize=10 |
      | work/jobs/search?page=1&pageSize=6        |
      | work/applications                         |
      | notifications                             |

  @db
  Scenario Outline: An unusable token is refused everywhere
    When invalid sends a GET request to "<path>"
    Then the response status code is 401

    Examples:
      | path              |
      | auth/me           |
      | hiring/jobs       |
      | work/applications |
      | notifications     |

  @db
  Scenario: An employer cannot read another employer's job
    When the employer sends a GET request to "hiring/jobs/{j90}"
    Then the response status code is 404
    And the response body contains the error "Job post not found"

  @db
  Scenario: An employer cannot read the applicants of another employer's job
    When the employer sends a GET request to "hiring/jobs/{j90}/applications"
    Then the response status code is 404

  @db
  Scenario: An employer cannot update another employer's job
    When the employer updates job "j90"
      """
      {
        "title": "Hijacked Role",
        "description": "This update must not be applied.",
        "workplaceName": "Rival Retail",
        "cityArea": "Indiranagar"
      }
      """
    Then the response status code is 404
    And job "j90" is stored with title "Rival Store Associate"

  @db
  Scenario: An employer's own job list never contains another employer's jobs
    When the employer sends a GET request to "hiring/jobs"
    Then the response status code is 200
    And the response list has 18 items
    And the response list does not contain the id of job "j90"

  @db
  Scenario: A decision on another employer's application is refused
    Given job "j90" has 1 applicants with status Applied
    When the employer sends a POST request to "hiring/jobs/{j90}/applications/{newest application:j90}/shortlist"
    Then the response status code is 404
    And the newest application on job "j90" has status Applied

  @db
  Scenario: An unmapped path under /api carries no data
    When the employer sends a GET request to "hiring/saved-candidates/{worker:worker 1}"
    Then the response is the single-page app shell rather than API data

  @db
  Scenario: An unsupported method on the saved-candidate item route is rejected
    When the employer sends a PUT request to "hiring/saved-candidates/{worker:worker 1}"
    Then the response status code is 405
