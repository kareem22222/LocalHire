"""The canonical mock data every ``@db`` scenario starts from.

Ids are fixed and readable, which keeps failures easy to diagnose and lets a
token minted once per run keep working after the schema is rebuilt: the same
user id is seeded again, so the ``sub`` claim still resolves.

Baseline (see integration-tests/README.md for the full table):

* employers ``E1`` (the account under test) and ``E2`` (a rival, for isolation)
* workers ``W01``..``W12``; ``W01`` has a fully populated profile and a resume
* 18 active jobs owned by ``E1`` (``J01`` oldest .. ``J18`` newest) and 1 owned by ``E2``
* jobs ``J01``..``J12`` each carry 8 applications: ``W01`` plus ``W02``..``W08``
* ``W01``'s status cycles Applied / Shortlisted / Rejected / Hired across those 12
* nothing saved, no notifications
"""

from datetime import timedelta
from decimal import Decimal

from features.utils.util import deterministic_id, utc_now

# --- Identity ------------------------------------------------------------

EMPLOYER_ID_PREFIX = "e0000000"
WORKER_ID_PREFIX = "d0000000"
JOB_ID_PREFIX = "c0000000"
APPLICATION_ID_PREFIX = "a0000000"
NOTIFICATION_ID_PREFIX = "b0000000"
SAVED_ID_PREFIX = "f0000000"

EMPLOYER_EMAIL = "employer@localhire.test"
RIVAL_EMPLOYER_EMAIL = "rival.employer@localhire.test"
WORKER_EMAIL = "worker@localhire.test"

HIRING = "Hiring"
LOOKING_FOR_WORK = "LookingForWork"

APPLICATION_STATUSES = ("Applied", "Shortlisted", "Rejected", "Hired")

# --- Location ------------------------------------------------------------
# Everything sits in one state and inside the API's 50 km "nearby" radius, so
# the state-default and radius filters behave predictably.
STATE = "Karnataka"
EMPLOYER_AREA = "Indiranagar"
EMPLOYER_PINCODE = "560038"
EMPLOYER_LATITUDE = 12.978
EMPLOYER_LONGITUDE = 77.640

WORKER_AREAS = (
    ("Indiranagar", "560038", 12.978, 77.640),
    ("Koramangala", "560034", 12.935, 77.624),
    ("Jayanagar", "560041", 12.925, 77.583),
    ("Whitefield", "560066", 12.970, 77.750),
)

JOB_ROLES = (
    ("Store Associate", "FullTime"),
    ("Delivery Partner", "PartTime"),
    ("Cashier", "FullTime"),
    ("Warehouse Picker", "Contract"),
    ("Office Assistant", "FullTime"),
    ("Customer Support Executive", "PartTime"),
)

# --- Counts --------------------------------------------------------------

EMPLOYER_JOB_COUNT = 18
RIVAL_EMPLOYER_JOB_COUNT = 1
WORKER_COUNT = 12
#: Jobs that receive applications. ``W01`` therefore has 12 applications.
JOBS_WITH_APPLICATIONS = 12
#: Extra applicants (``W02``..``W08``) added to each of those jobs.
EXTRA_APPLICANTS_PER_JOB = 7
APPLICANTS_PER_JOB = EXTRA_APPLICANTS_PER_JOB + 1

RESUME_FILE_NAME = "demo-worker-resume.pdf"


def employer_id(index=1):
    return deterministic_id(EMPLOYER_ID_PREFIX, index)


def worker_id(index):
    return deterministic_id(WORKER_ID_PREFIX, index)


def job_id(index):
    return deterministic_id(JOB_ID_PREFIX, index)


def application_id(index):
    return deterministic_id(APPLICATION_ID_PREFIX, index)


def notification_id(index):
    return deterministic_id(NOTIFICATION_ID_PREFIX, index)


def saved_id(index):
    return deterministic_id(SAVED_ID_PREFIX, index)


def worker_email(index):
    return WORKER_EMAIL if index == 1 else f"worker{index:03d}@localhire.test"


def worker_name(index):
    return "Demo Worker" if index == 1 else f"Test Worker {index:02d}"


def job_title(index):
    """``J01`` .. ``J18`` titles, rotating through the six roles."""
    role, _ = JOB_ROLES[(index - 1) % len(JOB_ROLES)]
    return f"{role} {index:02d}"


def job_employment_type(index):
    _, employment_type = JOB_ROLES[(index - 1) % len(JOB_ROLES)]
    return employment_type


def worker_job_title(index):
    role, _ = JOB_ROLES[(index - 1) % len(JOB_ROLES)]
    return role


def worker_area(index):
    return WORKER_AREAS[(index - 1) % len(WORKER_AREAS)]


def application_status(index):
    """Status of ``W01``'s application to ``J<index>``: 3 of each across 12 jobs."""
    return APPLICATION_STATUSES[(index - 1) % len(APPLICATION_STATUSES)]


#: Anchor for every seeded timestamp. Older ids are older rows, so "newest
#: first" ordering in the API matches descending index order.
BASE_TIME = utc_now() - timedelta(days=40)


def created_at(offset_minutes):
    return BASE_TIME + timedelta(minutes=offset_minutes)


WORKER_PREFERENCES = {
    "DesiredRoles": ["Store Associate", "Cashier"],
    "EmploymentTypes": ["FullTime", "PartTime"],
    "Shifts": ["Day", "Evening"],
    "WorkModes": ["OnSite"],
    "PreferredLocations": ["Indiranagar", "Koramangala"],
    "ExpectedSalaryMin": 18000,
    "ExpectedSalaryMax": 26000,
    "SalaryPeriod": "Monthly",
    "Availability": "Immediately",
    "NoticePeriodDays": 0,
    "TravelRadiusKm": 15,
    "WillingToRelocate": False,
    "CanWorkWeekends": True,
    "OwnsVehicle": True,
    "VehicleTypes": ["Two wheeler"],
}

WORK_HISTORY = [
    {
        "JobTitle": "Store Associate",
        "Employer": "Neighbourhood Mart",
        "Location": "Indiranagar",
        "StartDate": "2022-04-01",
        "EndDate": None,
        "IsCurrent": True,
        "Description": "Billing, stock rotation, and customer service.",
    }
]

EDUCATION_HISTORY = [
    {
        "Qualification": "B.Com",
        "Institution": "Bangalore University",
        "FieldOfStudy": "Commerce",
        "StartYear": 2016,
        "EndYear": 2019,
    }
]

SKILL_DETAILS = [
    {"Name": "Billing", "Proficiency": "Advanced", "YearsExperience": 4},
    {"Name": "Customer service", "Proficiency": "Advanced", "YearsExperience": 4},
]

LANGUAGE_DETAILS = [
    {"Name": "English", "Proficiency": "Fluent", "CanSpeak": True,
     "CanRead": True, "CanWrite": True},
    {"Name": "Kannada", "Proficiency": "Native", "CanSpeak": True,
     "CanRead": True, "CanWrite": False},
]

CREDENTIALS = [
    {
        "Name": "Food safety basics",
        "Issuer": "FSSAI",
        "IssueDate": "2023-06-01",
        "ExpiryDate": None,
        "CredentialId": "FSSAI-2023-0001",
        "Url": None,
    }
]

JOB_DEFAULTS = {
    "description": (
        "Serve walk-in customers, keep the floor stocked, and close the till at "
        "the end of the shift. Training is provided for the billing system."
    ),
    "salary_min": Decimal("18000"),
    "salary_max": Decimal("26000"),
    "salary_period": "Monthly",
    "min_education": "12th pass",
    "experience_min_years": 0,
    "experience_max_years": 5,
    "working_days": "Monday to Saturday",
    "shift_start_time": "09:00",
    "shift_end_time": "18:00",
    "openings": 2,
    "required_skills": ["Billing", "Customer service"],
    "languages": ["English", "Kannada"],
    "benefits": ["Provident fund", "Paid leave"],
}
