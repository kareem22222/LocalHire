# LocalHire

A job marketplace connecting local employers with workers. Vue 3 frontend,
ASP.NET Core API, PostgreSQL, and JWT auth, with Docker Compose for local
development.

**Stack:** Vue 3 + Vite (frontend) · ASP.NET Core on .NET 10 (backend) ·
PostgreSQL + EF Core (data) · Docker Compose (local runtime)

## Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Database](#database)
- [S3 resume storage](#s3-resume-storage)
- [Testing](#testing)
- [Code coverage (SonarCloud)](#code-coverage-sonarcloud)
- [AWS RDS](#aws-rds)

## Quick start

Runs the API and PostgreSQL in Docker — the fastest way to get going.

1. Create your local env file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Set `JWT_SECRET` in `.env` to a random value of at least 32 bytes:

   ```powershell
   $bytes = New-Object byte[] 48
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   $rng.Dispose()
   [Convert]::ToBase64String($bytes)
   ```

3. Start the app:

   ```powershell
   docker compose up --build
   ```

Then open:

| What | URL |
| --- | --- |
| App / API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger |
| Database health | http://localhost:8080/api/health/database |

Compose runs PostgreSQL on `localhost:5433`, the API on `localhost:8080`, and
persists data in the `localhire-postgres-data` volume.

**Demo login:** `demo@localhire.test` / `LocalHire1!` (pick either role). Local
startup seeds 15 employers, 35 workers, 1,000 jobs, and 10,000 applications
once. Generated accounts like `employer001@localhire.test` and
`worker0001@localhire.test` share the same password. Seeding runs only under the
local launch profile, local Docker Compose, and the `LocalHire-dev` Elastic
Beanstalk deployment — production disables it.

## Configuration

`.env.example` holds the local Docker defaults:

```env
LOCAL_DB_NAME=localhire_dev
LOCAL_DB_USERNAME=localhire_admin
LOCAL_DB_PASSWORD=localhire_dev_password
JWT_SECRET=
AWS_S3_BUCKET=localhire-resumes-dev
AWS_REGION=ap-south-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SERVICE_URL=
LOCALSTACK_AUTH_TOKEN=
```

Notes:

- **JWT secret:** keep it out of Git. Each developer can use their own local
  value. Production needs a stable secret in a secure store (e.g. AWS Secrets
  Manager). Changing it invalidates existing tokens.
- **Database:** if you change the DB values, also update
  `backend/appsettings.Development.json`, or override
  `ConnectionStrings:DefaultConnection` via an environment variable or user
  secret when running the backend outside Docker.
- **AWS keys:** leave blank unless you're testing real S3. See
  [S3 resume storage](#s3-resume-storage).

## Development

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Runs at http://localhost:5173 and proxies `/api` to http://localhost:5180, so
start the backend too for login and registration.

### Backend

1. Start PostgreSQL:

   ```powershell
   docker compose up -d database
   ```

2. Store the JWT secret in user secrets:

   ```powershell
   dotnet user-secrets set "Jwt:Secret" "PASTE_GENERATED_VALUE_HERE" --project .\backend\LocalHire.Api.csproj
   ```

3. Run the API:

   ```powershell
   cd backend
   dotnet run
   ```

Runs at http://localhost:5180 using the connection in
`backend/appsettings.Development.json`.

### Production-style build

Build the frontend into `backend/wwwroot` and let ASP.NET Core serve it. The
backend still needs `Jwt:Secret` via user secrets or an environment variable.

```powershell
cd frontend
npm install
npm run build
cd ../backend
dotnet run
```

## Database

Install the EF Core CLI once:

```powershell
dotnet tool install --global dotnet-ef
```

Common commands (run from `backend/`):

```powershell
# Apply migrations
dotnet ef database update

# Create a migration after model changes
dotnet ef migrations add <MigrationName> --output-dir Data/Migrations

# Remove the last unapplied migration
dotnet ef migrations remove

# Drop and recreate the local database
dotnet ef database drop --force
dotnet ef database update
```

Reset the Docker database volume:

```powershell
docker compose down --volumes --remove-orphans
docker compose up --build
```

## S3 resume storage

Resumes are optional. The API uploads PDF, DOC, and DOCX files up to 5 MB to a
private key:

```text
resumes/{user-id}/current
```

Use a private bucket with S3 Block Public Access enabled. No browser CORS setup
is needed — the API uploads the file server-side, not the browser. Grant the IAM
identity only what the upload needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/resumes/*"
  }]
}
```

To verify: sign in with a `LookingForWork` account, upload a resume from the
profile, and confirm `resumes/{user-id}/current` exists in the bucket.

### Docker Compose

There are two modes. **Real AWS is the default**; LocalStack is opt-in behind
the `localstack` Compose profile, so a plain `docker compose up` never starts
LocalStack. Copy `.env.example` to `.env` first (it's Git-ignored but holds
plaintext credentials — never reuse them in production).

**Real AWS S3 (default)** — set real IAM credentials and leave `AWS_SERVICE_URL`
empty:

```env
AWS_S3_BUCKET=your-real-dev-bucket
AWS_REGION=ap-south-2
AWS_ACCESS_KEY_ID=YOUR_IAM_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_IAM_SECRET_KEY
AWS_SERVICE_URL=
```

```powershell
docker compose up --build
```

An empty `AWS_SERVICE_URL` means the API uses the real regional S3 endpoint.

**LocalStack Pro (opt-in)** — emulates S3 with no real account or bucket. It
creates a private `localhire-resumes-dev` bucket on startup via
`localstack/init/ready.d/01-create-resume-bucket.sh`. Set your Pro token (from
https://app.localstack.cloud) and point the API at LocalStack:

```env
LOCALSTACK_AUTH_TOKEN=YOUR_LOCALSTACK_PRO_TOKEN
AWS_SERVICE_URL=http://localstack:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

LocalStack accepts any non-empty credentials, so the dummy `test` values above
are enough. Start with the profile enabled:

```powershell
docker rm -f localhire-localstack
docker compose --profile localstack up --build
```

Inspect the emulated bucket (any dummy credentials work):

```powershell
docker exec localhire-localstack awslocal s3 ls s3://localhire-resumes-dev --recursive
```

The API doesn't depend on LocalStack, so you can also run it alone with
`docker compose --profile localstack up localstack`.

### Local dev with `dotnet run`

Store S3 settings in user secrets instead of `.env`:

```powershell
dotnet user-secrets set "AWS:S3Bucket" "localhire-resumes-dev" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:Region" "ap-south-2" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:AccessKey" "YOUR_IAM_ACCESS_KEY" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:SecretKey" "YOUR_IAM_SECRET_KEY" --project .\backend\LocalHire.Api.csproj
```

Use a development IAM-user access key (starts with `AKIA`), never a root key.
Restart the API after changing secrets. User secrets load only in Development
and are not encrypted, so keep them local-only.

### Production

Never set `AWS:AccessKey`/`AWS:SecretKey` or `AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY` in production. Attach the IAM policy above to the
workload role (e.g. an EB EC2 instance profile or ECS task role) — the SDK
obtains temporary credentials automatically. Production only needs:

```env
AWS__S3Bucket=YOUR-PRODUCTION-BUCKET
AWS__Region=YOUR-BUCKET-REGION
```

The app uses explicit access/secret keys only when both are set; otherwise it
uses the standard AWS credential chain. The bucket name and region must match
the IAM policy and the actual bucket.

### Common errors

| Error | Fix |
| --- | --- |
| `503 AWS:S3Bucket is not configured` | Set the bucket and restart the API. |
| `The provided token is malformed` | Remove an invalid `AWS_SESSION_TOKEN`, or set matching access/secret keys. |
| `AccessDenied` | Ensure the IAM identity has `s3:PutObject` on the bucket's `resumes/*` prefix. |

## Testing

### Unit tests

```powershell
# Frontend
cd frontend
npm test

# Backend
cd backend
dotnet test .\LocalHire.Api.slnx
```

### Functional browser tests (Playwright)

The Playwright suite opens the real application in Chromium/Chrome and tests
the hiring and working roles separately. It runs headlessly in GitHub Actions
on every push and pull request through `.github/workflows/e2e.yml`.

```text
frontend/Functional_test/Playwright/
|-- Hiring_role/       # one spec file per employer feature/scenario
|-- Working_role/      # one spec file per worker feature/scenario
`-- support/           # shared login state and small navigation helpers
```

On this Windows machine Docker runs inside WSL, so use two terminals.

Terminal 1 - PowerShell, then WSL:

```powershell
wsl
```

```bash
cd /mnt/c/Users/sakareem/LocalHire
sudo docker compose up --build
```

Wait for `http://127.0.0.1:8080/api/health` to become healthy. Keep that
terminal running.

Terminal 2 - PowerShell:

```powershell
cd C:\Users\sakareem\LocalHire\frontend
npm ci
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:8080"

# Fast default: runs browsers in the background
npm run test:e2e

# Visible browser: opens Chrome while the tests run
npm run test:e2e:headed

# Interactive Playwright test explorer
npm run test:e2e:ui
```

Useful focused runs:

```powershell
# One role
npm run test:e2e -- --project="Hiring role"
npm run test:e2e -- --project="Working role"

# One feature file
npm run test:e2e -- Functional_test/Playwright/Hiring_role/candidates.spec.js

# Debug one feature in a visible browser
npx playwright test Functional_test/Playwright/Working_role/jobs.spec.js --headed --debug
```

The setup signs in once per role and reuses an ignored storage-state file, which
keeps the suite fast and below the authentication rate limit. To add coverage,
create a new `*.spec.js` file in the matching role folder. Failed runs retain a
trace and screenshot; GitHub Actions uploads the HTML report and test results.

If Playwright's browser is not installed on a machine without Google Chrome,
run `npx playwright install chromium` once. The normal local `--headed` run
opens a visible browser; the default run and GitHub Actions remain headless.

## Code coverage (SonarCloud)

Coverage is produced in CI and imported via the SonarScanner for .NET
(`.github/workflows/sonarcloud.yml`), because SonarCloud doesn't compute
coverage itself or support it under automatic analysis.

Generate the reports locally the same way CI does:

```powershell
# Frontend: Vitest (v8) writes LCOV to frontend/coverage/lcov.info
cd frontend
npm ci
npm run test:coverage

# Backend: Coverlet writes OpenCover XML under backend/**/TestResults/**
cd ../backend
dotnet test .\LocalHire.Api.slnx --collect:"XPlat Code Coverage" --settings .\coverlet.runsettings
```

The scanner imports them via `sonar.javascript.lcov.reportPaths` (frontend) and
`sonar.cs.opencover.reportsPaths` (backend), passed on the scanner `begin`
command in the workflow. The SonarScanner for .NET ignores
`sonar-project.properties` and fails if one exists in the repo root, so all
config lives in the workflow.

One-time setup:

- Turn **automatic analysis OFF** in SonarCloud
  (**Administration > Analysis Method**) so CI-based analysis is used.
- Add a `SONAR_TOKEN` repository secret
  (**Settings > Secrets and variables > Actions**).
- Project key and organization default to `kareem22222_LocalHire` and
  `kareem22222`. Override with `SONAR_PROJECT_KEY` / `SONAR_ORGANIZATION`
  repository variables if they differ.

The workflow runs on every push and PR: install deps, run tests with coverage,
then run the SonarScanner `begin`/build/test/`end` cycle to publish results.

## AWS RDS

Use RDS only to intentionally verify an integration against that database. Never
use production for automated tests, seed data, schema experiments, or
destructive work.

Create an ignored RDS env file and start the RDS Compose stack:

```powershell
Copy-Item .env.rds.example .env.rds
# edit .env.rds, then:
docker compose --env-file .env.rds -f docker-compose.rds.yml up --build
```

To use RDS from Visual Studio or `dotnet run`, store the connection string in
user secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=YOUR_RDS_ENDPOINT;Port=5432;Database=localhire;Username=YOUR_RDS_USERNAME;Password=YOUR_RDS_PASSWORD;SSL Mode=VerifyFull;Root Certificate=../certs/global-bundle.pem;Trust Server Certificate=false" --project .\backend\LocalHire.Api.csproj
```

Restart the backend and check http://localhost:5180/api/health/database. To
switch back to the local Docker database, remove the secret and restart:

```powershell
dotnet user-secrets remove "ConnectionStrings:DefaultConnection" --project .\backend\LocalHire.Api.csproj
```

It returns to `localhost:5433/localhire_dev`.
