"""Creates the mock data for a scenario and lets steps extend it.

``initialize_test_data`` runs after the schema has been rebuilt, so every
scenario sees exactly the same starting rows. The ``add_*`` helpers let a
scenario shape the data it needs (more jobs, more applicants, notifications,
saved items) without touching the baseline.

Rows are written straight to PostgreSQL because that is the only way to arrange
states the API cannot produce on demand (a rival employer's job, an applicant
whose status is already Hired, 25 notifications). Every write is followed by a
cache clear at the layer level, so the API cannot answer from a stale cache.
"""

import bcrypt

from features.db_models.job_application import JobApplication
from features.db_models.job_post import JobPost
from features.db_models.notification import Notification
from features.db_models.saved_candidate import SavedCandidate
from features.db_models.saved_job import SavedJob
from features.db_models.user import User
from features.utils import data_dict as data
from features.utils.util import new_id


class TestDataManager:
    #: bcrypt at work factor 12 costs ~0.3 s, so the shared password is hashed
    #: once per process and reused for every seeded account.
    __password_hash_cache = {}

    def __init__(self, context):
        self.__context = context
        self.password = context.test_password
        self.employer_id = data.employer_id(1)
        self.rival_employer_id = data.employer_id(2)
        self.worker_ids = [data.worker_id(index)
                           for index in range(1, data.WORKER_COUNT + 1)]
        self.job_ids = [data.job_id(index)
                        for index in range(1, data.EMPLOYER_JOB_COUNT + 1)]
        self.rival_job_id = data.job_id(90)
        self.__sequence = 1000

    # --- Lifecycle -------------------------------------------------------

    def initialize_test_data(self):
        """Insert the baseline rows into an empty schema."""
        self.__insert_users()
        self.__insert_jobs()
        self.__insert_applications()

    def destroy_test_data(self):
        """Delete every seeded row (child tables first)."""
        context = self.__context
        context.notification_repository.delete_all()
        context.saved_candidate_repository.delete_all()
        context.saved_job_repository.delete_all()
        context.job_application_repository.delete_all()
        context.job_post_repository.delete_all()
        context.user_repository.delete_all()

    # --- Baseline --------------------------------------------------------

    def __insert_users(self):
        password_hash = self.password_hash()
        users = [
            User(
                id=self.employer_id,
                name="Demo Employer",
                email=data.EMPLOYER_EMAIL,
                password_hash=password_hash,
                role=data.HIRING,
                created_at=data.created_at(0),
                phone="9800000001",
                address_line="1 Main Road",
                city_area=data.EMPLOYER_AREA,
                state=data.STATE,
                pincode=data.EMPLOYER_PINCODE,
                latitude=data.EMPLOYER_LATITUDE,
                longitude=data.EMPLOYER_LONGITUDE,
                location_updated_at=data.created_at(0),
            ),
            User(
                id=self.rival_employer_id,
                name="Rival Employer",
                email=data.RIVAL_EMPLOYER_EMAIL,
                password_hash=password_hash,
                role=data.HIRING,
                created_at=data.created_at(1),
                phone="9800000002",
                address_line="2 Main Road",
                city_area=data.EMPLOYER_AREA,
                state=data.STATE,
                pincode=data.EMPLOYER_PINCODE,
                latitude=data.EMPLOYER_LATITUDE,
                longitude=data.EMPLOYER_LONGITUDE,
                location_updated_at=data.created_at(1),
            ),
        ]

        for index in range(1, data.WORKER_COUNT + 1):
            area, pincode, latitude, longitude = data.worker_area(index)
            users.append(User(
                id=data.worker_id(index),
                name=data.worker_name(index),
                email=data.worker_email(index),
                password_hash=password_hash,
                role=data.LOOKING_FOR_WORK,
                created_at=data.created_at(10 + index),
                phone=f"98111000{index:02d}",
                date_of_birth="1996-04-12",
                gender="Female" if index % 2 else "Male",
                job_title=data.worker_job_title(index),
                professional_summary=(
                    "Four years on the shop floor across billing, stock, and "
                    "customer service."),
                experience_years=4,
                education="B.Com",
                skills=[skill["Name"] for skill in data.SKILL_DETAILS],
                languages=[language["Name"] for language in data.LANGUAGE_DETAILS],
                work_preferences=data.WORKER_PREFERENCES,
                work_history=data.WORK_HISTORY,
                education_history=data.EDUCATION_HISTORY,
                skill_details=data.SKILL_DETAILS,
                language_details=data.LANGUAGE_DETAILS,
                credentials=data.CREDENTIALS,
                resume_key=(f"resumes/{data.worker_id(index)}/current"
                            if index == 1 else None),
                resume_file_name=data.RESUME_FILE_NAME if index == 1 else None,
                address_line=f"{index} Cross Street",
                city_area=area,
                state=data.STATE,
                pincode=pincode,
                latitude=latitude,
                longitude=longitude,
                location_updated_at=data.created_at(10 + index),
            ))

        self.__context.user_repository.insert_many(users)

    def __insert_jobs(self):
        jobs = [
            self.build_job(
                job_id=data.job_id(index),
                employer_id=self.employer_id,
                index=index,
                created_at=data.created_at(100 + index),
            )
            for index in range(1, data.EMPLOYER_JOB_COUNT + 1)
        ]
        jobs.append(self.build_job(
            job_id=self.rival_job_id,
            employer_id=self.rival_employer_id,
            index=1,
            created_at=data.created_at(99),
            title="Rival Store Associate",
            workplace_name="Rival Retail",
        ))
        self.__context.job_post_repository.insert_many(jobs)

    def __insert_applications(self):
        applications = []
        sequence = 0
        for job_index in range(1, data.JOBS_WITH_APPLICATIONS + 1):
            sequence += 1
            applications.append(JobApplication(
                id=data.application_id(sequence),
                job_post_id=data.job_id(job_index),
                worker_id=data.worker_id(1),
                status=data.application_status(job_index),
                created_at=data.created_at(300 + sequence),
            ))
            for worker_index in range(2, 2 + data.EXTRA_APPLICANTS_PER_JOB):
                sequence += 1
                applications.append(JobApplication(
                    id=data.application_id(sequence),
                    job_post_id=data.job_id(job_index),
                    worker_id=data.worker_id(worker_index),
                    status="Applied",
                    created_at=data.created_at(300 + sequence),
                ))
        self.__context.job_application_repository.insert_many(applications)

    # --- Builders --------------------------------------------------------

    def build_job(self, job_id, employer_id, index, created_at,
                  title=None, workplace_name=None, is_active=True, **overrides):
        values = dict(data.JOB_DEFAULTS)
        values.update(overrides)
        area, pincode, latitude, longitude = (
            data.EMPLOYER_AREA, data.EMPLOYER_PINCODE,
            data.EMPLOYER_LATITUDE, data.EMPLOYER_LONGITUDE)
        return JobPost(
            id=job_id,
            employer_id=employer_id,
            title=title or data.job_title(index),
            description=values.pop("description"),
            workplace_name=workplace_name or f"LocalHire Test Store {index:02d}",
            city_area=values.pop("city_area", area),
            state=values.pop("state", data.STATE),
            pincode=values.pop("pincode", pincode),
            latitude=values.pop("latitude", latitude),
            longitude=values.pop("longitude", longitude),
            employment_type=values.pop("employment_type",
                                       data.job_employment_type(index)),
            is_active=is_active,
            created_at=created_at,
            **values,
        )

    def next_sequence(self):
        self.__sequence += 1
        return self.__sequence

    @classmethod
    def password_hash(cls, password="LocalHire1!"):
        if password not in cls.__password_hash_cache:
            cls.__password_hash_cache[password] = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
        return cls.__password_hash_cache[password]

    # --- Extension helpers used by given steps ---------------------------

    def add_jobs(self, employer_id, count, is_active=True, **overrides):
        """Add ``count`` jobs and return their ids, newest last."""
        jobs = []
        for _ in range(count):
            sequence = self.next_sequence()
            jobs.append(self.build_job(
                job_id=data.job_id(sequence),
                employer_id=employer_id,
                index=sequence,
                created_at=data.created_at(1000 + sequence),
                is_active=is_active,
                **overrides,
            ))
        self.__context.job_post_repository.insert_many(jobs)
        return [job.id for job in jobs]

    def add_workers(self, count, **overrides):
        """Add ``count`` extra workers and return their ids."""
        password_hash = self.password_hash()
        users = []
        for _ in range(count):
            sequence = self.next_sequence()
            area, pincode, latitude, longitude = data.worker_area(sequence)
            values = dict(
                job_title=data.worker_job_title(sequence),
                city_area=area,
                state=data.STATE,
                pincode=pincode,
                latitude=latitude,
                longitude=longitude,
            )
            values.update(overrides)
            users.append(User(
                id=data.worker_id(sequence),
                name=f"Test Worker {sequence:02d}",
                email=f"worker{sequence:04d}@localhire.test",
                password_hash=password_hash,
                role=data.LOOKING_FOR_WORK,
                created_at=data.created_at(2000 + sequence),
                experience_years=3,
                education="12th pass",
                **values,
            ))
        self.__context.user_repository.insert_many(users)
        return [user.id for user in users]

    def add_applications(self, job_id, worker_ids, status="Applied"):
        applications = []
        for worker_id in worker_ids:
            sequence = self.next_sequence()
            applications.append(JobApplication(
                id=data.application_id(sequence),
                job_post_id=job_id,
                worker_id=worker_id,
                status=status,
                created_at=data.created_at(3000 + sequence),
            ))
        self.__context.job_application_repository.insert_many(applications)
        return [application.id for application in applications]

    def add_applicants(self, job_id, count, status="Applied"):
        """Create ``count`` brand-new workers and have them apply to ``job_id``."""
        worker_ids = self.add_workers(count)
        return self.add_applications(job_id, worker_ids, status)

    def add_notifications(self, user_id, count, is_read=False,
                          notification_type="NewApplication", link=None):
        notifications = []
        for offset in range(count):
            sequence = self.next_sequence()
            notifications.append(Notification(
                id=data.notification_id(sequence),
                user_id=user_id,
                type=notification_type,
                title="New application received",
                message=f"A candidate applied for Store Associate {offset + 1:02d}.",
                link=link,
                is_read=is_read,
                created_at=data.created_at(4000 + sequence),
                read_at=data.created_at(4500 + sequence) if is_read else None,
            ))
        self.__context.notification_repository.insert_many(notifications)
        return [notification.id for notification in notifications]

    def add_saved_job(self, worker_id, job_id):
        saved_job = SavedJob(
            id=data.saved_id(self.next_sequence()),
            worker_id=worker_id,
            job_post_id=job_id,
        )
        self.__context.saved_job_repository.insert(saved_job)
        return saved_job.id

    def add_saved_candidate(self, employer_id, worker_id):
        saved_candidate = SavedCandidate(
            id=data.saved_id(self.next_sequence()),
            employer_id=employer_id,
            worker_id=worker_id,
        )
        self.__context.saved_candidate_repository.insert(saved_candidate)
        return saved_candidate.id

    def add_user(self, role, email=None, name=None, password=None, **overrides):
        user = User(
            id=new_id(),
            name=name or "Ad Hoc User",
            email=email or f"adhoc{self.next_sequence()}@localhire.test",
            password_hash=self.password_hash(password or self.password),
            role=role,
            **overrides,
        )
        self.__context.user_repository.insert(user)
        return user
