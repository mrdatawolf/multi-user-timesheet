# Claude Project Summary

**Quick Reference for AI Assistants**
*Last Updated: January 20, 2026*

---

## What This Project Is

A **Next.js-based employee attendance/timesheet management system** that replaces Excel templates. It tracks employee time off (vacation, sick, holidays, etc.) with a calendar grid interface.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS) |
| Database | SQLite via @libsql/client (Turso) |
| Auth | JWT tokens + bcrypt |
| Icons | Lucide React |

**Port:** 6029 (default)

---

## Project Structure

```
app/                    # Next.js pages and API routes
  api/                  # REST endpoints
    employees/          # Employee CRUD
    attendance/         # Time entries
    groups/             # Group management
    job-titles/         # Job title management
    time-codes/         # Time code definitions
  attendance/           # Main attendance page
  employees/            # Employee management page
  settings/             # Settings page
  users/                # User management (admin)

components/
  ui/                   # shadcn/ui base components
  group-management.tsx  # Groups CRUD UI
  job-title-management.tsx  # Job titles CRUD UI
  balance-cards.tsx     # Time balance display
  attendance-grid.tsx   # Calendar grid
  help-area.tsx         # Contextual help wrapper

lib/
  db-auth.ts            # Auth database init + migrations
  db-sqlite.ts          # Main database connection
  queries-auth.ts       # Auth-related queries
  queries-sqlite.ts     # Data queries
  auth-context.tsx      # Auth state provider
  help-context.tsx      # Help system provider
  accrual-calculations.ts  # Leave accrual calculation engine
  migrations/           # Database migrations
    auth/               # Auth DB migrations
      005_seed_job_titles.ts  # Seeds default job titles

public/
  {brand}/              # Brand-specific assets (TRL, NFL, etc.)
    help-content.json   # Help tooltips content
    time-codes.json     # Time code definitions
    brand-features.json # Feature flags

databases/              # SQLite database files (gitignored)
```

---

## Key Concepts

### Authentication Model
- **Users** = System login accounts (managers, admins)
- **Employees** = People whose time is tracked (may not have logins)
- **Groups** = Control data visibility (Master, Managers, HR, Employees)
- **Roles** = Control actions (Administrator, Manager, Editor, Viewer)

**Default Admin:** `admin` / `admin123`

### Database Architecture
Two separate SQLite databases:
1. **auth.db** - Users, groups, roles, permissions, job_titles, audit_log
2. **attendance.db** - Employees, time_codes, attendance_entries, allocations

### Brand System
Multi-tenant via `public/{brand}/` folders. Each brand can have:
- Custom time codes (`time-codes.json`)
- Custom help content (`help-content.json`)
- Feature flags and accrual rules (`brand-features.json`)

Brand selected at build time via `lib/brand-selection.json`.

### Accrual Calculation Engine
The system supports multiple leave accrual types defined in `brand-features.json`:

| Type | Description | Example |
|------|-------------|---------|
| `quarterly` | Earns hours per quarter | Floating Holiday: 8 hrs/quarter, max 24/year |
| `hoursWorked` | Earns hours based on hours worked | PSL: 1 hr per 30 hrs worked, max 80 |
| `tieredSeniority` | Earns based on years of service | Vacation: Tiers from 40-200 hrs based on tenure |

Accrual rules are brand-specific and support:
- Eligibility wait periods (days, months, years)
- Maximum accrual and usage limits
- Custom accrual periods (calendar year, fiscal year, custom dates)
- Employee type differentiation (full-time, part-time, exempt)

---

## Current Phase: 6 (Help System)

**Completed:**
- Contextual help tooltips (HelpArea component)
- Help toggle in navbar
- Brand-specific help content
- Balance breakdown modals with accrual calculation display
- Groups management (Settings page)
- Job Titles management (Settings page)
- Brand-specific time codes
- Help content for Groups/Job Titles sections
- Accrual calculation engine (`lib/accrual-calculations.ts`)
  - Quarterly accrual (Floating Holiday)
  - Hours-worked accrual (Personal Sick Leave)
  - Tiered seniority accrual (Vacation)
- Brand-specific accrual rules in `brand-features.json`

**Remaining:**
- Attendance page: explain how employee values (totals) are generated

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Core attendance grid, entry dialogs, balance cards |
| 2 | ✅ | User permissions, groups, roles, audit logging |
| 3 | ✅ | Multiple entries per day |
| 4 | ✅ | Automated backups (7-day, 4-week, 12-month) |
| 4.5 | ✅ | White labeling, brand URI configuration |
| **6** | **In Progress** | Contextual help, groups/job titles management |
| 7 | Planned | Leave request & approval workflows |
| 8 | Planned | Policy engine (eligibility, limits, lockouts) |

---

## Common Tasks

### Run Development Server
```bash
npm run dev
```

### Reset Database
```bash
npm run db:reset
```

### Create Migration
1. Create file: `lib/migrations/auth/00X_name.ts`
2. Export `migration` object with `name`, `description`, `up()` function
3. Add to `lib/migrations/auth/migrations.ts` array

### Add New Component
1. Use shadcn/ui pattern (see `components/ui/`)
2. For settings features, add to `app/settings/page.tsx`
3. Create dedicated component file in `components/`

---

## API Patterns

**All endpoints require JWT auth header:**
```typescript
headers: { Authorization: `Bearer ${token}` }
```

**Standard CRUD pattern:**
- `GET /api/{resource}` - List all
- `GET /api/{resource}?id=X` - Get one
- `POST /api/{resource}` - Create
- `PUT /api/{resource}` - Update (id in body)
- `DELETE /api/{resource}?id=X` - Delete

---

## Important Files

| Purpose | File |
|---------|------|
| Auth DB init | `lib/db-auth.ts` |
| Auth queries | `lib/queries-auth.ts` |
| Migrations | `lib/migrations/auth/migrations.ts` |
| Brand config | `lib/brand-selection.json` |
| Help content | `public/{brand}/help-content.json` |
| Time codes | `public/{brand}/time-codes.json` |
| Accrual rules | `public/{brand}/brand-features.json` |
| Accrual engine | `lib/accrual-calculations.ts` |

---

## Gotchas & Patterns

1. **Migrations run on server start** - Auth DB migrations auto-run when any auth endpoint is hit

2. **useCallback + toast = infinite loop** - Don't include `toast` in useCallback dependencies; it causes re-renders

3. **Brand folders** - Each brand (TRL, NFL, etc.) needs its own folder in `public/` with JSON config files

4. **Job titles use name strings** - Currently `employees.role` stores job title name, not ID (future: add foreign key)

5. **Settings page is super-admin only** - Groups and Job Titles management only visible to superusers

---

## Related Documentation

- [ROADMAP.md](ROADMAP.md) - Phase planning and status
- [PHASE-6-PLAN.md](PHASE-6-PLAN.md) - Current phase details
- [SPECS/](SPECS/) - Technical specifications
- [COMPLETE/](COMPLETE/) - Completed phase plans
