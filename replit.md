# Internal Talent Mobility Platform

## Overview
An MVP internal mobility platform for employees, managers, and HR. Enables internal job applications, opportunity discovery, skill tracking, and approval workflows.

## Architecture
- **Runtime**: Node.js 20
- **Framework**: Express 4.x
- **Frontend**: Static HTML/CSS/JS served from `public/`
- **Database**: PostgreSQL (Replit built-in), configured via `STORAGE_MODE=postgres`
- **Storage pattern**: Single JSONB column in `app_state` table holding all application data

## Project Structure
```
src/
  server.js         # Main Express server with all API routes
  storage.js        # JSON and Postgres storage adapters
  scripts/
    run-migrations.js  # Postgres migration runner
    seed-postgres.js   # Postgres seeder (loads data/db.json into Postgres)
public/
  index.html        # Frontend UI
  app.js            # Frontend JavaScript
  styles.css        # Styles
data/
  db.json           # Seed data / JSON fallback
migrations/
  001_create_app_state.sql
tests/
  auth-rbac.test.js
```

## Running
- **Dev**: `npm run dev` (uses node --watch)
- **Production**: `node src/server.js`
- **Port**: 5000, bound to `0.0.0.0`

## Environment Variables
- `STORAGE_MODE`: Set to `postgres` (configured in shared env)
- `DATABASE_URL`: PostgreSQL connection string (auto-set by Replit)
- `PORT`: Override port (default 5000)

## Database Setup
Migrations and seed data have been applied:
- `npm run migrate` — creates `app_state` table
- `npm run seed:postgres` — loads `data/db.json` into Postgres

## User Roles
- `employee`: Can browse opportunities, apply, manage skills
- `manager`: Can create opportunities, endorse skills, approve applications
- `hr`: Full access including analytics, approval policies, exports

## Demo Login
All demo users share password `demo123`. User IDs are listed via `/api/auth/demo-users`.
