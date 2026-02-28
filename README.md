# Internal Talent Mobility Platform (MVP+)

A deployable app based on your PRD with core mobility workflows, RBAC, automated tests, and PostgreSQL migration support.

## Features Implemented

- Employee profiles with editable skills and career aspirations
- Internal opportunity marketplace with search and department filter
- Weighted skill-based matching and skill gap visibility
- Internal application workflow with status tracking
- Career readiness endpoint with development actions
- HR/manager analytics and HR-only CSV export
- Audit logging for key data changes
- Authentication + RBAC for `employee`, `manager`, `hr`
- Automated RBAC API tests
- PostgreSQL migration + seed scripts

## Tech Stack

- Node.js + Express
- Storage modes:
  - `json` (default, local MVP) using `data/db.json`
  - `postgres` (production-ready persistence) using `app_state` JSONB table
- Vanilla HTML/CSS/JS frontend

## Quick Start (Local JSON Mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Login Credentials

All demo users use password `demo123`:

- `u_emp_001` (employee)
- `u_emp_002` (employee)
- `u_mgr_010` (manager)
- `u_mgr_011` (manager)
- `u_hr_001` (hr)

## Automated Tests (Step 1)

Run RBAC test suite:

```bash
npm test
```

Covers:

- employee access scope restrictions
- manager scope + create-opportunity permission
- employee forbidden manager actions
- HR-only CSV export enforcement

## PostgreSQL Setup (Step 2)

Set your database URL:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
```

Run migrations:

```bash
npm run migrate
```

Seed Postgres from JSON seed data:

```bash
npm run seed:postgres
```

Run app in Postgres mode:

```bash
STORAGE_MODE=postgres npm start
```

## API Coverage

### Auth

- `GET /api/auth/demo-users`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Core

- `GET /api/employees`
- `GET /api/employees/:employeeId`
- `PATCH /api/employees/:employeeId`
- `POST /api/employees/:employeeId/skills`
- `POST /api/employees/:employeeId/skills/:skillId/endorse`
- `GET /api/opportunities`
- `POST /api/opportunities`
- `POST /api/opportunities/:opportunityId/bookmark`
- `GET /api/match/:employeeId/:opportunityId`
- `POST /api/applications`
- `PATCH /api/applications/:applicationId/status`
- `GET /api/applications`
- `GET /api/career-paths`
- `GET /api/career-paths/readiness`
- `GET /api/analytics`
- `GET /api/analytics/export.csv`

## GitHub Export

```bash
git add .
git commit -m "Add RBAC tests and PostgreSQL migration support"
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

## Replit Deployment

1. Create Repl -> Import from GitHub.
2. Paste repo URL.
3. In Replit Secrets, set:
   - `DATABASE_URL`
   - `STORAGE_MODE=postgres`
4. Run once to initialize DB:

```bash
npm install && npm run migrate && npm run seed:postgres
```

5. Use start command:

```bash
npm start
```

6. Create a Replit Deployment from the running app.

## Next Production Steps

- Replace demo passwords with hashed credentials + SSO/OIDC
- Move from single-document state to normalized relational tables
- Add transactional concurrency controls for high-write traffic
- Add CI pipeline running `npm test` on each PR
