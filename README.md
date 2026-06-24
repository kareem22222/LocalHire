# LocalHire

A minimal coming-soon page for LocalHire, built with Vue 3 and ASP.NET Core. 

## Run the frontend

```powershell
cd frontend
npm install
npm dev
```

## Build and serve with .NET

```powershell
cd frontend
npm install
npm build
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
docker compose up --build
```

Open:

- Website/API: http://localhost:8080
- Swagger: http://localhost:8080/swagger
- Database check: http://localhost:8080/api/health/database

To run the API directly while keeping PostgreSQL in Docker:

```powershell
docker compose up -d database
cd backend
dotnet run
```

The Development connection string in `backend/appsettings.Development.json`
uses the default local database values on port `5433`.

If you change `LOCAL_DB_NAME`, `LOCAL_DB_USERNAME`, or `LOCAL_DB_PASSWORD` in
`.env`, Docker Compose will create PostgreSQL with those overridden values.
Update `backend/appsettings.Development.json` to match, or override
`ConnectionStrings:DefaultConnection` with an environment variable or .NET
user secret before running the backend from your IDE.

Reset all local database data:

```powershell
docker compose down --volumes
docker compose up --build
```

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

