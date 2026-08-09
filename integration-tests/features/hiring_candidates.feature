@hiring @candidates
Feature: Talent search, candidate detail, and saved candidates

  Converted from the Hiring_role candidates, candidate_detail and dashboard
  specs. Three of those browser tests were skipped whenever a real backend was
  used, so contact locking and cross-employer isolation had no real coverage at
  all; they are asserted here.

  Background:
    Given the mock data is in place

  @db
  Scenario: Talent search returns the employer's local candidates ten per page
    When the employer sends a GET request to "hiring/candidates/search?page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 10 items
    And the response field "page" is "1"
    And the response field "totalCount" is "12"
    And the response field "totalPages" is "2"
    And the ids in "items" are remembered
    When the employer sends a GET request to "hiring/candidates/search?page=2&pageSize=10"
    Then the response list "items" has 2 items
    And the ids in "items" do not overlap with the previous page
    And the response list "items" contains the id of worker 1

  @db
  Scenario: A deep-linked page is honoured
    Given 13 extra candidates exist
    When the employer sends a GET request to "hiring/candidates/search?page=3&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "25"
    And the response field "totalPages" is "3"
    And the response list "items" has 5 items

  @db
  Scenario: Nearby talent is ranked by distance and scored
    When the employer sends a GET request to "hiring/candidates/nearby?lat=12.978&lng=77.640"
    Then the response status code is 200
    And the response list has 12 items
    And the response field "0.distanceKm" is "0.0"
    And the response field "0.matchScore" is "99"

  @db
  Scenario: Talent outside the search radius is not treated as nearby
    Given a candidate exists with role "Store Associate" in area "Indiranagar"
    When the employer sends a GET request to "hiring/candidates/nearby?lat=28.6139&lng=77.2090"
    Then the response status code is 200
    And the response list has 0 items

  @db
  Scenario: A typed search term is applied server-side and ignores the radius
    When the employer sends a GET request to "hiring/candidates/search?search=Whitefield&page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "3"
    And every item in "items" has area equal to "Whitefield"

  @db
  Scenario: A role filter narrows the results to that exact role
    When the employer sends a GET request to "hiring/candidates/search?role=Store%20Associate&page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "2"
    And every item in "items" has role equal to "Store Associate"

  @db
  Scenario: A search that matches nobody returns an empty, counted page
    When the employer sends a GET request to "hiring/candidates/search?search=zzzzzzzznobodyhere&page=1&pageSize=10"
    Then the response status code is 200
    And the response list "items" has 0 items
    And the response field "totalCount" is "0"
    And the response field "totalPages" is "0"

  @db
  Scenario Outline: Coordinates must be supplied as a valid pair
    When the employer sends a GET request to "hiring/candidates/nearby?<query>"
    Then the response status code is 400
    And the response reports a validation error for "coordinates"

    Examples:
      | query                 |
      | lat=12.978            |
      | lng=77.640            |
      | lat=91.5&lng=77.640   |
      | lat=12.978&lng=181.2  |

  @db
  Scenario: A candidate who applied to one of the employer's roles is fully visible
    When the employer opens candidate worker 1
    Then the response status code is 200
    And the response field "hasApplied" is "true"
    And the response field "name" is "Demo Worker"
    And the response field "email" is "worker@localhire.test"
    And the response field "addressLine" is "1 Cross Street"
    And the response field "role" is "Store Associate"
    And the response field "experienceYears" is "4"
    And the response field "professionalSummary" is present
    And the response list "skills" has 2 items
    And the response list "languages" has 2 items
    And the response list "workHistory" has 1 items
    And the response list "educationHistory" has 1 items
    And the response list "credentials" has 1 items
    And the response field "workPreferences.availability" is "Immediately"

  @db
  Scenario: Browsing talent does not unlock contact details
    When the employer opens candidate worker 9
    Then the response status code is 200
    And the response field "hasApplied" is "false"
    And the response field "email" is null
    And the response field "addressLine" is null
    And the response field "credentials" is null
    And the response field "hasResume" is "false"
    And the response field "name" is present
    And the response field "area" is present

  @db
  Scenario: An application to another employer's role does not unlock contact details
    When the rival employer opens candidate worker 1
    Then the response status code is 200
    And the response field "hasApplied" is "false"
    And the response field "email" is null
    And the response field "addressLine" is null

  @db
  Scenario: Contact details unlock as soon as the candidate applies
    Given the worker has not applied to job "J01"
    And the employer has no jobs
    When the employer opens candidate worker 1
    Then the response field "hasApplied" is "false"
    And the response field "email" is null
    Given the employer has 1 extra open jobs
    When the worker sends a POST request to "work/jobs/{extra_jobs.0}/apply"
    Then the response status code is 201
    When the employer opens candidate worker 1
    Then the response field "hasApplied" is "true"
    And the response field "email" is "worker@localhire.test"

  @db
  Scenario: A candidate that does not exist is reported clearly
    When the employer opens candidate missing
    Then the response status code is 404
    And the response body contains the error "Candidate not found"

  @db
  Scenario: An employer is not a candidate
    When the employer sends a GET request to "hiring/candidates/{user:the rival employer}"
    Then the response status code is 404

  @db
  Scenario: Saving a candidate is stored against the employer account
    Given the employer has saved no candidates
    When the employer saves candidate worker 1
    Then the response status code is 204
    And the employer has saved candidate worker 1 in the database
    When the employer sends a GET request to "hiring/saved-candidates"
    Then the response status code is 200
    And the response list has 1 items
    When the employer sends a GET request to "hiring/saved-candidates/paged?page=1&pageSize=10"
    Then the response status code is 200
    And the response field "totalCount" is "1"
    And the response field "items.0.id" is the id of worker 1

  @db
  Scenario: Saving the same candidate twice does not duplicate the row
    Given the employer has saved no candidates
    When the employer saves candidate worker 1
    Then the response status code is 204
    When the employer saves candidate worker 1
    Then the response status code is 204
    And table "SavedCandidates" has 1 rows

  @db
  Scenario: A saved candidate can be removed
    Given the employer has saved candidate worker 1
    When the employer removes saved candidate worker 1
    Then the response status code is 204
    And the employer has not saved candidate worker 1 in the database
    When the employer removes saved candidate worker 1
    Then the response status code is 204

  @db
  Scenario: Saving a candidate who does not exist is refused
    When the employer saves candidate missing
    Then the response status code is 404
    And the response body contains the error "Candidate not found"
    And table "SavedCandidates" is empty

  @db
  Scenario: Saved candidates are private to the employer who saved them
    Given the employer has saved candidate worker 1
    When the rival employer sends a GET request to "hiring/saved-candidates"
    Then the response status code is 200
    And the response list has 0 items
    When the employer sends a GET request to "hiring/saved-candidates"
    Then the response list has 1 items
