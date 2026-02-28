# SSO Connector (Replit + Okta Control Plane)

Internal control-plane service to standardize and automate SSO/provisioning setup for multiple Replit applications and multiple user audiences.

This MVP provides:
- App registry (`dev/staging/prod`)
- Audience-to-role mapping with canonical Okta group names
- Okta provisioning record endpoint (dry-run by default)
- Versioned app config publishing
- Drift checks and audit log
- OpenAPI spec and DB DDL

## Architecture Summary

- Each Replit app authenticates directly with Okta (or Replit enterprise SSO path).
- This service is not an auth proxy.
- This service is the admin/API layer that manages identity setup and publishes per-app config contracts.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM
- SQLite by default (`DATABASE_URL=file:./dev.db`), Postgres-ready by changing Prisma datasource/provider

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure env:
```bash
cp .env.example .env
```

3. Generate Prisma client + migrate DB:
```bash
npm run prisma:generate
npm run prisma:deploy
```

4. (Optional) Seed sample app:
```bash
npm run seed
```

5. Run service:
```bash
npm run dev
```

Service starts on `http://localhost:3000`.

## API Endpoints

- `GET /health`
- `POST /applications`
- `GET /applications`
- `GET /applications/:id`
- `POST /applications/:id/audience-mappings`
- `POST /applications/:id/okta/provision`
- `POST /applications/:id/publish-config`
- `GET /applications/:id/config`
- `GET /applications/:id/drift`
- `GET /audit-events`

OpenAPI: [`docs/openapi.yaml`](docs/openapi.yaml)

## Example Flow (curl)

Create app:
```bash
curl -sS -X POST http://localhost:3000/applications \
  -H 'content-type: application/json' \
  -d '{
    "name":"Sales Dashboard",
    "slug":"sales-dashboard",
    "env":"dev",
    "redirectUris":["https://sales-dashboard.dev.replit.app/auth/callback"],
    "postLogoutRedirectUris":["https://sales-dashboard.dev.replit.app"],
    "provisioningMode":"jit",
    "createdBy":"mikael"
  }'
```

Replace mappings:
```bash
curl -sS -X POST http://localhost:3000/applications/<APP_ID>/audience-mappings \
  -H 'content-type: application/json' \
  -H 'x-actor: mikael' \
  -d '{
    "mappings":[
      {"audienceName":"employee","roleName":"admin"},
      {"audienceName":"contractor","roleName":"viewer"}
    ]
  }'
```

Provision Okta metadata (MVP dry-run):
```bash
curl -sS -X POST http://localhost:3000/applications/<APP_ID>/okta/provision \
  -H 'content-type: application/json' \
  -d '{"actor":"mikael","scimEnabled":false}'
```

Publish config:
```bash
curl -sS -X POST http://localhost:3000/applications/<APP_ID>/publish-config \
  -H 'x-actor: mikael'
```

Fetch latest config:
```bash
curl -sS http://localhost:3000/applications/<APP_ID>/config
```

## Replit Import + Run Instructions

When you import this repo to Replit:

1. Ensure secrets are set in Replit Secrets:
- `PORT=3000`
- `DATABASE_URL=file:./dev.db`
- `OKTA_DRY_RUN=true` (keep true initially)
- `OKTA_ORG_URL=https://<your-org>.okta.com` (optional for dry-run)
- `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` (only needed when real Okta API integration is implemented)

2. In Replit shell run:
```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

3. Health check:
```bash
curl -sS http://localhost:3000/health
```

## Instructions for Replit Agent

Use this prompt in Replit Agent after import:

```text
This repository is an internal Identity Control Plane API for Replit + Okta.

Your tasks:
1) Install dependencies and run Prisma setup:
   - npm install
   - npm run prisma:generate
   - npm run prisma:deploy
   - npm run seed
2) Start the API with npm run dev and verify GET /health returns ok=true.
3) Execute a smoke test flow:
   - Create an application via POST /applications
   - Add audience-role mappings via POST /applications/:id/audience-mappings
   - Run POST /applications/:id/okta/provision (dry-run)
   - Publish config via POST /applications/:id/publish-config
   - Fetch config via GET /applications/:id/config
4) If any step fails, fix code/config and rerun until all endpoints work.
5) Keep OKTA_DRY_RUN=true and do not implement live Okta writes unless explicitly requested.

Output expected:
- Final list of successful endpoint calls and sample JSON responses.
- Any changes made to make it run on Replit.
```

## Production Hardening Checklist (next)

- Replace dry-run block in `/okta/provision` with real Okta API calls (OAuth service app).
- Add authentication/authorization for this control plane.
- Add pagination/filtering for audit events.
- Add Terraform export/sync mode.
- Add integration tests and CI.

## Files Provided

- API server: `src/server.ts`
- Prisma schema: `prisma/schema.prisma`
- Initial migration: `prisma/migrations/0001_init/migration.sql`
- Seed script: `prisma/seed.ts`
- OpenAPI: `docs/openapi.yaml`
- DB DDL: `docs/db-ddl.sql`

