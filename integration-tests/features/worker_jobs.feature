@worker @worker_jobs
Feature: Job discovery for a worker

  Converted from the Working_role jobs and dashboard specs. Two of those tests
  had to stub the search endpoint to get deterministic paging maths; here the
  data is seeded instead, so the real query, ordering and filters are exercised.

  Background:
    Given the mock data is in place

  @db
  Scenario: All open roles are paged six at a time, newest first
    When the worker sends a GET request to "work/jobs/search?page=1&pageSize=6"
    Then the response status code is 200
    And the response list "items" has 6 items
    And the response field "page" is "1"
    And the response field "pageSize" is "6"
    And the response field "totalCount" is "19"
    And the response field "totalPages" is "4"
    And the response field "items.0.title" is "Customer Support Executive 18"
    And every item in "items" has isActive equal to "true"
    And the ids in "items" are remembered
    When the worker sends a GET request to "work/jobs/search?page=2&pageSize=6"
    Then the response list "items" has 6 items
    And the ids in "items" do not overlap with the previous page

  @db
  Scenario: A deep-linked last page returns only the remainder
    When the worker sends a GET request to "work/jobs/search?page=4&pageSize=6"
    Then the response status code is 200
    And the response list "items" has 1 items
    And the response field "page" is "4"
    And the response field "totalCount" is "19"

  @db
  Scenario: Closed roles disappear from search
    Given job "J18" is closed
    When the worker sends a GET request to "work/jobs/search?page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "18"
    And the response list "items" does not contain the id of job "J18"

  @db
  Scenario Outline: The employment-type filter is applied server-side
    When the worker sends a GET request to "work/jobs/search?employmentType=<employmentType>&page=1&pageSize=20"
    Then the response status code is 200
    And the response field "totalCount" is "<total>"
    And the response list "items" has <total> items
    And every item in "items" has employmentType equal to "<employmentType>"

    Examples:
      | employmentType | total |
      | PartTime       | 6     |
      | Contract       | 3     |

  @db
  Scenario: An employment type nobody posted returns nothing
    When the worker sends a GET request to "work/jobs/search?employmentType=Temporary&page=1&pageSize=20"
    Then the response status code is 200
    And the response field "totalCount" is "0"
    And the response list "items" has 0 items

  @db
  Scenario: A free-text search matches the title, workplace, area, and pincode
    When the worker sends a GET request to "work/jobs/search?search=Delivery&page=1&pageSize=20"
    Then the response status code is 200
    And the response field "totalCount" is "3"
    And every item in "items" has employmentType equal to "PartTime"
    When the worker sends a GET request to "work/jobs/search?search=560038&page=1&pageSize=20"
    Then the response field "totalCount" is "19"

  @db
  Scenario: Search and employment type combine
    When the worker sends a GET request to "work/jobs/search?search=Delivery&employmentType=FullTime&page=1&pageSize=20"
    Then the response status code is 200
    And the response field "totalCount" is "0"

  @db
  Scenario: A search that matches no role returns an empty, counted page
    When the worker sends a GET request to "work/jobs/search?search=zzzzzzzznosuchrole&page=1&pageSize=6"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"
    And the response field "totalPages" is "0"

  @db
  Scenario: Nearby roles are ranked by distance
    When the worker sends a GET request to "work/jobs/nearby?lat=12.978&lng=77.640"
    Then the response status code is 200
    And the response list has 19 items

  @db
  Scenario: Roles beyond the radius are not nearby
    When the worker sends a GET request to "work/jobs/nearby?lat=28.6139&lng=77.2090"
    Then the response status code is 200
    And the response list has 0 items

  @db
  Scenario Outline: Coordinates must be supplied as a valid pair
    When the worker sends a GET request to "work/jobs/nearby?<query>"
    Then the response status code is 400
    And the response reports a validation error for "coordinates"

    Examples:
      | query                |
      | lat=12.978           |
      | lng=77.640           |
      | lat=-91&lng=77.640   |
      | lat=12.978&lng=-181  |

  @db
  Scenario: A job detail page carries the complete posting
    When the worker opens job "J01"
    Then the response status code is 200
    And the response field "id" is the id of job "J01"
    And the response field "title" is "Store Associate 01"
    And the response field "workplaceName" is "LocalHire Test Store 01"
    And the response field "cityArea" is "Indiranagar"
    And the response field "state" is "Karnataka"
    And the response field "pincode" is "560038"
    And the response field "employmentType" is "FullTime"
    And the response field "salaryMin" is "18000"
    And the response field "salaryMax" is "26000"
    And the response field "salaryPeriod" is "Monthly"
    And the response field "minEducation" is "12th pass"
    And the response field "workingDays" is "Monday to Saturday"
    And the response field "shiftStartTime" is "09:00"
    And the response field "shiftEndTime" is "18:00"
    And the response field "openings" is "2"
    And the response field "applicationCount" is "8"
    And the response list "requiredSkills" has 2 items
    And the response list "languages" has 2 items
    And the response list "benefits" has 2 items

  @db
  Scenario: A closed role is no longer available to a worker
    Given job "J01" is closed
    When the worker opens job "J01"
    Then the response status code is 404
    And the response body contains the error "no longer active"

  @db
  Scenario: A role that never existed is reported clearly
    When the worker opens job "missing"
    Then the response status code is 404

  @db
  Scenario Outline: Paging input is validated
    When the worker sends a GET request to "work/jobs/search?page=<page>&pageSize=<pageSize>"
    Then the response status code is 400
    And the response reports a validation error for "<field>"

    Examples:
      | page | pageSize | field    |
      | 0    | 6        | page     |
      | 1    | 0        | pageSize |
      | 1    | 500      | pageSize |
