# LocalHire

LocalHire is a Vue 3 frontend with an ASP.NET Core API, PostgreSQL storage,
JWT authentication, and Docker Compose support for local development.

## Stack

- Frontend: Vue 3, Vite, Vitest
- Backend: ASP.NET Core on .NET 10
- Database: PostgreSQL
- ORM: Entity Framework Core
- Local runtime: Docker Compose

## Quick Start

The easiest local setup runs the API and PostgreSQL in Docker:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `.env` to a stable random value of at least 32 bytes:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Then start the app:

```powershell
docker compose up --build
```

Open:

- App/API: http://localhost:8080
- Swagger: http://localhost:8080/swagger
- Database health check: http://localhost:8080/api/health/database

Compose starts PostgreSQL on `localhost:5433`, the API on `localhost:8080`,
and stores database files in the `localhire-postgres-data` Docker volume.

## Frontend Development

Run the Vite dev server:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at http://localhost:5173. Start the backend separately for
login and registration; Vite proxies `/api` requests to http://localhost:5180.

## Backend Development

Run PostgreSQL in Docker:

```powershell
docker compose up -d database
```

Store the JWT secret in .NET user secrets:

```powershell
dotnet user-secrets set "Jwt:Secret" "PASTE_GENERATED_VALUE_HERE" --project .\backend\LocalHire.Api.csproj
```

Start the API:

```powershell
cd backend
dotnet run
```

The backend runs at http://localhost:5180 and uses the local database
connection in `backend/appsettings.Development.json`.

Local startup also adds 15 employers, 35 workers, 1,000 jobs, and 10,000
applications once. Sign in with `demo@localhire.test` / `LocalHire1!` and
select either account role. Generated accounts such as
`employer001@localhire.test` and `worker0001@localhire.test` use the same
password. The seed flag is enabled only by the local launch profile and local
Docker Compose, and by the `LocalHire-dev` Elastic Beanstalk deployment.
Production explicitly disables it.

## Production-style Local Build

Build the frontend into `backend/wwwroot`, then let ASP.NET Core serve it. The
backend still needs `Jwt:Secret` configured through user secrets or an
environment variable.

```powershell
cd frontend
npm install
npm run build
cd ../backend
dotnet run
```

## Environment Variables

`.env.example` defines the local Docker defaults:

```env
LOCAL_DB_NAME=localhire_dev
LOCAL_DB_USERNAME=localhire_admin
LOCAL_DB_PASSWORD=localhire_dev_password
JWT_SECRET=
AWS_S3_BUCKET=localhire-resumes-dev
AWS_REGION=ap-south-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

If you change the database values in `.env`, update
`backend/appsettings.Development.json` too, or override
`ConnectionStrings:DefaultConnection` with an environment variable or .NET user
secret when running the backend outside Docker.

Keep JWT secrets out of Git. Each developer can use a different local secret.
Production needs its own stable secret stored in a secure service such as AWS
Secrets Manager. Changing the JWT secret invalidates existing tokens.

## S3 Resume Storage

Worker resumes are optional. The authenticated API uploads PDF, DOC, and DOCX
files up to 5 MB to this private object key:

```text
resumes/{user-id}/current
```

Create a private S3 bucket in the region used by the application. Keep S3 Block
Public Access enabled. Browser CORS configuration is not needed because the API,
not the browser, sends the file to S3.

Grant the development IAM user or production workload role only the permission
the upload endpoint currently needs:

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

### Local development with `dotnet run`

Store all local S3 settings outside the repository with .NET user-secrets:

```powershell
dotnet user-secrets set "AWS:S3Bucket" "localhire-resumes-dev" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:Region" "ap-south-2" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:AccessKey" "YOUR_IAM_ACCESS_KEY" --project .\backend\LocalHire.Api.csproj
dotnet user-secrets set "AWS:SecretKey" "YOUR_IAM_SECRET_KEY" --project .\backend\LocalHire.Api.csproj
```

Use an IAM-user access key created for development, never a root access key.
Long-lived IAM access keys normally start with `AKIA` and do not use a session
token. Restart the API after changing secrets:

```powershell
dotnet run --project .\backend\LocalHire.Api.csproj
```

ASP.NET Core loads user-secrets only in the Development environment. User-secrets
are outside Git but are not encrypted, so use them only for local development.

### Local development with Docker Compose

.NET user-secrets are not mounted into the API container. Copy `.env.example` to
the ignored `.env` file and set these values there:

```env
AWS_S3_BUCKET=localhire-resumes-dev
AWS_REGION=ap-south-2
AWS_ACCESS_KEY_ID=YOUR_IAM_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_IAM_SECRET_KEY
```

Then recreate the API container so it receives the configuration:

```powershell
docker compose up --build
```

The `.env` file is ignored by Git. It still contains plaintext development
credentials, so do not share it or reuse those credentials in production.

### Production

Do not configure `AWS:AccessKey`, `AWS:SecretKey`, `AWS_ACCESS_KEY_ID`, or
`AWS_SECRET_ACCESS_KEY` in production. Attach the policy above to the workload's
IAM role instead (for example, an Elastic Beanstalk EC2 instance profile or an
ECS task role). The AWS SDK automatically obtains temporary role credentials.

For S3, production only needs these application settings:

```env
AWS__S3Bucket=YOUR-PRODUCTION-BUCKET
AWS__Region=YOUR-BUCKET-REGION
```

The application uses explicit `AWS:AccessKey` and `AWS:SecretKey` values when
both are configured. Otherwise it uses the standard AWS SDK credential chain,
which supplies the production workload role. The bucket name must match the
bucket in the IAM policy, and the configured region must match the bucket region.

### Verification and common errors

Sign in with a `LookingForWork` account, open the profile, and upload a valid
resume. Confirm that `resumes/{user-id}/current` exists in the configured bucket.

- `503 AWS:S3Bucket is not configured`: set the bucket and restart the API.
- `The provided token is malformed`: remove an invalid `AWS_SESSION_TOKEN`, or
  configure matching access and secret keys through user-secrets.
- `AccessDenied`: check that the IAM identity or role has `s3:PutObject` on the
  exact bucket and `resumes/*` prefix.

## Tests

Run frontend tests:

```powershell
cd frontend
npm test
```

Run backend tests:

```powershell
cd backend
dotnet test .\LocalHire.Api.slnx
```

## Code Coverage (SonarCloud)

Coverage for both the frontend and backend is reported to SonarCloud. Because
SonarCloud does not calculate coverage itself and does not support coverage
under automatic analysis, coverage is produced in CI and imported through
CI-based analysis with the SonarScanner for .NET
(`.github/workflows/sonarcloud.yml`).

Generate the coverage reports locally the same way CI does:

```powershell
# Frontend: Vitest (v8) writes LCOV to frontend/coverage/lcov.info
cd frontend
npm ci
npm run test:coverage

# Backend: Coverlet writes OpenCover XML under backend/**/TestResults/**
cd ../backend
dotnet test .\LocalHire.Api.slnx --collect:"XPlat Code Coverage" --settings .\coverlet.runsettings
```

The scanner imports these reports using
`sonar.javascript.lcov.reportPaths` (frontend) and
`sonar.cs.opencover.reportsPaths` (backend). These parameters, along with the
project key/organization and exclusions, are passed on the scanner `begin`
command in `.github/workflows/sonarcloud.yml`. The SonarScanner for .NET does
not read a `sonar-project.properties` file and will fail if one exists in the
repository root, so all configuration lives in the workflow.

One-time SonarCloud setup:

- Turn **automatic analysis OFF** in SonarCloud under
  **Administration > Analysis Method** so CI-based analysis is used.
- Add a `SONAR_TOKEN` repository secret (SonarCloud user/project token) under
  **GitHub repo > Settings > Secrets and variables > Actions**.
- The project key and organization default to `kareem22222_LocalHire` and
  `kareem22222`. Override them with `SONAR_PROJECT_KEY` and
  `SONAR_ORGANIZATION` repository variables if they differ.

The workflow runs on every push and pull request: it installs dependencies,
runs frontend and backend tests with coverage, then runs the SonarScanner
`begin`/build/test/`end` cycle to publish results to SonarCloud.

## Database

Install the EF Core CLI once:

```powershell
dotnet tool install --global dotnet-ef
```

Apply the migrations:

```powershell
cd backend
dotnet ef database update
```

Create a migration after model changes:

```powershell
cd backend
dotnet ef migrations add <MigrationName> --output-dir Data/Migrations
```

Remove the last unapplied migration:

```powershell
cd backend
dotnet ef migrations remove
```

Drop and recreate the local database:

```powershell
cd backend
dotnet ef database drop --force
dotnet ef database update
```

Reset the Docker database volume:

```powershell
docker compose down --volumes --remove-orphans
docker compose up --build
```

## AWS RDS

Use RDS only when intentionally verifying an integration against that database.
Do not use production for automated tests, seed data, schema experiments, or
destructive development work.

Create an ignored RDS env file:

```powershell
Copy-Item .env.rds.example .env.rds
```

Edit `.env.rds`, then run:

```powershell
docker compose --env-file .env.rds -f docker-compose.rds.yml up --build
```

To temporarily use RDS from Visual Studio or `dotnet run`, store the connection
string in user secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=YOUR_RDS_ENDPOINT;Port=5432;Database=localhire;Username=YOUR_RDS_USERNAME;Password=YOUR_RDS_PASSWORD;SSL Mode=VerifyFull;Root Certificate=../certs/global-bundle.pem;Trust Server Certificate=false" --project .\backend\LocalHire.Api.csproj
```

Restart the backend, then check:

```text
http://localhost:5180/api/health/database
```

Switch back to the local Docker database:

```powershell
dotnet user-secrets remove "ConnectionStrings:DefaultConnection" --project .\backend\LocalHire.Api.csproj
```

Restart the backend again. It will return to `localhost:5433/localhire_dev`.
