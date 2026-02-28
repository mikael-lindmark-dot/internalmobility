# Replit Agent Runbook: Internal Talent Mobility Platform

This document is for Replit Agent to stand up, run, and deploy this app.

## Project Summary

- Stack: Node.js + Express + static frontend
- Entry point: `src/server.js`
- Default port: `3000`
- Storage modes:
  - `json` (fast MVP mode using `data/db.json`)
  - `postgres` (recommended for deployment)

## Required Environment Variables

### Option A: Quick start (JSON mode)

- `STORAGE_MODE=json`

### Option B: Deployment (Postgres mode, recommended)

- `STORAGE_MODE=postgres`
- `DATABASE_URL=<postgres connection string>`

## First-Time Setup

Run in shell:

```bash
npm install
```

If `STORAGE_MODE=postgres`, also run:

```bash
npm run migrate
npm run seed:postgres
```

## Start Command

```bash
npm start
```

Replit should auto-proxy the running app.

## Health Check

After start, verify:

- `GET /api/health` returns `{ ok: true, ... }`

## Demo Login Accounts

All accounts use password: `demo123`

- `u_emp_001` (employee)
- `u_emp_002` (employee)
- `u_mgr_010` (manager)
- `u_mgr_011` (manager)
- `u_hr_001` (hr)

## Functional Smoke Test (UI)

1. Login as `u_emp_001`
2. Open Opportunity Marketplace
3. Apply to a `Project` or `Role`
4. Open Career Journey and generate roadmap
5. Logout
6. Login as `u_mgr_010`
7. Open Applications and approve a pending stage
8. Create a new opportunity
9. Logout
10. Login as `u_hr_001`
11. Open Approval Policies and confirm list loads
12. Download analytics CSV export

## Functional Smoke Test (API)

1. `POST /api/auth/login`
2. `GET /api/opportunity-types`
3. `GET /api/opportunities`
4. `POST /api/applications`
5. `POST /api/applications/:applicationId/approvals` (manager/hr token)
6. `GET /api/career-journey?employeeId=<id>&targetOpportunityId=<id>`

## Deploy in Replit

1. Import from GitHub repo
2. Set Secrets (env vars)
3. Run setup commands above
4. Set deployment start command: `npm start`
5. Deploy

## Troubleshooting

- If app fails with database errors in Postgres mode:
  - Confirm `DATABASE_URL` is valid
  - Re-run `npm run migrate`
  - Re-run `npm run seed:postgres`
- If policies or journey features look empty:
  - Ensure seed data loaded (`data/db.json` for JSON mode or seeded Postgres state)
- If login fails:
  - Confirm demo users were not removed from seed data

## Notes

- Tests exist but may fail in restricted sandboxes that block local socket listening.
- In normal Replit runtime, app and API flows should run as expected.
