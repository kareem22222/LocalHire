@notifications
Feature: Notification centre

  Converted from the Hiring_role and Working_role notification specs. Those tests
  had to stub the whole feed because nothing seeded notifications; here the feed
  is either seeded directly or produced as a real side effect of applying and
  shortlisting.

  Background:
    Given the mock data is in place

  @db
  Scenario: An empty feed is reported as empty
    When the employer sends a GET request to "notifications"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "unreadCount" is "0"

  @db
  Scenario: The feed carries the unread count alongside the items
    Given the employer has 3 unread notifications
    And the employer has 2 read notifications
    When the employer sends a GET request to "notifications"
    Then the response status code is 200
    And the response list "items" has 5 items
    And the response field "unreadCount" is "3"

  @db
  Scenario: The paged feed partitions read and unread strictly
    Given the employer has 3 unread notifications
    And the employer has 2 read notifications
    When the employer sends a GET request to "notifications/paged?status=all&page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "5"
    And the response field "unreadCount" is "3"
    And the response field "readCount" is "2"
    When the employer sends a GET request to "notifications/paged?status=unread&page=1&pageSize=10"
    Then the response field "totalCount" is "3"
    And every item in "items" has isRead equal to "false"
    When the employer sends a GET request to "notifications/paged?status=read&page=1&pageSize=10"
    Then the response field "totalCount" is "2"
    And every item in "items" has isRead equal to "true"

  @db
  Scenario: History is paged ten at a time
    Given the employer has 25 unread notifications
    When the employer sends a GET request to "notifications/paged?status=unread&page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 10 items
    And the response field "totalCount" is "25"
    And the response field "totalPages" is "3"
    And the ids in "items" are remembered
    When the employer sends a GET request to "notifications/paged?status=unread&page=3&pageSize=10"
    Then the response list "items" has 5 items
    And the ids in "items" do not overlap with the previous page
    When the employer sends a GET request to "notifications/paged?status=unread&page=1&pageSize=5"
    Then the response list "items" has 5 items
    And the response field "totalCount" is "25"
    And the response field "totalPages" is "5"

  @db
  Scenario: Newest notifications come first
    Given the employer has 5 unread notifications
    When the employer sends a GET request to "notifications/paged?status=all&page=1&pageSize=10"
    Then the response status code is 200
    And the items in "items" are ordered by "createdAt" descending

  @db
  Scenario: Marking one notification read moves only that one
    Given the employer has 3 unread notifications
    When the employer marks the oldest notification as read
    Then the response status code is 200
    And the response field "isRead" is "true"
    And the response field "readAt" is present
    And the employer has 2 unread and 1 read notifications in the database
    When the employer sends a GET request to "notifications"
    Then the response field "unreadCount" is "2"

  @db
  Scenario: Marking an already read notification again is harmless
    Given the employer has 1 read notifications
    When the employer marks the oldest notification as read
    Then the response status code is 200
    And the response field "isRead" is "true"
    And the employer has 0 unread and 1 read notifications in the database

  @db
  Scenario: Marking everything read clears the unread feed
    Given the employer has 3 unread notifications
    When the employer marks every notification as read
    Then the response status code is 204
    And the employer has 0 unread and 3 read notifications in the database
    When the employer sends a GET request to "notifications/paged?status=unread&page=1&pageSize=10"
    Then the response field "totalCount" is "0"
    And the response field "unreadCount" is "0"
    When the employer sends a GET request to "notifications/paged?status=read&page=1&pageSize=10"
    Then the response field "totalCount" is "3"

  @db
  Scenario: One account cannot read or clear another account's feed
    Given the employer has 2 unread notifications
    And the worker has 1 unread notifications
    When the worker marks every notification as read
    Then the response status code is 204
    And the employer has 2 unread and 0 read notifications in the database
    And the worker has 0 unread and 1 read notifications in the database

  @db
  Scenario: A notification belonging to someone else cannot be marked read
    Given the employer has 1 unread notifications
    When the worker marks notification "the employer notifications.0" as read
    Then the response status code is 404
    And the employer has 1 unread and 0 read notifications in the database

  @db
  Scenario: An unknown status filter is rejected
    When the employer sends a GET request to "notifications/paged?status=archived&page=1&pageSize=10"
    Then the response status code is 400
    And the response reports a validation error for "status"

  @db
  Scenario Outline: Paging input is validated
    When the employer sends a GET request to "notifications/paged?page=<page>&pageSize=<pageSize>"
    Then the response status code is 400
    And the response reports a validation error for "<field>"

    Examples:
      | page | pageSize | field    |
      | 0    | 10       | page     |
      | 1    | 0        | pageSize |
      | 1    | 101      | pageSize |

  @db
  Scenario: Applying produces a real notification for the employer
    Given the employer has no notifications
    When the worker applies to job "J13"
    Then the response status code is 201
    When the employer sends a GET request to "notifications"
    Then the response status code is 200
    And the response list "items" has 1 items
    And the response field "unreadCount" is "1"
    And the response field "items.0.type" is "NewApplication"
    And the response field "items.0.title" is "New application received"
    And the response field "items.0.link" is present

  @db
  Scenario: Being shortlisted produces a real notification the worker can follow
    Given the worker has no notifications
    When the employer shortlists the application of worker 1 on job "J01"
    Then the response status code is 200
    When the worker sends a GET request to "notifications"
    Then the response status code is 200
    And the response list "items" has 1 items
    And the response field "items.0.type" is "Shortlisted"
    And the response field "items.0.title" is "You were shortlisted"
    And the response field "items.0.isRead" is "false"
    When the worker marks the oldest notification as read
    Then the response status code is 200
    And the response field "isRead" is "true"
    And the worker has 0 unread and 1 read notifications in the database

  @db
  Scenario: A hiring decision notifies the worker of the outcome
    Given the worker has no notifications
    When the employer hires the application of worker 1 on job "J02"
    Then the response status code is 200
    When the worker sends a GET request to "notifications"
    Then the response field "items.0.type" is "Hired"
    And the response field "items.0.title" is "You were hired"

  @db
  Scenario: A rejection notifies the worker without naming a decision maker
    Given the worker has no notifications
    When the employer rejects the application of worker 1 on job "J01"
    Then the response status code is 200
    When the worker sends a GET request to "notifications"
    Then the response field "items.0.type" is "Rejected"
    And the response field "items.0.title" is "Application update"

  @db
  Scenario: Notifications require a session
    When a client sends a GET request to "notifications" without a token
    Then the response status code is 401
