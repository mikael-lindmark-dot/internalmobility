# Internal Talent Mobility Platform

## Overview
An MVP internal mobility platform for employees, managers, and HR. Enables internal job applications, opportunity discovery, skill tracking, and approval workflows.

## Architecture
- **Runtime**: Node.js 20
- **Framework**: Express 4.x
- **Frontend**: Static HTML/CSS/JS served from `public/`
- **Storage**: JSON file (`data/db.json`) by default; PostgreSQL optional via `STORAGE_MODE=postgres`

## Project Structure
```
src/
  server.js         # Main Express server with all API routes
  storage.js        # JSON and Postgres storage adapters
  scripts/
    run-migrations.js  # Postgres migration runner
    seed-postgres.js   # Postgres seeder
public/
  index.html        # Frontend UI
  app.js            # Frontend JavaScript
  styles.css        # Styles
data/
  db.json           # JSON database (default storage)
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
- `STORAGE_MODE`: `json` (default) or `postgres`
- `DATABASE_URL`: PostgreSQL connection string (required when `STORAGE_MODE=postgres`)
- `PORT`: Override port (default 5000)

## User Roles
- `employee`: Can browse opportunities, apply, manage skills
- `manager`: Can create opportunities, endorse skills, approve applications
- `hr`: Full access including analytics, approval policies, exports

## Demo Login
All demo users share password `demo123`. User IDs are listed via `/api/auth/demo-users`.
