# Codex Task: Modernize the Internal Talent Mobility Platform Frontend

## Objective

Redesign the frontend of this Internal Talent Mobility Platform from its current raw HTML/CSS prototype into a modern, polished, production-quality single-page application. The backend API (Express in `src/server.js`) must NOT be changed. Only the files in `public/` should be modified or added.

## Current State

The app currently has three frontend files:
- `public/index.html` — a single long HTML page with all sections visible at once
- `public/styles.css` — minimal utility CSS
- `public/app.js` — vanilla JS with DOM manipulation and API calls

The frontend is served as static files by Express from the `public/` directory. There is no build step. The app must remain a static frontend (no React, no bundler, no npm build step for the frontend). You may use a CDN-loaded CSS framework or icon library (e.g., Lucide icons via CDN, Google Fonts) but the app must work by just loading `index.html` directly.

## Constraints

1. **No backend changes.** Do not modify anything in `src/`, `migrations/`, `data/`, or `package.json`.
2. **No build step.** The frontend must remain plain HTML/CSS/JS served statically from `public/`.
3. **You may use CDN-loaded libraries** for icons (Lucide, Heroicons), fonts (Google Fonts: Inter or similar), or a lightweight CSS reset. Do NOT add React, Vue, Angular, or any JS framework.
4. **All existing functionality must be preserved.** Every feature currently working must continue to work.
5. **Keep using the existing API helper pattern** (`async function api(url, options)` with Bearer token). The auth flow (login, logout, token in localStorage) must work the same way.

## Backend API Reference

All endpoints require `Authorization: Bearer <token>` header except where noted.

### Auth (no auth required for first two)
- `GET /api/auth/demo-users` — returns `[{userId, name, role, password}]`
- `POST /api/auth/login` — body: `{userId, password}` → `{token, user: {userId, name, role, employeeId}}`
- `POST /api/auth/logout` — invalidates token
- `GET /api/auth/me` — returns current user info

### Employees
- `GET /api/employees` — returns employees visible to current user (scoped by role)
- `GET /api/employees/:employeeId` — returns employee with skills array
- `PATCH /api/employees/:employeeId` — update fields like `careerAspirations`
- `POST /api/employees/:employeeId/skills` — body: `{skillName, category, proficiency}` — add/update skill
- `POST /api/employees/:employeeId/skills/:skillId/endorse` — manager/HR endorse a skill

### Opportunities
- `GET /api/opportunity-types` — returns `["Role","Project","Mentorship","Learning","Stretch"]`
- `GET /api/opportunities?q=&department=&type=&employeeId=` — search/filter opportunities, returns match info when employeeId provided
- `POST /api/opportunities` — create (manager/HR only), body: `{title, type, jobId, department, duration, description, relatedSkillIds, requiredSkills}`
- `POST /api/opportunities/:opportunityId/bookmark` — employee bookmarks an opportunity

### Applications
- `POST /api/applications` — body: `{opportunityId}` — employee applies
- `GET /api/applications` — list applications (scoped by role)
- `POST /api/applications/:applicationId/approvals` — body: `{decision: "Approved"|"Rejected", notes}` — approve/reject a stage
- `PATCH /api/applications/:applicationId/status` — body: `{status}` — manager/HR change status

### Career Journey
- `GET /api/career-paths` — all career paths
- `GET /api/career-paths/readiness?employeeId=&opportunityId=` — readiness assessment
- `GET /api/career-journey?employeeId=&targetOpportunityId=` — full career journey with roadmap, learning recommendations, path progression

### Analytics (manager/HR only)
- `GET /api/analytics` — returns `{totalEmployees, totalOpportunities, opportunitiesByType, totalApplications, internalMobilityRate, internalFillRate, avgTimeInRoleMonths, skillsInventoryCoveragePerEmployee}`
- `GET /api/analytics/export.csv` — HR-only CSV download

### Match Endpoint
- `GET /api/match/:employeeId/:opportunityId` — returns `{matchPercent, missingSkills}`

### Approval Policies (manager/HR)
- `GET /api/approval-policies` — list policies
- `POST /api/approval-policies` — HR creates policy
- `PATCH /api/approval-policies/:policyId` — HR updates policy

## User Roles & What They See

### Employee (`role === 'employee'`)
- Their own profile with skills, aspirations
- Opportunity marketplace with search/filter, match percentages, bookmark and apply buttons
- Their own applications and status tracking
- Career journey roadmap tool

### Manager (`role === 'manager'`)
- Everything employees see, plus:
- View direct reports' profiles
- Create new opportunities
- Review and approve/reject applications for their opportunities
- Endorse skills for direct reports
- View analytics dashboard
- View/manage approval policies

### HR (`role === 'hr'`)
- Full access to everything:
- All employees, all opportunities, all applications
- Create/edit approval policies
- Analytics with CSV export
- All manager capabilities

## Design Requirements

### Overall Design Language
- Clean, modern SaaS dashboard aesthetic (think Linear, Notion, or Rippling)
- Use a sidebar navigation layout, NOT the current stacked-sections approach
- Color palette: use a professional blue/indigo primary with neutral grays
- Font: Inter (from Google Fonts CDN) or system font stack
- Border radius: 8-12px for cards, 6px for inputs/buttons
- Subtle shadows for elevation (cards, modals)
- Smooth transitions for state changes (200-300ms)

### Layout Structure

```
+------------------+----------------------------------------+
|                  |  Top bar: user name, role badge, logout |
|   Sidebar Nav    +----------------------------------------+
|                  |                                        |
|   - Dashboard    |         Main Content Area              |
|   - My Profile   |                                        |
|   - Marketplace  |    (renders based on active nav item)  |
|   - Applications |                                        |
|   - Career Path  |                                        |
|   - Team (mgr)   |                                        |
|   - Analytics    |                                        |
|   - Policies     |                                        |
|                  |                                        |
+------------------+----------------------------------------+
```

- Sidebar: fixed left, ~240px wide, dark background (slate-800 or similar), white text, active item highlighted
- Top bar: white background, shows logged-in user's name, role as a colored badge, and logout button
- Content area: light gray background with white cards

### Page-by-Page Design

#### 1. Login Page (shown when not authenticated)
- Centered card on the page, no sidebar
- App title and subtitle at top
- Clean form with userId and password inputs
- Login button (primary color, full width)
- Below the form: a "Demo Accounts" section showing available users in a clean table or card grid, with a "Quick Login" button next to each that auto-fills and submits

#### 2. Dashboard (default page after login)
- Welcome message: "Welcome back, {name}"
- Role-specific summary cards in a grid:
  - **Employee**: "Your Applications" count, "Bookmarked" count, "Skill Match" average across open roles
  - **Manager**: "Team Size", "Open Opportunities", "Pending Approvals"
  - **HR**: "Total Employees", "Total Opportunities", "Applications", "Internal Mobility Rate"
- Each card should be a rounded rectangle with an icon, a large number, and a label
- Quick action links below: "Browse Opportunities", "View Applications", etc.

#### 3. My Profile Page
- Employee selector dropdown (only visible to managers and HR who can view multiple employees; hidden and auto-set for employees)
- Profile header card: name, role, department, location, tenure displayed in a clean layout
- Career aspirations: editable text area with save button, shown in a card
- Skills section: displayed as a grid of skill cards, each showing skill name, proficiency as a visual bar or filled dots (1-5 scale), category tag, and endorsement count. Add skill form below as an expandable section.

#### 4. Opportunity Marketplace
- Search bar at top with filters (department dropdown, type dropdown) in a row
- Results displayed as a grid of opportunity cards (2 columns on desktop, 1 on mobile)
- Each card shows:
  - Title (bold)
  - Type as a colored badge (Role=blue, Project=green, Mentorship=purple, Learning=orange, Stretch=teal)
  - Department and duration
  - Description (truncated to 2-3 lines)
  - Match percentage shown as a circular progress indicator or colored bar
  - Missing skills listed as small tags
  - Action buttons: "Bookmark" (outline) and "Apply" (primary) — only for employees
- Empty state: friendly message with icon when no results

#### 5. Applications Page
- Table or card list of applications
- Each shows: opportunity title, status as a colored badge, approval stages as a progress stepper, date
- Status badges: Draft=gray, Submitted=blue, Pending Approval=yellow, Under Review=indigo, Interviewing=purple, Offered=green, Accepted=emerald, Rejected=red
- For managers/HR: show applicant name, and action buttons (Approve/Reject) on pending stages
- For employees: show their own applications with status tracking

#### 6. Career Journey Page
- Select a target opportunity from a dropdown
- "Generate Roadmap" button
- Results displayed as:
  - Readiness score as a large circular gauge or progress ring
  - Career path progression shown as a horizontal stepper (current role → next → target)
  - Skill gap roadmap as a vertical timeline, each step showing the skill, current level, target level, and action
  - Learning recommendations as linked cards at the bottom

#### 7. Analytics Page (manager/HR only)
- KPI cards at top: total employees, total opportunities, applications, mobility rate, fill rate, avg tenure, skills coverage
- Opportunity mix displayed as a simple horizontal bar chart (CSS only, no chart library needed)
- CSV export button (styled as a secondary button with download icon)

#### 8. Approval Policies Page (manager/HR, edit for HR only)
- List of existing policies as cards showing name, department, type, and stages
- "Create Policy" form below (or in a modal): fields for name, department, opportunity type, and stages (keep the JSON textarea but add helper text explaining the format, or better yet, use a simple repeatable form section for stages)
- Disabled/read-only for managers, fully editable for HR

### Component Patterns

#### Navigation
- Use a JS-based router pattern: clicking nav items shows/hides content sections
- Store active page in a variable, render only the active page
- Use `data-page` attributes or similar to manage visibility
- Update the URL hash (e.g., `#marketplace`, `#applications`) so refreshing keeps you on the same page

#### Cards
- White background, 1px border (gray-200), border-radius 12px, padding 20-24px
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.08)`

#### Badges/Pills
- Small, rounded-full, colored background with matching dark text
- Role badges: employee=blue, manager=amber, hr=emerald

#### Buttons
- Primary: solid indigo/blue background, white text, rounded-lg
- Secondary: outline with border, transparent background
- Destructive: red tones for reject actions
- All buttons: subtle hover transition, disabled state with opacity

#### Form Inputs
- Clean bordered inputs with focus ring (indigo/blue outline)
- Labels above inputs, not inline
- Consistent spacing

#### Toast/Notifications
- Replace the current `#message` div with a toast notification that appears at the top-right, auto-dismisses after 4 seconds
- Success: green left border, Errror: red left border

#### Empty States
- Friendly illustration or icon with a message when lists are empty
- Example: "No applications yet. Browse the marketplace to find your next opportunity."

### Responsive Design
- Sidebar collapses to a hamburger menu on screens < 768px
- Cards go from multi-column to single-column on mobile
- Forms stack vertically on mobile

### Accessibility
- All interactive elements must be keyboard-accessible
- Use semantic HTML (nav, main, section, article, button)
- Form labels properly associated with inputs
- Sufficient color contrast (WCAG AA)
- Focus-visible styles on interactive elements

## File Organization

Organize the frontend files as follows:

```
public/
  index.html          — Main HTML shell (sidebar, top bar, page containers)
  styles.css          — All styles (design system, components, pages)
  app.js              — Main app logic (router, API calls, state, rendering)
```

You may split into additional files if needed for clarity:
```
public/
  index.html
  css/
    styles.css         — Base styles, design tokens, layout
    components.css     — Reusable component styles (cards, badges, buttons, forms)
    pages.css          — Page-specific styles
  js/
    api.js             — API helper and auth functions
    router.js          — Client-side hash routing
    pages.js           — Page render functions
    components.js      — Reusable UI component renderers
    app.js             — Main entry point, initialization
```

If splitting files, update `index.html` to load them all via `<script>` tags (using modules if you prefer `type="module"`).

## Implementation Notes

1. The auth token is stored in `localStorage` under key `itm_auth_token`. Keep this pattern.
2. Global action functions (`applyOpportunity`, `bookmarkOpportunity`, `decideApproval`) are currently on `window`. You may keep this or use event delegation.
3. Employee selector: for employee role, auto-select their own employeeId and hide the selector. For manager/HR, show a dropdown to switch between viewable employees.
4. The `GET /api/opportunities` endpoint returns `matchPercent` and `missingSkills` when `employeeId` query param is included. Always pass the selected employee's ID.
5. The career journey endpoint returns structured data including `roadmap` (array of steps), `learningRecommendations`, `pathProgression`, and `readinessScore`.
6. Analytics data is flat JSON — just render it in KPI cards. The `opportunitiesByType` field is an object like `{Role: 3, Project: 2}`.

## Demo Accounts for Testing

All accounts use password `demo123`:
- `u_emp_001` — Avery Chen (employee)
- `u_emp_002` — Jordan Patel (employee)
- `u_mgr_010` — Riley Gomez (manager)
- `u_mgr_011` — Taylor Brooks (manager)
- `u_hr_001` — Casey Morgan (hr)

## Quality Checklist

Before finishing, verify:
- [ ] Login page renders correctly with demo account quick-login
- [ ] Sidebar navigation works, showing/hiding correct pages
- [ ] Role-based visibility: employees don't see analytics/policies/create-opportunity; managers see analytics + create; HR sees everything
- [ ] Employee profile loads with skills displayed visually
- [ ] Career aspirations can be edited and saved
- [ ] Skills can be added via the form
- [ ] Opportunity marketplace loads with search and filters working
- [ ] Match percentage displays for each opportunity
- [ ] Bookmark and Apply buttons work for employees
- [ ] Applications list loads with status badges
- [ ] Approval actions work for managers/HR
- [ ] Career journey generates and displays roadmap
- [ ] Analytics page shows KPI cards with real data
- [ ] CSV export downloads for HR
- [ ] Approval policies list and create form work
- [ ] Responsive layout works on mobile widths
- [ ] Toast notifications appear for success/error messages
- [ ] No console errors during normal usage
- [ ] Page state persists on hash navigation (refresh stays on same page)
