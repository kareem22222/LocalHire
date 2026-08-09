@hiring @hiring_jobs
Feature: Employer job postings

  Converted from the Hiring_role job_lifecycle, job_management, roles and
  dashboard specs. Creating, listing, paging, opening and editing a role are all
  asserted through the API, and each write is confirmed in PostgreSQL.

  Background:
    Given the mock data is in place

  @db
  Scenario: An employer publishes a role and it is stored against their account
    When the employer creates a job posting
      """
      {
        "title": "Evening Store Associate",
        "description": "Serve customers on the evening shift and cash up.",
        "workplaceName": "LocalHire Test Store 19",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "employmentType": "FullTime",
        "openings": 2,
        "salaryMin": 18000,
        "salaryMax": 26000,
        "salaryPeriod": "Monthly",
        "requiredSkills": ["Billing", "Customer service"]
      }
      """
    Then the response status code is 201
    And the response field "title" is "Evening Store Associate"
    And the response field "isActive" is "true"
    And the response field "applicationCount" is "0"
    And the response field "shortlistedCount" is "0"
    And the response field "openings" is "2"
    And the created job is stored with title "Evening Store Associate"
    And table "JobPosts" has 20 rows

  @db
  Scenario: A newly published role appears at the top of the open-roles list
    When the employer creates a job posting
      """
      {
        "title": "Newest Role",
        "description": "This must be the first item on page one.",
        "workplaceName": "LocalHire Test Store 20",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038"
      }
      """
    And the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
    Then the response status code is 200
    And the response field "items.0.title" is "Newest Role"
    And the response field "totalCount" is "19"
    And the response field "totalPages" is "2"

  @db
  Scenario: An employer edits a role and the change is persisted
    When the employer updates job "J01"
      """
      {
        "title": "Store Associate 01 (updated)",
        "description": "Updated description for the integration suite.",
        "workplaceName": "LocalHire Test Store 01",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "openings": 4
      }
      """
    Then the response status code is 200
    And the response field "id" is the id of job "J01"
    And the response field "title" is "Store Associate 01 (updated)"
    And the response field "openings" is "4"
    And the response field "applicationCount" is "8"
    And job "J01" is stored with title "Store Associate 01 (updated)"

  @db
  Scenario: Editing a role notifies everyone who applied to it
    Given the employer has 2 unread notifications
    When the employer updates job "J01"
      """
      {
        "title": "Store Associate 01 (revised)",
        "description": "Shift times have changed.",
        "workplaceName": "LocalHire Test Store 01",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038"
      }
      """
    Then the response status code is 200
    And table "Notifications" has 10 rows
    And the worker has a "JobUpdated" notification in the database

  @db
  Scenario Outline: A role cannot be published with invalid data
    When the employer creates a job posting
      """
      {
        "title": "<title>",
        "description": "<description>",
        "workplaceName": "<workplaceName>",
        "cityArea": "<cityArea>",
        "pincode": "<pincode>",
        "salaryMin": <salaryMin>,
        "salaryMax": <salaryMax>,
        "salaryPeriod": <salaryPeriod>,
        "experienceMinYears": <experienceMinYears>,
        "experienceMaxYears": <experienceMaxYears>,
        "openings": <openings>,
        "employmentType": <employmentType>
      }
      """
    Then the response status code is 400
    And the response reports a validation error for "<field>"
    And table "JobPosts" has 19 rows

    Examples: required fields
      | title | description | workplaceName | cityArea    | pincode | salaryMin | salaryMax | salaryPeriod | experienceMinYears | experienceMaxYears | openings | employmentType | field         |
      |       | A role      | The Store     | Indiranagar | 560038  | null      | null      | null         | null               | null               | null     | null           | Title         |
      | Role  |             | The Store     | Indiranagar | 560038  | null      | null      | null         | null               | null               | null     | null           | Description   |
      | Role  | A role      |               | Indiranagar | 560038  | null      | null      | null         | null               | null               | null     | null           | WorkplaceName |
      | Role  | A role      | The Store     |             | 560038  | null      | null      | null         | null               | null               | null     | null           | CityArea      |
      | Role  | A role      | The Store     | Indiranagar | 12345   | null      | null      | null         | null               | null               | null     | null           | Pincode       |

    Examples: cross-field rules
      | title | description | workplaceName | cityArea    | pincode | salaryMin | salaryMax | salaryPeriod | experienceMinYears | experienceMaxYears | openings | employmentType | field              |
      | Role  | A role      | The Store     | Indiranagar | 560038  | 30000     | 10000     | "Monthly"    | null               | null               | null     | null           | SalaryMax          |
      | Role  | A role      | The Store     | Indiranagar | 560038  | 18000     | 26000     | null         | null               | null               | null     | null           | SalaryPeriod       |
      | Role  | A role      | The Store     | Indiranagar | 560038  | null      | null      | null         | 5                  | 2                  | null     | null           | ExperienceMaxYears |
      | Role  | A role      | The Store     | Indiranagar | 560038  | null      | null      | null         | null               | null               | 0        | null           | Openings           |
      | Role  | A role      | The Store     | Indiranagar | 560038  | null      | null      | null         | null               | null               | 20000    | null           | Openings           |
      | Role  | A role      | The Store     | Indiranagar | 560038  | null      | null      | null         | null               | null               | null     | "Freelance"    | EmploymentType     |

  @db
  Scenario: The full job list is newest first and carries applicant counters
    When the employer sends a GET request to "hiring/jobs"
    Then the response status code is 200
    And the response list has 18 items
    And the response field "0.title" is "Customer Support Executive 18"
    And the response field "0.applicationCount" is "0"
    And the response field "17.title" is "Store Associate 01"
    And the response field "17.applicationCount" is "8"

  @db
  Scenario: Open roles are paged fifteen at a time
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
    Then the response status code is 200
    And the response list "items" has 15 items
    And the response field "page" is "1"
    And the response field "pageSize" is "15"
    And the response field "totalCount" is "18"
    And the response field "totalPages" is "2"
    And every item in "items" has isActive equal to "true"
    And the ids in "items" are remembered
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=2&pageSize=15"
    Then the response list "items" has 3 items
    And the ids in "items" do not overlap with the previous page
    And the response list "items" contains the id of job "J01"

  @db
  Scenario: Closed roles are listed separately from open ones
    Given job "J05" is closed
    And job "J06" is closed
    When the employer sends a GET request to "hiring/jobs/paged?status=closed&page=1&pageSize=15"
    Then the response status code is 200
    And the response field "totalCount" is "2"
    And every item in "items" has isActive equal to "false"
    And the response list "items" contains the id of job "J05"
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
    Then the response field "totalCount" is "16"
    And the response list "items" does not contain the id of job "J05"

  @db
  Scenario: The shortlist workspace only lists roles that have a shortlisted candidate
    When the employer sends a GET request to "hiring/jobs/paged?status=open&shortlistedOnly=true&page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "3"
    And the response field "totalPages" is "1"
    And the response list "items" contains the id of job "J02"
    And the response list "items" does not contain the id of job "J01"

  @db
  Scenario: The shortlist workspace pages when many roles have shortlisted candidates
    Given the application of worker 1 on job "J01" is Shortlisted
    And the application of worker 1 on job "J03" is Shortlisted
    And the application of worker 1 on job "J04" is Shortlisted
    And the application of worker 1 on job "J05" is Shortlisted
    And the application of worker 1 on job "J07" is Shortlisted
    And the application of worker 1 on job "J08" is Shortlisted
    When the employer sends a GET request to "hiring/jobs/paged?status=open&shortlistedOnly=true&page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "9"
    And the response field "totalPages" is "2"
    And the response list "items" has 6 items
    And every item in "items" has shortlistedCount equal to "1"

  @db
  Scenario: An employer opens one of their roles
    When the employer sends a GET request to "hiring/jobs/{J02}"
    Then the response status code is 200
    And the response field "id" is the id of job "J02"
    And the response field "title" is "Delivery Partner 02"
    And the response field "employmentType" is "PartTime"
    And the response field "applicationCount" is "8"
    And the response field "shortlistedCount" is "1"
    And the response field "salaryPeriod" is "Monthly"
    And the response list "requiredSkills" has 2 items
    And the response list "benefits" has 2 items

  @db
  Scenario: Opening a role that does not exist is reported clearly
    When the employer sends a GET request to "hiring/jobs/{missing}"
    Then the response status code is 404
    And the response body contains the error "Job post not found"

  @db
  Scenario Outline: Paging input is validated
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=<page>&pageSize=<pageSize>"
    Then the response status code is 400
    And the response reports a validation error for "<field>"

    Examples:
      | page | pageSize | field    |
      | 0    | 15       | page     |
      | -1   | 15       | page     |
      | 1    | 0        | pageSize |
      | 1    | 101      | pageSize |

  @db
  Scenario: An unknown status filter is rejected
    When the employer sends a GET request to "hiring/jobs/paged?status=archived&page=1&pageSize=15"
    Then the response status code is 400
    And the response reports a validation error for "status"

  @db
  Scenario: An employer with no roles gets an empty, well-formed page
    Given the employer has no jobs
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"
    And the response field "totalPages" is "0"
