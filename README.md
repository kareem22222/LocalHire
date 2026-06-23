# LocalHire

A minimal coming-soon page for LocalHire, built with Vue 3 and ASP.NET Core.

## Run the frontend

```powershell
cd frontend
pnpm install
pnpm dev
```

## Build and serve with .NET

```powershell
cd frontend
pnpm install
pnpm build
cd ../backend
dotnet run
```

The production frontend build is written to `backend/wwwroot` and served by ASP.NET Core.

