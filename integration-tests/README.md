# LocalHire integration tests

Gherkin scenarios ([behave](https://behave.readthedocs.io/)) run against the real
stack: the ASP.NET Core API, PostgreSQL, and LocalStack S3, all started by
`docker compose`. Nothing is mocked and nothing is stubbed — every scenario sends
real HTTP, and asserts both the response and the rows the API wrote.

This suite replaces the Playwright browser suite that used to live in
`frontend/Functional_test/`. The unit tests (`npm test`, `dotnet test`) are
unaffected.

## Contents

- [What a scenario guarantees](#what-a-scenario-guarantees)
- [Quick start](#quick-start)
- [Running](#running)
- [Configuration](#configuration)
- [The mock data](#the-mock-data)
- [Layout](#layout)
- [Writing a scenario](#writing-a-scenario)
- [Tags](#tags)
- [Troubleshooting](#troubleshooting)

## What a scenario guarantees

Every scenario tagged `@db` starts from a database built from scratch:

1. The suite calls `POST /api/test-support/reset`, which drops the `public`
   schema and re-runs every EF Core migration — so the tables are genuinely
   recreated, not just emptied.
2. The suite reseeds [the mock data](#the-mock-data) straight into PostgreSQL.
3. The suite calls `POST /api/test-support/caches/clear`, because the API caches
   job queries for two minutes and profiles for five; without this a scenario
   could read rows that no longer exist.

Scenarios therefore cannot leak into each other, in either direction, and the
order they run in does not matter.

`@s3` scenarios additionally recreate the resume bucket and delete everything
under `resumes/`, so an upload from one scenario can never satisfy another.

> **Warning:** a reset deletes every row in the target database. Only ever point
> this suite at a local or throwaway environment. The routes it depends on exist
> only when the API runs with `TestSupport__Enabled=true`, which
> `docker-compose.yml` sets for local development and no deployed environment
> sets.

## Quick start

Two terminals. The first runs the stack; the second runs the tests.

**Terminal 1 — the stack.** On Windows the Docker engine lives inside WSL, so
enter WSL first and replace the path with wherever you cloned LocalHire:

```powershell
wsl
```

```bash
cd /mnt/c/path/to/LocalHire
docker compose --profile localstack up --build
```

Wait until <http://localhost:8080/api/health> answers. Leave it running. Drop
`--profile localstack` if you do not have a LocalStack Pro token: the `@s3`
features then skip themselves and everything else still runs.

**Terminal 2 — the tests.** From PowerShell, at the repository root:

```powershell
cd integration-tests
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m behave
```

WSL2 forwards published container ports to Windows, so the API (8080),
PostgreSQL (5433), and LocalStack (4566) are all reachable from PowerShell
without any extra configuration.

On Linux (and on the CI runner) it is the same thing without the venv dance:

```bash
pip install -r integration-tests/requirements.txt
cd integration-tests && behave
```

## Running

```powershell
# everything (schema rebuilt per scenario)
behave

# faster: empty the tables instead of rebuilding the schema
behave -D reset_mode=truncate

# one feature
behave features/hiring_jobs.feature

# one scenario by name
behave --name "A worker applies to an open role"

# by tag
behave --tags=worker
behave --tags=hiring
behave --tags=resume
behave --tags="notifications or profile"

# stop at the first failure, with full output
behave --stop --no-capture

# JUnit XML, as CI produces
behave --junit --junit-directory reports
```

Measured on a developer laptop against the compose stack, 240 scenarios:

| `reset_mode` | Wall clock | Notes |
| --- | --- | --- |
| `recreate` (default) | ~7 min | drops the schema and re-runs every migration per scenario |
| `truncate` | ~4 min | empties the tables per scenario |

`recreate` is the default because it is the strongest guarantee: the tables are
created from scratch every single time. Use `truncate` for a tight edit-run loop
and let CI run the default.

## Configuration

Everything lives in `behave.ini` under `[behave.userdata]`. Override per run with
`-D key=value`, or with an environment variable named `LOCALHIRE_<KEY>`:

| Setting | Default | Purpose |
| --- | --- | --- |
| `api_base_url` | `http://localhost:8080/api/` | API under test |
| `db_host` / `db_port` | `localhost` / `5433` | PostgreSQL published by compose |
| `db_name` / `db_username` / `db_password` | `localhire_dev` / `localhire_admin` / `localhire_dev_password` | database credentials |
| `reset_mode` | `recreate` | `recreate` or `truncate` |
| `s3_endpoint_url` | `http://localhost:4566` | LocalStack edge port |
| `s3_bucket` | `localhire-resumes-dev` | resume bucket |
| `test_password` | `LocalHire1!` | password every seeded account shares |
| `jwt_secret` | *(empty)* | only for `@jwt_secret` scenarios; also read from `JWT_SECRET` |
| `auth_rate_limit_permits` | `5` | must match the API for `@rate_limit` |

Examples:

```powershell
$env:LOCALHIRE_API_BASE_URL = "http://127.0.0.1:8080/api/"
behave -D db_port=5433 -D reset_mode=truncate
```

## The mock data

Seeded by `features/utils/test_data_manager.py` from the constants in
`features/utils/data_dict.py`. Ids are fixed and readable
(`c0000000-0000-4000-8000-000000000001` is job `J01`), which keeps failures easy
to read and lets a token minted once per run keep working after the schema is
rebuilt.

| What | Count | Notes |
| --- | --- | --- |
| Employers | 2 | `Demo Employer` (`employer@localhire.test`) and a rival for isolation checks |
| Workers | 12 | `W01` = `Demo Worker`, fully populated profile plus resume metadata |
| Jobs | 19 | `J01`..`J18` owned by the employer, oldest first; one owned by the rival |
| Applications | 96 | `J01`..`J12` each have 8: `W01` plus `W02`..`W08` |
| Saved jobs / candidates / notifications | 0 | scenarios arrange these |

`W01`'s application status cycles Applied → Shortlisted → Rejected → Hired across
`J01`..`J12`, so the worker's tracker always has three of each, and `J02`, `J06`
and `J10` are the roles with a shortlisted candidate. `W09`..`W12` have never
applied to anything, which is what makes them the "browsed only, contact locked"
candidates.

Every account uses the password `LocalHire1!`.

To change the shape of the data, either edit `data_dict.py` (moves the baseline
for the whole suite) or use a `Given` step in the scenario that needs it:

```gherkin
Given the employer has 25 open jobs
And job "J01" has 12 applicants with status Applied
And the worker has 3 unread notifications
And the worker has a resume stored in S3
```

## Layout

```text
integration-tests/
├── behave.ini                 # settings and default tag filter
├── requirements.txt
└── features/
    ├── environment.py         # behave hooks, delegating to the layer stack
    ├── *.feature              # the scenarios
    ├── steps/                 # given_steps.py, when_steps.py, then_steps.py
    ├── layers/                # per-run and per-scenario setup (db, s3)
    ├── context_builders/      # wires clients and repositories onto the context
    ├── clients/               # api_client, db_client, s3_client, test_support_client
    ├── repositories/          # one per table, parameterised SQL only
    ├── db_models/             # dataclasses mirroring the EF Core entities
    └── utils/                 # test data, assertions, resolvers, settings
```

The structure mirrors the `acm/integration-tests` framework: a layer stack driven
from `environment.py`, a context builder that assembles clients and
repositories, row models plus repositories for database access, and a
`test_data_manager` that owns the fixture data.

## Writing a scenario

Most endpoints need no new Python. The generic steps take any path, query string,
and JSON body:

```gherkin
@db
Scenario: Open roles are paged fifteen at a time
  Given the mock data is in place
  When the employer sends a GET request to "hiring/jobs/paged?status=open&page=1&pageSize=15"
  Then the response status code is 200
  And the response list "items" has 15 items
  And the response field "totalCount" is "18"
```

Useful conventions:

- **Actors**: `the employer`, `the rival employer`, `the worker`, `worker 2`,
  `anonymous`, `invalid`, `expired`. The token is fetched once per account and
  reused.
- **Placeholders in paths**: `{J01}` becomes that job's id;
  `{worker:worker 3}`, `{user:the rival employer}`,
  `{application:J01,worker 2}`, `{newest application:J01}` and `{missing}` all
  resolve the same way.
- **Response assertions**: `the response field "items.0.status" is "Shortlisted"`
  reads a dotted path. `the response matches` compares an inline JSON document
  and only checks the fields it mentions, with `"*"` matching anything.
- **Database assertions**: `table "JobPosts" has 20 rows`,
  `the application of worker 2 on job "J01" has status Shortlisted`,
  `the stored profile field "AddressLine" for the employer is "..."`.
- **S3 assertions**: `the resume object for the worker exists in S3`,
  `the download responds with 200 and content type "application/pdf"`.

Add a `Given` step for new fixture shapes, and a `Then` step only when an
assertion cannot be expressed with the generic ones.

## Tags

| Tag | Meaning |
| --- | --- |
| `@db` | rebuild the schema and reseed the mock data before the scenario |
| `@s3` | also reset the LocalStack resume bucket; skipped if LocalStack is down |
| `@jwt_secret` | needs the API's JWT secret; skipped when none is configured |
| `@rate_limit` | excluded by default (see below) |
| feature tags | `@auth`, `@access_control`, `@profile`, `@resume`, `@hiring`, `@worker`, `@notifications`, `@dashboards`, `@health` |

`behave.ini` sets `tags = not @rate_limit`, because the compose stack raises the
sign-in limit so a whole run is not throttled. To exercise throttling, start the
API with the production-like limit and run the tag on its own:

```bash
AUTH_RATE_LIMIT_PERMITS=5 docker compose up -d --build api
cd integration-tests && behave --tags=rate_limit -D auth_rate_limit_permits=5
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `The API did not expose /api/test-support` | The stack is running without `TestSupport__Enabled=true`. `docker compose up` sets it; a hand-run `dotnet run` does not. |
| `Timed out waiting for the API` | The stack is not up, or is on another port. Check `http://localhost:8080/api/health` and `api_base_url`. |
| `Timed out waiting for PostgreSQL` | Compose publishes 5433, not 5432. Check `db_port`. |
| `@s3` features skipped | LocalStack is not running. Start it with `docker compose --profile localstack up` and set `LOCALSTACK_AUTH_TOKEN` in `.env`. |
| `@jwt_secret` scenarios skipped | Export `JWT_SECRET` with the same value the API uses. |
| A scenario fails and you want to look at the rows | Nothing is cleaned up after a scenario, so the failing state is still in the database until the next `@db` scenario runs. Use `behave --stop` and then inspect it. |
