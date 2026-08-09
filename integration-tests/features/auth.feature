@auth
Feature: Registration, sign-in, and identity

  Converted from the Hiring_role and Working_role authentication and
  access-control browser specs. The browser assertions about dialogs and focus
  traps have no server-side meaning; what mattered - who gets a session, who is
  refused, and what the refusal says - is asserted here against the real API.

  @db
  Scenario: An employer signs in with the correct password
    Given the mock data is in place
    When a client signs in as the employer with the correct password
    Then the response status code is 200
    And the response field "token" is present

  @db
  Scenario: A worker signs in with the correct password
    Given the mock data is in place
    When a client signs in as the worker with the correct password
    Then the response status code is 200
    And the response field "token" is present

  @db
  Scenario: The signed-in employer reads their own identity
    Given the mock data is in place
    When the employer sends a GET request to "auth/me"
    Then the response status code is 200
    And the response field "name" is "Demo Employer"
    And the response field "email" is "employer@localhire.test"
    And the response field "role" is "Hiring"

  @db
  Scenario: The signed-in worker reads their own identity
    Given the mock data is in place
    When the worker sends a GET request to "auth/me"
    Then the response status code is 200
    And the response field "name" is "Demo Worker"
    And the response field "role" is "LookingForWork"
    And the response field "isProfileComplete" is "true"

  @db
  Scenario: A wrong password is refused
    Given the mock data is in place
    When a client signs in with email "employer@localhire.test", password "WrongPassword1!" and role "Hiring"
    Then the response status code is 401
    And the response body contains the error "Invalid email, password, or role"

  @db
  Scenario: An unknown email is refused with the same message as a wrong password
    Given the mock data is in place
    When a client signs in with email "nobody@localhire.test", password "LocalHire1!" and role "Hiring"
    Then the response status code is 401
    And the response body contains the error "Invalid email, password, or role"

  @db
  Scenario: Signing in with the wrong role for an existing account is refused
    Given the mock data is in place
    When a client signs in with email "employer@localhire.test", password "LocalHire1!" and role "LookingForWork"
    Then the response status code is 401

  @db
  Scenario Outline: Sign-in input is validated before any credential check
    Given the mock data is in place
    When a client signs in with email "<email>", password "<password>" and role "<role>"
    Then the response status code is 400
    And the response reports a validation error for "<field>"

    Examples:
      | email                     | password     | role           | field    |
      | not-an-email              | LocalHire1!  | Hiring         | Email    |
      |                           | LocalHire1!  | Hiring         | Email    |
      | employer@localhire.test   |              | Hiring         | Password |
      | employer@localhire.test   | LocalHire1!  |                | Role     |
      | employer@localhire.test   | LocalHire1!  | Manager        | Role     |

  @db
  Scenario: A new worker account is created and stored
    Given the mock data is in place
    When a client registers with name "Fresh Worker", email "fresh.worker@localhire.test", password "LocalHire1!" and role "LookingForWork"
    Then the response status code is 201
    And the response field "token" is present
    And table "Users" has 15 rows

  @db
  Scenario: Registering an email and role that already exist is refused
    Given the mock data is in place
    When a client registers with name "Copy Cat", email "employer@localhire.test", password "LocalHire1!" and role "Hiring"
    Then the response status code is 409
    And the response body contains the error "already exists"
    And table "Users" has 14 rows

  @db
  Scenario: The same email may be used once per role
    Given the mock data is in place
    When a client registers with name "Demo Employer As Worker", email "employer@localhire.test", password "LocalHire1!" and role "LookingForWork"
    Then the response status code is 201
    And table "Users" has 15 rows

  @db
  Scenario Outline: Registration input is validated
    Given the mock data is in place
    When a client registers with name "<name>", email "<email>", password "<password>" and role "<role>"
    Then the response status code is 400
    And the response reports a validation error for "<field>"
    And table "Users" has 14 rows

    Examples:
      | name       | email                     | password     | role           | field    |
      |            | new@localhire.test        | LocalHire1!  | Hiring         | Name     |
      | New User   | not-an-email              | LocalHire1!  | Hiring         | Email    |
      | New User   | new@localhire.test        | short1!      | Hiring         | Password |
      | New User   | new@localhire.test        | localhire1!  | Hiring         | Password |
      | New User   | new@localhire.test        | LOCALHIRE1!  | Hiring         | Password |
      | New User   | new@localhire.test        | LocalHirePwd | Hiring         | Password |
      | New User   | new@localhire.test        | LocalHire11  | Hiring         | Password |
      | New User   | new@localhire.test        | LocalHire1!  | Supervisor     | Role     |

  Scenario: A request without a token is rejected
    When a client sends a GET request to "auth/me" without a token
    Then the response status code is 401

  @db
  Scenario: A structurally invalid token is rejected
    Given the mock data is in place
    When invalid sends a GET request to "auth/me"
    Then the response status code is 401

  @db @jwt_secret
  Scenario: A correctly signed but expired token is rejected
    Given the mock data is in place
    When expired sends a GET request to "auth/me"
    Then the response status code is 401

  @db @rate_limit
  Scenario: Repeated sign-in attempts are rate limited
    Given the mock data is in place
    When a client sends enough sign-in attempts to exhaust the rate limit
    Then the response status code is 429
