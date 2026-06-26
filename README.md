# LocalHire

A minimal coming-soon page for LocalHire, built with Vue 3 and ASP.NET Core. 

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Build and serve with .NET

```powershell
cd frontend
npm install
npm run build
cd ../backend
dotnet run
```

The production frontend build is written to `backend/wwwroot` and served by ASP.NET Core.

## Local development with Docker Compose

The default Compose configuration is isolated from production. It starts:

- PostgreSQL at `localhost:5433`
- The LocalHire API at `localhost:8080`
- A persistent Docker volume named `localhire-postgres-data`

Start both services:

```powershell
Copy-Item .env.example .env
# Edit .env and set JWT_SECRET to a unique random value of at least 32 bytes.
docker compose up --build
```

Open:

- Website/API: http://localhost:8080
- Swagger: http://localhost:8080/swagger
- Database check: http://localhost:8080/api/health/database

To run the API directly while keeping PostgreSQL in Docker:

```powershell
docker compose up -d database
dotnet user-secrets set "Jwt:Secret" "YOUR_UNIQUE_RANDOM_SECRET_OF_AT_LEAST_32_BYTES" --project .\backend\LocalHire.Api.csproj
cd backend
dotnet run
```

The Development connection string in `backend/appsettings.Development.json`
uses the default local database values on port `5433`.

The JWT signing key is intentionally not stored in `appsettings` or committed
to Git. For Visual Studio and `dotnet run`, configure `Jwt:Secret` once with
.NET user secrets as shown above. Docker Compose reads `JWT_SECRET` from the
ignored `.env` file. Use a different, securely generated secret in every
environment.

## JWT authentication setup

There are two different values involved:

- **JWT secret:** A private key used by the backend to sign and validate tokens.

### Generate a local JWT secret

Generate the secret once per developer machine. Do not generate a new value
each time the application starts.

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Copy the generated value.

For Visual Studio or `dotnet run`, store it in .NET user secrets:

```powershell
dotnet user-secrets set "Jwt:Secret" "PASTE_GENERATED_VALUE_HERE" --project .\backend\LocalHire.Api.csproj
```

Confirm that it is configured:

```powershell
dotnet user-secrets list --project .\backend\LocalHire.Api.csproj
```

For Docker Compose, put the value in your ignored `.env` file:

```env
JWT_SECRET=PASTE_GENERATED_VALUE_HERE
```

Each developer may use a different local secret. Production must use a
different, stable secret shared by all production API instances and stored in
a secure service such as AWS Secrets Manager.

Changing a JWT secret invalidates every token signed with the previous secret.


If you change `LOCAL_DB_NAME`, `LOCAL_DB_USERNAME`, or `LOCAL_DB_PASSWORD` in
`.env`, Docker Compose will create PostgreSQL with those overridden values.
Update `backend/appsettings.Development.json` to match, or override
`ConnectionStrings:DefaultConnection` with an environment variable or .NET
user secret before running the backend from your IDE.

Remove the local Compose containers, network, and volumes:

```powershell
docker compose down --volumes --remove-orphans
```

Reset all local database data:

```powershell
docker compose down --volumes --remove-orphans
docker compose up --build
```

## Database Migrations

Migrations are managed with EF Core CLI tools. Make sure PostgreSQL is running first.

### Apply migrations (bring the database up to date)

```powershell
cd backend
dotnet ef database update
```

### Create a new migration after changing models

```powershell
cd backend
dotnet ef migrations add <MigrationName> --output-dir Data/Migrations
```

### Remove the last unapplied migration

```powershell
cd backend
dotnet ef migrations remove
```

### Reset the database (drop and recreate)

```powershell
cd backend
dotnet ef database drop --force
dotnet ef database update
```

### Prerequisites

Install the EF Core CLI tools globally (one-time):

```powershell
dotnet tool install --global dotnet-ef
```

The `Microsoft.EntityFrameworkCore.Design` package is already included in the project.

---

## Explicitly connect to AWS RDS

Do this only when you intentionally need to verify an integration against RDS.
Production credentials are kept in the ignored `.env.rds` file:

```powershell
Copy-Item .env.rds.example .env.rds
# Edit .env.rds and enter the real RDS values.
docker compose --env-file .env.rds -f docker-compose.rds.yml up --build
```

Never use the production database for automated tests, schema experiments,
seed data, or destructive development work.

### Temporarily use AWS RDS from Visual Studio or `dotnet run`

The backend normally uses the local PostgreSQL connection from
`backend/appsettings.Development.json`. To temporarily override it with RDS,
store the connection string in .NET user secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=YOUR_RDS_ENDPOINT;Port=5432;Database=localhire;Username=YOUR_RDS_USERNAME;Password=YOUR_RDS_PASSWORD;SSL Mode=VerifyFull;Root Certificate=../certs/global-bundle.pem;Trust Server Certificate=false" --project .\backend\LocalHire.Api.csproj
```

Restart the backend, then verify the connection:

```text
http://localhost:5180/api/health/database
```

User secrets override `appsettings.Development.json`, so the backend will use
RDS until the secret is removed.

Switch back to the local Docker database:

```powershell
dotnet user-secrets remove "ConnectionStrings:DefaultConnection" --project .\backend\LocalHire.Api.csproj
```

Restart the backend again. It will return to `localhost:5433/localhire_dev`.
Do not run migrations, seed scripts, automated tests, or destructive commands
while connected to production. Prefer a staging database or a read-only
production account whenever possible.

