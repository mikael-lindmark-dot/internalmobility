# Internal Talent Mobility Platform (MVP+)

Deployable internal talent marketplace with RBAC, policy-driven approvals, career journeys, tests, and Postgres migration support.

## Replit Agent

For automated setup/run/deploy instructions intended for Replit Agent, see `REPLIT_AGENT.md`.

## What Is Implemented

- Employee profiles with editable skills and aspirations
- Skills-based matching with gap analysis
- Opportunity marketplace across:
  - `Role`
  - `Project`
  - `Mentorship`
  - `Learning`
  - `Stretch`
- Internal applications with configurable approval policies
- Stage-level approval decisions (approve/reject)
- Career journey roadmap API + UI with learning recommendations
- HR/manager analytics and HR CSV export
- RBAC (`employee`, `manager`, `hr`) with audit logging
- Automated API/RBAC tests
- JSON mode + Postgres mode

## Quick Start (JSON mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

Password for all: `demo123`

- `u_emp_001` (employee)
- `u_emp_002` (employee)
- `u_mgr_010` (manager)
- `u_mgr_011` (manager)
- `u_hr_001` (hr)

## Tests

```bash
npm test
```

Coverage includes:

- role-based data access restrictions
- manager-only opportunity creation
- HR-only CSV export
- policy-driven application approvals
- career journey roadmap response

## Key APIs

### Auth

- `GET /api/auth/demo-users`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Opportunities + Policies

- `GET /api/opportunity-types`
- `GET /api/opportunities`
- `POST /api/opportunities`
- `POST /api/opportunities/:opportunityId/bookmark`
- `GET /api/approval-policies`
- `POST /api/approval-policies` (HR)
- `PATCH /api/approval-policies/:policyId` (HR)

### Applications + Journeys

- `POST /api/applications`
- `POST /api/applications/:applicationId/approvals`
- `PATCH /api/applications/:applicationId/status`
- `GET /api/applications`
- `GET /api/career-paths`
- `GET /api/career-paths/readiness`
- `GET /api/career-journey`

### Analytics

- `GET /api/analytics`
- `GET /api/analytics/export.csv` (HR)

## PostgreSQL Setup

Set environment:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
```

Run migration + seed:

```bash
npm run migrate
npm run seed:postgres
```

Start in Postgres mode:

```bash
STORAGE_MODE=postgres npm start
```

## Replit Deployment

1. Import repo from GitHub.
2. Add Replit secrets:
   - `DATABASE_URL`
   - `STORAGE_MODE=postgres`
3. One-time setup command:

```bash
npm install && npm run migrate && npm run seed:postgres
```

4. Start command:

```bash
npm start
```
