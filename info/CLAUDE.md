# Claude Project Summary

**Quick Reference for AI Assistants**

---

## What This Project Is

A **Next.js-based employee hours-worked tracking system** that replaces Excel
templates. Employees log daily hours (with an on-site/remote tag and optional
notes) on a calendar grid; weekly hours over a configurable threshold are
flagged as overtime.

This app was forked from an earlier PTO/vacation tracker (`AttendanceTracker`,
now a separate repo) and had its leave-type/accrual/time-code system removed
entirely in favor of this simpler hours-worked model. If you see references
to "time codes," "leave balances," or "accrual" anywhere, they're leftover —
flag them, don't extend them.

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
    attendance/         # Hours-worked entries CRUD
    color-config/       # Status color configuration (admin)
    groups/             # Group management
    job-titles/         # Job title management
    reports/            # Hours Worked report (permission-filtered)
  attendance/           # Main attendance page
  dashboard/            # Dashboard page (hours/location summary)
  employees/            # Employee management page
  reports/              # Hours Worked report page
  settings/             # Settings page
  users/                # User management (admin)

components/
  ui/                   # shadcn/ui base components
  reports/              # Report components
    hours-worked-report.tsx   # Per-employee/group totals table
    hours-worked-export.tsx   # CSV export
    report-filters.tsx  # Date range / employee / group filter controls
  group-management.tsx  # Groups CRUD UI
  job-title-management.tsx  # Job titles CRUD UI
  color-config-management.tsx  # Overtime status color customization UI
  multi-entry-dialog.tsx     # Entry editing modal (hours + location + notes)
  bulk-entry-dialog.tsx      # Bulk date-range entry dialog
  attendance-grid.tsx   # Year view (table) calendar grid
  attendance-grid-year-calendar.tsx  # Year view (calendar cards) — user toggle
  attendance-grid-month.tsx  # Month view (7-column calendar grid)
  attendance-grid-week.tsx   # Week view (7 day-cards, responsive)
  view-toggle.tsx       # Year/Month/Week segmented toggle
  help-area.tsx         # Contextual help wrapper

hooks/
  use-attendance-cell.ts  # Shared attendance cell logic (display, color, overtime-week detection)
  use-media-query.ts      # SSR-safe responsive breakpoint hook

lib/
  attendance-types.ts   # Shared attendance types (AttendanceEntry, ViewType)
  date-helpers.ts        # Date utilities (calendar grids, week bounds, period navigation)
  db-auth.ts             # Auth database init + migrations
  db-sqlite.ts           # Main database connection + schema
  queries-auth.ts        # Auth-related queries
  queries-sqlite.ts      # Employee + attendance entry queries
  app-settings.ts        # App settings helpers (overtime threshold resolution)
  auth-context.tsx       # Auth state provider
  help-context.tsx       # Help system provider
  color-config.ts        # Overtime status color configuration utilities
  brand-config.ts        # App branding (logo, title) — see Brand System below
  migrations/             # Database migrations
    auth/                 # Auth DB migrations

public/
  {brand}/              # Brand-specific assets (only `Default` is actively used)
    help-content.json   # Help tooltips content
    logo.png

databases/              # SQLite database files (gitignored)
```

---

## Key Concepts

### Authentication Model
- **Users** = System login accounts (managers, admins)
- **Employees** = People whose hours are tracked (may not have logins)
- **Groups** = Control data visibility (Master, Managers, HR, Employees)
- **Roles** = Control actions (Administrator, Manager, Editor, Viewer)

**Default Admin:** `admin` / `admin123`

### Database Architecture
Two separate SQLite databases:
1. **auth.db** - Users, groups, roles, permissions, job_titles, audit_log, app_settings, color_config
2. **attendance.db** - Employees, attendance_entries

### Hours Worked Model
`attendance_entries` has one row per employee per day worked: `employee_id`,
`entry_date`, `hours`, `work_location` (`'onsite' | 'remote' | null`), `notes`.
There's no time-code/category column — an employee can still log more than
one entry for the same day (e.g. half day on-site + half day remote), but
each entry just records hours + an optional location tag.

### Overtime Threshold
Weekly overtime threshold defaults to 40 hours and resolves in this order:
1. `employees.overtime_threshold_hours` (per-employee override)
2. `groups.overtime_threshold_hours` (per-group override)
3. `app_settings` key `overtime_threshold_hours` (app-wide default)
4. Hardcoded fallback of 40

Weeks where an employee's logged hours exceed their resolved threshold are
highlighted amber on every attendance grid view (`useAttendanceCell` hook)
and totaled separately in the Hours Worked report.

### Brand System (mostly vestigial)
The app still has white-label branding machinery (`lib/brand-config.ts`,
`lib/brand-selection.json`, `scripts/select-brand.js`, per-brand Electron
builds) — this was kept intentionally rather than ripped out, but in practice
only the `Default` brand folder exists now. Don't read "brand" as meaning
"leave-type feature flags" — that system (`brand-features.ts`,
`brand-time-codes.ts`, `brand-reports.ts`) was deleted entirely along with
the PTO model. If you find code still importing those modules, it's dead and
should be fixed, not preserved.

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

### Seed Demo Data
```bash
npm run db:seed-demo
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

**Attendance entries** don't follow strict REST verbs — `POST /api/attendance`
takes an `action` field (`bulk_update_range`, `update_day`, `delete`, or
omitted for a plain upsert) since a single day can hold multiple entries.

---

## Important Files

| Purpose | File |
|---------|------|
| Auth DB init | `lib/db-auth.ts` |
| Auth queries | `lib/queries-auth.ts` |
| Migrations | `lib/migrations/auth/migrations.ts` |
| Main schema | `lib/db-sqlite.ts` |
| Overtime threshold resolution | `lib/app-settings.ts` |
| Color config API | `lib/color-config.ts` |
| Attendance types | `lib/attendance-types.ts` |
| Date helpers | `lib/date-helpers.ts` |
| Attendance cell hook | `hooks/use-attendance-cell.ts` |
| Media query hook | `hooks/use-media-query.ts` |
| Hours Worked report API | `app/api/reports/route.ts` |
| Brand config (logo/title) | `lib/brand-config.ts` |

---

## Gotchas & Patterns

1. **Migrations run on server start** - Auth DB migrations auto-run when any auth endpoint is hit

2. **useCallback + toast = infinite loop** - Don't include `toast` in useCallback dependencies; it causes re-renders

3. **Job titles use name strings** - Currently `employees.role` stores job title name, not ID (future: add foreign key)

4. **Settings page is super-admin only** - Groups and Job Titles management only visible to superusers

5. **Employees are soft-deleted** - DELETE on employees sets `is_active = 0`, not actual deletion. Reactivation is done via PUT with `is_active: 1`. Master users can view inactive employees via "Show Inactive" toggle and reactivate them.

6. **Username login is case-insensitive** - Usernames are matched using `COLLATE NOCASE` in SQLite. "Patrick", "patrick", and "PATRICK" all match the same user.

7. **Users have automatic CRUD access to their own group** - Users don't need explicit `user_group_permissions` entries to CRUD employees in their own group. The permission functions (`canUserCreateInGroup`, `canUserReadGroup`, `canUserUpdateInGroup`, `canUserDeleteInGroup`) automatically return true if `groupId === user.group_id`.

8. **Auto-employee creation for first user in group** - When a non-superuser accesses the employees API and there are no employees in their group, the system automatically creates an employee record for them using their user info (full_name split into first/last name, email).

9. **Users vs Employees** - These are separate entities. A User (in auth.db) is a login account. An Employee (in attendance.db) is someone whose hours are tracked. They may or may not be linked.

10. **Reports are permission-filtered** - The `/api/reports` endpoint filters data based on the user's readable groups. Non-superusers only see report data for employees in their own group or groups they have explicit read permission for.

11. **API caching** - Report APIs use `export const dynamic = 'force-dynamic'` to prevent Next.js caching and ensure fresh data on each request.

12. **Color customization is status-only now** - The Color Configuration section in Settings (`components/color-config-management.tsx`) only customizes overtime warning/critical colors — the old per-time-code color customization was removed along with time codes. Admin overrides are stored in `auth.db` (`color_config` table).

13. **Semantic color names** - Colors use semantic names (blue, amber, red, teal, purple, green, gray) that map to Tailwind classes via `DEFAULT_COLOR_PALETTE` in `lib/color-config.ts`. Don't use hex codes or Tailwind classes directly in config.

14. **Attendance view switching** - The attendance page supports Year, Month, and Week views via a segmented toggle, plus a table/calendar layout toggle for the year view (`attendance_year_layout` in localStorage). View preference is stored in localStorage (key: `attendance_view`). The current view and period are synced to URL params (`?view=month&month=2026-02` or `?view=week&week=2026-02-02`) for bookmarkability. All views share the same `useAttendanceCell` hook for cell display/overtime logic and the same `MultiEntryDialog` for editing.

15. **Responsive auto-switch** - On screens below 768px, the attendance page auto-switches from year to week view (one-way — doesn't switch back when enlarged, since the user may have manually chosen week). The `useMediaQuery` hook in `hooks/use-media-query.ts` is SSR-safe (returns false before mount).

16. **Attendance page uses Suspense** - Because it uses `useSearchParams`, the attendance page wraps its content in a `<Suspense>` boundary (same pattern as the login page). The actual component is `AttendanceContent`, the default export is the Suspense wrapper.

17. **Dates must use local time, not UTC** - Never use `new Date().toISOString().split('T')[0]` for "today" calculations. `.toISOString()` returns UTC which shifts the date at the wrong local time (e.g., 4 PM PST). Use `getLocalToday()` from `lib/date-helpers.ts` for today's date, or `formatDateStr(date)` for any Date object.

18. **Login is persistent, not session-based** - All logins get a 90-day cookie; there's no per-brand "logout on browser close" behavior anymore (that was removed with the brand-features system).

---

## Related Documentation

- [ROADMAP.md](ROADMAP.md) - Current roadmap status (no active phased plan)
- [SPECS/](SPECS/) - Technical specifications (note: some predate the hours-worked pivot and may reference removed leave/time-code features)
