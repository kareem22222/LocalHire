@profile
Feature: Profiles and location

  Converted from the Hiring_role and Working_role profile specs. Where the
  browser tests stopped at client-side validation, the same rule is asserted
  against the API, and every save is checked in PostgreSQL rather than trusting
  the response echo.

  Background:
    Given the mock data is in place

  @db
  Scenario: An employer profile exposes identity and location but no worker sections
    When the employer sends a GET request to "auth/me"
    Then the response status code is 200
    And the response matches
      """
      {
        "name": "Demo Employer",
        "email": "employer@localhire.test",
        "role": "Hiring",
        "phone": "9800000001",
        "addressLine": "1 Main Road",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "jobTitle": null,
        "professionalSummary": null,
        "experienceYears": null,
        "education": null,
        "skills": [],
        "languages": [],
        "workHistory": [],
        "educationHistory": [],
        "credentials": [],
        "resumeFileName": null,
        "isProfileComplete": true
      }
      """

  @db
  Scenario: A worker profile exposes every section of the data model
    When the worker sends a GET request to "auth/me"
    Then the response status code is 200
    And the response matches
      """
      {
        "name": "Demo Worker",
        "role": "LookingForWork",
        "jobTitle": "Store Associate",
        "experienceYears": 4,
        "education": "B.Com",
        "gender": "Female",
        "dateOfBirth": "1996-04-12",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "latitude": 12.978,
        "longitude": 77.64,
        "resumeFileName": "demo-worker-resume.pdf",
        "isProfileComplete": true,
        "workPreferences": { "availability": "Immediately", "travelRadiusKm": 15 }
      }
      """
    And the response list "workHistory" has 1 items
    And the response list "educationHistory" has 1 items
    And the response list "skillDetails" has 2 items
    And the response list "languageDetails" has 2 items
    And the response list "credentials" has 1 items
    And the response field "profileCompletionPercent" is present

  @db
  Scenario: An employer saves an address change and it is stored
    When the employer updates the profile
      """
      {
        "name": "Demo Employer",
        "phone": "9800000001",
        "addressLine": "42 Integration Lane",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038"
      }
      """
    Then the response status code is 200
    And the response field "addressLine" is "42 Integration Lane"
    And the response field "role" is "Hiring"
    And the stored profile field "AddressLine" for the employer is "42 Integration Lane"

  @db
  Scenario: The saved change is visible on the next read
    When the employer updates the profile
      """
      {
        "name": "Demo Employer",
        "addressLine": "7 Reload Road",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038"
      }
      """
    And the employer sends a GET request to "auth/me"
    Then the response status code is 200
    And the response field "addressLine" is "7 Reload Road"

  @db
  Scenario: A worker saves professional details and they are stored
    When the worker updates the profile
      """
      {
        "name": "Demo Worker",
        "phone": "9811100001",
        "cityArea": "Koramangala",
        "state": "Karnataka",
        "pincode": "560034",
        "jobTitle": "Cashier",
        "professionalSummary": "Five years on tills and stock control.",
        "experienceYears": 5,
        "education": "B.Com",
        "languages": ["English"],
        "workPreferences": {
          "desiredRoles": ["Cashier"],
          "employmentTypes": ["FullTime"],
          "shifts": ["Day"],
          "workModes": ["OnSite"],
          "expectedSalaryMin": 20000,
          "expectedSalaryMax": 30000,
          "salaryPeriod": "Monthly",
          "availability": "Immediately",
          "travelRadiusKm": 20
        }
      }
      """
    Then the response status code is 200
    And the response field "jobTitle" is "Cashier"
    And the response field "experienceYears" is "5"
    And the response field "workPreferences.travelRadiusKm" is "20"
    And the stored profile field "JobTitle" for the worker is "Cashier"

  @db
  Scenario: Worker-only fields are ignored for a hiring account
    When the employer updates the profile
      """
      {
        "name": "Demo Employer",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "jobTitle": "Store Associate",
        "experienceYears": 9,
        "professionalSummary": "This should not be stored for an employer."
      }
      """
    Then the response status code is 200
    And the response field "jobTitle" is null
    And the response field "experienceYears" is null
    And the response field "professionalSummary" is null

  @db
  Scenario Outline: A profile save is rejected and nothing changes
    When the worker updates the profile
      """
      {
        "name": "<name>",
        "phone": "<phone>",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "<pincode>",
        "experienceYears": <experienceYears>
      }
      """
    Then the response status code is 400
    And the response reports a validation error for "<field>"
    And the stored profile field "Name" for the worker is "Demo Worker"

    Examples:
      | name        | phone      | pincode | experienceYears | field           |
      |             | 9811100001 | 560038  | 4               | Name            |
      | Demo Worker | 9811100001 | 123     | 4               | Pincode         |
      | Demo Worker | 9811100001 | 560038  | 61              | ExperienceYears |
      | Demo Worker | abc        | 560038  | 4               | Phone           |

  @db
  Scenario: An inverted expected-salary range is rejected
    When the worker updates the profile
      """
      {
        "name": "Demo Worker",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "workPreferences": { "expectedSalaryMin": 50000, "expectedSalaryMax": 10000 }
      }
      """
    Then the response status code is 400
    And the response reports a validation error for "WorkPreferences"

  @db
  Scenario: A travel radius outside the allowed range is rejected
    When the worker updates the profile
      """
      {
        "name": "Demo Worker",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038",
        "workPreferences": { "travelRadiusKm": 501 }
      }
      """
    Then the response status code is 400
    And the response reports a validation error for "WorkPreferences.TravelRadiusKm"

  @db
  Scenario: A date of birth in the future is rejected
    When the worker updates the profile
      """
      {
        "name": "Demo Worker",
        "dateOfBirth": "2999-01-01",
        "cityArea": "Indiranagar",
        "state": "Karnataka",
        "pincode": "560038"
      }
      """
    Then the response status code is 400
    And the response reports a validation error for "DateOfBirth"

  @db
  Scenario: A worker updates their location and it is rounded and stamped
    When the worker updates the location to latitude 12.9876543 and longitude 77.6123456
    Then the response status code is 200
    And the response field "latitude" is "12.988"
    And the response field "longitude" is "77.612"
    And the response field "locationUpdatedAt" is present

  @db
  Scenario Outline: An invalid location is rejected
    When the worker updates the location to latitude <latitude> and longitude <longitude>
    Then the response status code is 400
    And the response reports a validation error for "<field>"

    Examples:
      | latitude | longitude | field     |
      | null     | 77.64     | Latitude  |
      | 12.978   | null      | Longitude |
      | 91.5     | 77.64     | Latitude  |
      | 12.978   | 181.5     | Longitude |

  @db
  Scenario: A profile cannot be updated without a session
    When anonymous sends a PUT request to "me/profile"
      """
      { "name": "Anonymous Edit" }
      """
    Then the response status code is 401
    And the stored profile field "Name" for the employer is "Demo Employer"
