@health
Feature: Service health and the per-scenario database rebuild

  Proves the suite is talking to a real stack, and that the guarantee every other
  feature relies on holds: each @db scenario starts from tables created from
  scratch and reseeded with the mock data.

  Scenario: The service reports that it is healthy
    When a client sends a GET request to "health" without a token
    Then the response status code is 200
    And the response field "service" is "LocalHire"
    And the response field "status" is "healthy"

  Scenario: The API reports a live PostgreSQL connection
    When a client sends a GET request to "health/database" without a token
    Then the response status code is 200
    And the response field "database" is "PostgreSQL"
    And the response field "status" is "connected"

  @db
  Scenario: A scenario starts from rebuilt tables holding exactly the mock data
    Given the mock data is in place
    Then the tables were rebuilt from scratch
    And table "Users" has 14 rows
    And table "JobPosts" has 19 rows
    And table "JobApplications" has 96 rows
    And table "Notifications" is empty
    And table "SavedCandidates" is empty
    And table "SavedJobs" is empty

  @db
  Scenario: Rows added by a scenario are visible to that scenario
    Given the mock data is in place
    And the employer has 3 extra open jobs
    And the employer has 2 unread notifications
    Then table "JobPosts" has 22 rows
    And table "Notifications" has 2 rows

  @db
  Scenario: The next scenario sees the baseline again, not the previous additions
    Given the mock data is in place
    Then table "JobPosts" has 19 rows
    And table "Notifications" is empty
