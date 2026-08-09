@worker @saved_jobs
Feature: Saved jobs

  Converted from the Working_role jobs spec's "saves a job across the list, detail
  page, and reload" test, which also asserted that the saved-job item route
  supports only create and delete.

  Background:
    Given the mock data is in place
    And the worker has saved no jobs

  @db
  Scenario: A worker bookmarks a role and it is stored
    When the worker saves job "J01"
    Then the response status code is 204
    And the response body is empty
    And the worker has saved job "J01" in the database
    When the worker sends a GET request to "work/saved-jobs"
    Then the response status code is 200
    And the response list has 1 items
    And the response list contains the id of job "J01"

  @db
  Scenario: The saved list is paged and carries the full job
    When the worker saves job "J01"
    Then the response status code is 204
    When the worker saves job "J02"
    Then the response status code is 204
    When the worker sends a GET request to "work/saved-jobs/paged?page=1&pageSize=6"
    Then the response status code is 200
    And the response field "totalCount" is "2"
    And the response field "totalPages" is "1"
    And the response list "items" has 2 items
    And the response field "items.0.id" is the id of job "J02"
    And the response field "items.0.title" is "Delivery Partner 02"

  @db
  Scenario: Saving the same role twice does not duplicate the row
    When the worker saves job "J01"
    Then the response status code is 204
    When the worker saves job "J01"
    Then the response status code is 204
    And table "SavedJobs" has 1 rows

  @db
  Scenario: A saved role can be removed, and removing it twice is harmless
    Given the worker has saved job "J01"
    When the worker removes saved job "J01"
    Then the response status code is 204
    And the worker has not saved job "J01" in the database
    When the worker removes saved job "J01"
    Then the response status code is 204

  @db
  Scenario: A closed role cannot be saved
    Given job "J01" is closed
    When the worker saves job "J01"
    Then the response status code is 404
    And the response body contains the error "no longer active"
    And table "SavedJobs" is empty

  @db
  Scenario: A role that does not exist cannot be saved
    When the worker saves job "missing"
    Then the response status code is 404
    And table "SavedJobs" is empty

  @db
  Scenario: Saved roles are private to the worker who saved them
    Given the worker has saved job "J01"
    When worker 2 sends a GET request to "work/saved-jobs"
    Then the response status code is 200
    And the response list has 0 items
    When the worker sends a GET request to "work/saved-jobs"
    Then the response list has 1 items

  @db
  Scenario: The saved-job item route does not support replace
    Given the worker has saved job "J01"
    When the worker sends a PUT request to "work/saved-jobs/{J01}"
    Then the response status code is 405

  @db
  Scenario: Closing a saved role keeps the bookmark but hides the role from search
    Given the worker has saved job "J01"
    And job "J01" is closed
    When the worker sends a GET request to "work/saved-jobs"
    Then the response status code is 200
    And the response list has 1 items
    When the worker sends a GET request to "work/jobs/search?page=1&pageSize=20"
    Then the response list "items" does not contain the id of job "J01"
