# Hours Worked Tracker

A modern Next.js-based employee hours-worked tracking system that replaces Excel templates with an enhanced, responsive UI.

## Overview

This application tracks daily hours worked per employee, with:
- **Calendar-based hours entry** - Year, month, and week views with interactive grids
- **Dialog-based editing** - Clean modal interface for entry management
- **On-site / remote tracking** - Each entry can note where the work happened
- **Overtime flagging** - Weekly hours over a configurable threshold (per employee, per group, or app-wide) are highlighted
- **Theming system** - Trinity (light) and Default (dark) themes with layout customization
- **Settings page** - Centralized application preferences and theme selection
- **Dashboard** - Statistics and summaries (optional feature)
- **Reports** - Hours Worked report with per-employee/group totals and CSV export (optional feature)
- **SQLite database** - Fast, reliable data persistence
- **Employee management** - Add and manage employee records
- **Bulk entry** - Apply the same hours/location across a date range

## Tech Stack

- **Frontend**: Next.js 16.0.10 (App Router with Turbopack), React 19, TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Database**: SQLite via @libsql/client (Turso/libSQL client)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Lucide React
- **Data Export**: json2csv for CSV generation

## Authentication & Security

The application includes a complete authentication and authorization system with separate concepts for data visibility and action permissions:

### Groups (Data Visibility)
Groups control **which employees/data** a user can see:
- **Master** - Full visibility to all groups and employees
- **Managers** - View all groups (read-only by default)
- **HR** - View and edit all groups
- **Employees** - Limited to own group only

### Roles (Action Permissions)
Roles control **what operations** a user can perform on the data they can see:
- **Administrator** - Full CRUD + user management + access to all groups
- **Manager** - Full CRUD on assigned groups
- **Editor** - Create, read, and update (no delete)
- **Contributor** - Create and read only
- **Viewer** - Read-only access
- **Self-Service** - View and edit own records only

**Key Principle:** Group and Role are independent. A user in the "Employees" group (limited visibility) could have a "Manager" role (full CRUD permissions on what they can see).

- **Audit Logging** - Complete tracking of all data changes
- **Secure Authentication** - JWT tokens with bcrypt password hashing

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`
- ⚠️ **IMPORTANT:** Change this password in production!

See [AUTH-SYSTEM.md](info/SPECS/AUTH-SYSTEM.md) for complete authentication documentation.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Initialize database with schema and seed data
npm run db:init

# Start development server
npm run dev
```

Open [http://localhost:6029](http://localhost:6029) to view the application.

### Database Management

> ⚠️ **IMPORTANT:** All databases are stored in the `databases/` folder at the project root. See [DATABASE-LOCATION.md](info/SPECS/DATABASE-LOCATION.md) for details.

```bash
# Reset database (deletes all data and recreates with auth tables)
npm run db:reset

# Initialize database (create tables and seed data)
npm run db:init

# Seed demo data (employees, hours-worked entries, demo logins)
npm run db:seed-demo
```

**Recommended:** Use `npm run db:reset` to initialize a fresh database with authentication tables and default admin user.

See [DATABASE-MANAGEMENT.md](info/SPECS/DATABASE-MANAGEMENT.md) for complete database management documentation.

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── employees/           # Employee CRUD endpoints
│   │   ├── reports/             # Hours Worked report endpoint
│   │   ├── color-config/        # Status color customization endpoints
│   │   ├── user-employee-link/  # User-to-employee linking API
│   │   └── hours/               # Hours entries CRUD
│   ├── dashboard/               # Dashboard page (optional)
│   ├── link-employee/           # Employee linking page (forced for unlinked users)
│   ├── reports/                 # Reports page (optional)
│   ├── settings/                # Settings page (theme selection, preferences)
│   ├── hours/                   # Main Hours page
│   ├── globals.css              # Global styles with Tailwind
│   ├── layout.tsx               # Root layout with navbar
│   └── page.tsx                 # Home/landing page
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── multi-entry-dialog.tsx   # Entry editing modal (hours + location + notes)
│   ├── bulk-entry-dialog.tsx    # Bulk date-range entry dialog
│   ├── navbar.tsx               # Navigation bar
│   ├── providers.tsx            # Context providers (Auth, Theme)
│   ├── employee-link-settings.tsx  # User-employee link management
│   ├── color-config-management.tsx # Admin overtime status color settings
│   ├── hours-grid.tsx           # Year view table grid component (default)
│   ├── hours-grid-year-calendar.tsx # Year view calendar card layout (user toggle)
│   ├── hours-grid-month.tsx     # Month view calendar grid
│   ├── hours-grid-week.tsx      # Week view day cards
│   ├── view-toggle.tsx          # Year/Month/Week segmented toggle
│   └── reports/                 # Hours Worked report table + CSV export
├── lib/
│   ├── config.ts                # Feature flags and settings
│   ├── db-sqlite.ts             # Database connection + schema
│   ├── app-settings.ts          # App settings helpers (overtime threshold default, etc.)
│   ├── hours-types.ts           # Shared hours type definitions
│   ├── date-helpers.ts          # Date calculation utilities (calendar grids, week bounds)
│   ├── queries-sqlite.ts        # Database queries
│   ├── auth-context.tsx         # Authentication context provider
│   ├── theme-context.tsx        # Theme context provider
│   ├── brand-config.ts          # App branding (logo, title)
│   ├── themes/                  # Theme system
│   │   ├── types.ts            # Theme type definitions
│   │   ├── index.ts            # Theme registry
│   │   ├── trinity.ts          # Trinity theme (light)
│   │   ├── default.ts          # Default theme (dark)
│   │   └── README.md           # Theme creation guide
│   └── utils.ts                 # Utility functions
└── scripts/
    ├── init-db.ts                # Database initialization
    ├── seed-demo.ts               # Demo data seeding
    └── reset-database.ts          # Full database reset
```

## Database Schema

The database includes the following tables:

**Core Tables:**
- `employees` - Employee records with group assignments and an optional per-employee overtime threshold override
- `hours_entries` - Daily hours-worked entries (hours, on-site/remote, notes)

**Authentication & Security Tables (auth.db):**
- `users` - User accounts with encrypted passwords, role assignments, and `employee_id` link
- `roles` - Role definitions with action permissions (Administrator, Manager, Editor, etc.)
- `groups` - User groups controlling data visibility (Master, Managers, HR, Employees), with an optional per-group overtime threshold override
- `group_permissions` - Granular group-to-group permissions
- `user_group_permissions` - Per-user permissions to specific groups
- `audit_log` - Complete change tracking for all modifications
- `app_settings` - Key-value admin settings (default overtime threshold, theme, etc.)
- `color_config` - Custom color overrides for the overtime status indicator

See [AUTH-SYSTEM.md](info/SPECS/AUTH-SYSTEM.md) for detailed schema documentation.

## Configuration

The application uses feature flags to enable/disable optional features. Edit `lib/config.ts` to configure:

```typescript
export const config = {
  features: {
    enableDashboard: true,  // Enable/disable dashboard page
    enableReports: true,     // Enable/disable reports page
  },
  app: {
    name: 'Hours Worked Tracker',
    version: '1.0.0',
  },
};
```

When features are disabled:
- Navigation links are hidden
- Landing page cards are hidden
- Direct access shows a "feature disabled" message

### Overtime Threshold

The weekly overtime threshold defaults to 40 hours and resolves in this order:

1. Per-employee override (`employees.overtime_threshold_hours`)
2. Per-group override (`groups.overtime_threshold_hours`)
3. App-wide default (`app_settings` key `overtime_threshold_hours`)
4. Hardcoded fallback of 40

Weeks where an employee's logged hours exceed their resolved threshold are flagged in the hours grid and totaled in the Hours Worked report.

## Available Scripts

- `npm run dev` - Start development server on port 6029 (with Turbopack)
- `npm run build` - Build for production
- `npm run start` - Start production server on port 6029
- `npm run start:standalone` - Run standalone server from .next/standalone
- `npm run lint` - Run ESLint
- `npm run db:reset` - Reset database with authentication tables (recommended)
- `npm run db:init` - Initialize database with schema
- `npm run db:seed-demo` - Seed demo employees, hours-worked entries, and demo logins
- `npm run db:seed-employees` - Seed employees only

**Default Port:** 6029 (can be changed in `.env` file)

## Features

### Theming System
- **Trinity Theme** - Light mode with original layout
- **Default Theme** - Dark mode with optimized layout
- Theme selection persists across sessions via localStorage
- Visual month separators in Default theme for improved readability
- Seamless theme switching without page reload
- **Easy to customize**: All themes defined in `lib/themes/` folder
- See [lib/themes/README.md](lib/themes/README.md) for complete theme creation guide

### Settings Page
- Centralized application preferences
- Theme selection (Trinity or Default)
- Accessible via navbar "Settings" link

### Hours Grid & View Switching
- **Three view modes**: Year, Month, and Week — toggled via a segmented control
- **Year view (table)** — Interactive 31-day × 12-month grid (the default layout)
- **Year view (calendar)** — 12 month cards in a 3-column grid, each with a 7-column Mon–Sun calendar. Toggle via the "Calendar View" button in the hours toolbar (preference saved to localStorage)
- **Month view** — Traditional 7-column calendar grid (Mon–Sun) with larger day cells
- **Week view** — 7 day-cards showing entry details, responsive stacking on mobile
- **Period navigation** — Prev/next arrows, year picker, and "Today" button for month/week views
- **View preference** — Saved to localStorage and synced to URL params (`?view=month&month=2026-02`) for bookmarkability
- **Responsive auto-switch** — Screens below 768px auto-switch from year to week view
- Click any cell/card to edit time entry via the same dialog
- Overtime weeks are highlighted in amber on every grid view
- Visual indicators for entries with notes
- Invalid dates (e.g., Feb 31) automatically disabled

### Entry Editing
- Modal dialog for clean editing experience
- Hours input (0-24) with quick "All Day" (8h) shortcut
- Optional on-site/remote location tag
- Optional notes field
- Validation and error handling

### Bulk Entry
- Apply the same hours/location/notes across a date range
- Optionally skip weekends and/or overwrite existing entries

### Employee Management
- Add, edit, and deactivate employee records
- **Reactivate deactivated employees** - Master users can view inactive employees and reactivate them with a single click
- Group-based visibility controls
- Per-employee overtime threshold override

### User-Employee Linking
Each user account is linked to an employee profile via `employee_id` on the users table. This enables:
- **Automatic default selection** — the hours grid defaults to the logged-in user's own employee
- **Forced linking at login** — non-master-admin users without a linked employee are redirected to `/link-employee` to select or create one
- **Settings page management** — all users can view, change, or create their employee link in **Settings > Employee Profile Link**
- **Master admin exemption** — users in the Master group are never forced to link (they manage all employees)
- **Auto-link on creation** — when an employee is auto-created for a new user's group, the link is set automatically

### Dashboard (Optional)
- Total employees, entries, hours statistics (last 7 days)
- Hours-by-location summary
- Employee activity summary
- Recent entries feed

### Hours Worked Report (Optional)
- Custom date range, optional employee/group filter
- Per-employee totals with group subtotals and a grand total
- Overtime hours called out per employee and per group
- CSV export

## Documentation

All detailed documentation is located in the [`info/`](info/) folder:

- **[AUTH-SYSTEM.md](info/SPECS/AUTH-SYSTEM.md)** - Complete authentication and authorization system documentation
- **[DATABASE-LOCATION.md](info/SPECS/DATABASE-LOCATION.md)** - Database file locations and structure
- **[DATABASE-MANAGEMENT.md](info/SPECS/DATABASE-MANAGEMENT.md)** - Database operations guide
- **[DEPLOYMENT.md](info/SPECS/DEPLOYMENT.md)** - Deployment and build instructions
- **[lib/themes/README.md](lib/themes/README.md)** - Theme system creation guide
- **[lib/CONFIG.md](lib/CONFIG.md)** - Feature flags and configuration

## Contributing

When adding new features or making changes:
1. Update relevant documentation in the `info/` folder
2. Update this README if the change affects core functionality
3. Follow the existing code structure and patterns
4. Add tests for new features

## Support

For questions or issues:
1. Check the documentation in the [`info/`](info/) folder first
2. Review the relevant `.md` files for your use case
3. Check existing issues or create a new one
