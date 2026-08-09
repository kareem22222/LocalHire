@dashboards
Feature: Dashboard and menu data loads

  Converted from the Hiring_role dashboard/roles and Working_role dashboard specs.
  The browser tests walked the menu and asserted that each destination rendered;
  what is testable below the UI is that every destination's data load succeeds and
  returns the right shape for that role.

  Background:
    Given the mock data is in place

  @db
  Scenario: The employer dashboard loads its own roles, nearby talent, and feed
    When the employer sends a GET request to "hiring/jobs"
    Then the response status code is 200
    And the response list has 18 items
    And the response field "0.applicationCount" is present
    And the response field "0.shortlistedCount" is present
    When the employer sends a GET request to "hiring/candidates/nearby?lat=12.978&lng=77.640"
    Then the response status code is 200
    And the response list has 12 items
    And the response field "0.matchScore" is present
    When the employer sends a GET request to "notifications"
    Then the response status code is 200
    And the response field "unreadCount" is "0"

  @db
  Scenario: Dashboard talent filters carry through to the full talent list
    When the employer sends a GET request to "hiring/candidates/nearby?search=Koramangala&role=Delivery%20Partner"
    Then the response status code is 200
    And the response list has 1 items
    And the response field "0.role" is "Delivery Partner"
    And the response field "0.area" is "Koramangala"
    When the employer sends a GET request to "hiring/candidates/search?search=Koramangala&role=Delivery%20Partner&page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "1"
    And the response field "items.0.area" is "Koramangala"

  @db
  Scenario: Every employer menu destination loads
    When the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
    Then the response status code is 200
    When the employer sends a GET request to "hiring/candidates/search?page=1&pageSize=10"
    Then the response status code is 200
    When the employer sends a GET request to "hiring/saved-candidates"
    Then the response status code is 200
    When the employer sends a GET request to "hiring/jobs/paged?status=open&shortlistedOnly=true&page=1&pageSize=6"
    Then the response status code is 200
    When the employer sends a GET request to "hiring/candidates/nearby"
    Then the response status code is 200
    When the employer sends a GET request to "auth/me"
    Then the response status code is 200

  @db
  Scenario: The worker dashboard loads profile strength, nearby roles, and applications
    When the worker sends a GET request to "auth/me"
    Then the response status code is 200
    And the response field "isProfileComplete" is "true"
    And the response field "profileCompletionPercent" is present
    When the worker sends a GET request to "work/jobs/nearby?lat=12.978&lng=77.640"
    Then the response status code is 200
    And the response list has 19 items
    When the worker sends a GET request to "work/applications"
    Then the response status code is 200
    And the response list has 12 items

  @db
  Scenario: The worker can narrow nearby roles by text and employment type
    When the worker sends a GET request to "work/jobs/nearby?lat=12.978&lng=77.640&search=Store&employmentType=FullTime"
    Then the response status code is 200
    And every item in the response list has employmentType equal to "FullTime"
    # "Store" matches every workplace name, so this is every FullTime role
    # (9 of the employer's own plus the rival employer's one).
    And the response list has 10 items
    When the worker sends a GET request to "work/jobs/nearby?lat=12.978&lng=77.640&search=Delivery"
    Then the response status code is 200
    And the response list has 3 items

  @db
  Scenario: Every worker menu destination loads
    When the worker sends a GET request to "work/jobs/search?page=1&pageSize=6"
    Then the response status code is 200
    When the worker sends a GET request to "work/applications/paged?page=1&pageSize=6"
    Then the response status code is 200
    When the worker sends a GET request to "work/saved-jobs"
    Then the response status code is 200
    When the worker sends a GET request to "work/saved-jobs/paged?page=1&pageSize=6"
    Then the response status code is 200
    When the worker sends a GET request to "notifications/paged?status=all&page=1&pageSize=10"
    Then the response status code is 200
    When the worker sends a GET request to "auth/me"
    Then the response status code is 200

  @db
  Scenario: An incomplete worker profile is reported as incomplete
    Given the mock data is in place
    When the worker updates the profile
      """
      { "name": "Demo Worker" }
      """
    Then the response status code is 200
    And the response field "isProfileComplete" is "false"
    When the worker sends a GET request to "auth/me"
    Then the response field "isProfileComplete" is "false"
