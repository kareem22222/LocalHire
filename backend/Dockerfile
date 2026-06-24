FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --registry=https://registry.npmjs.org/

COPY frontend/ ./
RUN npm run build -- --outDir /app/frontend-dist --emptyOutDir

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

COPY backend/LocalHire.Api.csproj backend/
RUN dotnet restore backend/LocalHire.Api.csproj

COPY backend/ backend/
COPY --from=frontend-build /app/frontend-dist/ backend/wwwroot/

RUN dotnet publish backend/LocalHire.Api.csproj \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=backend-build /app/publish ./
COPY certs/global-bundle.pem ./certs/global-bundle.pem

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "LocalHire.Api.dll"]
