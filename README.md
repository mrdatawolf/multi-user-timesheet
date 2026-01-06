# Multi-User Attendance Application

A modern Next.js-based employee Attendance management system that replaces Excel templates with an enhanced, responsive UI.

## Overview

This application digitizes the traditional Excel-based Attendance process with:
- **Calendar-based attendance entry** - Interactive 31 days × 12 months grid
- **Dialog-based editing** - Clean modal interface for entry management
- **Balance tracking** - Real-time tracking of time code usage and limits
- **Theming system** - Trinity (light) and Default (dark) themes with layout customization
- **Settings page** - Centralized application preferences and theme selection
- **Dashboard** - Statistics and summaries (optional feature)
- **Reports** - Filterable reports with CSV export (optional feature)
- **SQLite database** - Fast, reliable data persistence
- **Employee management** - Add and manage employee records with custom time allocations
- **Time code tracking** - Vacation, Holiday, Personal, and more
- **Custom allocations** - Set employee-specific time off limits per year

## Time Codes

The system tracks these time entry codes:
- **D** - Discipline
- **B** - Bereavement (24 Hours PD/16 Unpaid)
- **FE** - Family Emergency
- **FM** - FMLA
- **H** - Holiday
- **JD** - Jury Duty
- **FH** - Floating Holiday (24 Hours total)
- **DP** - Designated Person
- **P** - Personal
- **LOW** - Lack of Work
- **PS** - Personal Sick Day (40 Hours total)
- **T** - Tardy
- **V** - Vacation
- **WC** - Workers Comp

## Development Phases

### Phase 1: Attendance Entry UI ✅ COMPLETE
- ✅ Replicate Excel layout with enhanced components
- ✅ Calendar grid (days 1-31 across columns, months down rows)
- ✅ Dialog-based entry editing with time code, hours, and notes
- ✅ Employee header with year selector
- ✅ Balance cards tracking time code usage and limits
- ✅ SQLite database storage with @libsql/client
- ✅ Dashboard with statistics and summaries (optional)
- ✅ Reports with filtering and CSV export (optional)

### Phase 2: Employee Views (Planned)
- Filter Attendance by employee name
- Filter by date ranges
- Personalized employee dashboards
- Employee-specific access controls

### Phase 3: Advanced Features (Planned)
- Approval workflows
- Attendance lockouts
- Advanced analytics
- Email notifications
- Multi-tenant support

## Tech Stack

- **Frontend**: Next.js 16.0.10 (App Router with Turbopack), React 19, TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Database**: SQLite via @libsql/client (Turso/libSQL client)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Lucide React
- **Data Export**: json2csv for CSV generation
- **Excel Processing**: xlsx library

## Authentication & Security

The application includes a complete authentication and authorization system:

- **User Management** - Create and manage user accounts
- **Group-Based Permissions** - Master, Managers, HR, and Employee groups
- **Audit Logging** - Complete tracking of all data changes
- **Secure Authentication** - JWT tokens with bcrypt password hashing

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`
- ⚠️ **IMPORTANT:** Change this password in production!

See [AUTH-SYSTEM.md](AUTH-SYSTEM.md) for complete authentication documentation.

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

> ⚠️ **IMPORTANT:** All databases are stored in the `databases/` folder at the project root. See [DATABASE-LOCATION.md](DATABASE-LOCATION.md) for details.

```bash
# Reset database (deletes all data and recreates with auth tables)
npm run db:reset

# Initialize database (create tables and seed data) - LEGACY
npm run db:init

# Run migrations only - LEGACY
npm run db:migrate

# Seed sample data - LEGACY
npm run db:seed
```

**Recommended:** Use `npm run db:reset` to initialize a fresh database with authentication tables and default admin user.

See [DATABASE-MANAGEMENT.md](DATABASE-MANAGEMENT.md) for complete database management documentation.

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── employees/           # Employee CRUD endpoints
│   │   ├── employee-allocations/ # Employee time allocation endpoints
│   │   ├── reports/             # Report generation endpoint
│   │   ├── time-codes/          # Time code endpoints
│   │   └── attendance/          # Attendance entry endpoints
│   ├── dashboard/               # Dashboard page (optional)
│   ├── reports/                 # Reports page (optional)
│   ├── settings/                # Settings page (theme selection, preferences)
│   ├── attendance/              # Main Attendance page
│   ├── globals.css              # Global styles with Tailwind
│   ├── layout.tsx               # Root layout with navbar
│   └── page.tsx                 # Home/landing page
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── balance-cards.tsx        # Time code balance display
│   ├── entry-edit-dialog.tsx   # Entry editing modal
│   ├── employee-allocations-dialog.tsx  # Employee time allocation management
│   ├── navbar.tsx               # Navigation bar
│   ├── providers.tsx            # Context providers (Auth, Theme)
│   └── attendance-grid.tsx      # Calendar grid component
├── lib/
│   ├── config.ts                # Feature flags and settings
│   ├── db-sqlite.ts             # Database connection
│   ├── queries-sqlite.ts        # Database queries
│   ├── schema.sql               # Database schema
│   ├── auth-context.tsx         # Authentication context provider
│   ├── theme-context.tsx        # Theme context provider
│   ├── themes/                  # Theme system
│   │   ├── types.ts            # Theme type definitions
│   │   ├── index.ts            # Theme registry
│   │   ├── trinity.ts          # Trinity theme (light)
│   │   ├── default.ts          # Default theme (dark)
│   │   └── README.md           # Theme creation guide
│   └── utils.ts                 # Utility functions
├── scripts/
│   ├── init-db.ts               # Database initialization
│   ├── migrate.js               # Database migration
│   ├── seed.js                  # Sample data seeding
│   └── read-excel.js            # Excel analysis tool
└── examples/
    └── employee attendance 1.xlsx  # Original Excel template
```

## Database Schema

The database includes the following tables:

**Core Tables:**
- `employees` - Employee records with group assignments
- `time_codes` - Time entry code definitions with default allocations
- `attendance_entries` - Daily time entries
- `employee_time_allocations` - Custom time off allocations per employee per year

**Authentication & Security Tables:**
- `users` - User accounts with encrypted passwords
- `groups` - User groups with permission levels
- `group_permissions` - Granular group-to-group permissions
- `audit_log` - Complete change tracking for all modifications

See [AUTH-SYSTEM.md](AUTH-SYSTEM.md) for detailed schema documentation.

## Configuration

The application uses feature flags to enable/disable optional features. Edit `lib/config.ts` to configure:

```typescript
export const config = {
  features: {
    enableDashboard: true,  // Enable/disable dashboard page
    enableReports: true,     // Enable/disable reports page
  },
  app: {
    name: 'Multi-User Attendance',
    version: '1.0.0',
  },
};
```

When features are disabled:
- Navigation links are hidden
- Landing page cards are hidden
- Direct access shows a "feature disabled" message

See [lib/CONFIG.md](lib/CONFIG.md) for detailed configuration documentation.

## Available Scripts

- `npm run dev` - Start development server on port 6029 (with Turbopack)
- `npm run build` - Build for production
- `npm run start` - Start production server on port 6029
- `npm run start:standalone` - Run standalone server from .next/standalone
- `npm run lint` - Run ESLint
- `npm run db:reset` - Reset database with authentication tables (recommended)
- `npm run db:init` - Initialize database with schema and seed data (legacy)
- `npm run db:migrate` - Run database migrations only (legacy)
- `npm run db:seed` - Seed sample data only (legacy)

**Default Port:** 6029 (can be changed in `.env` file)

## Features

### Theming System
- **Trinity Theme** - Light mode with original layout (Balance Cards → Attendance Record)
- **Default Theme** - Dark mode with optimized layout (Attendance Record → Balance Cards)
- Theme selection persists across sessions via localStorage
- Visual month separators in Default theme for improved readability
- Seamless theme switching without page reload
- **Easy to customize**: All themes defined in `lib/themes/` folder
- Create new themes by copying existing theme files and modifying colors/layout
- See [lib/themes/README.md](lib/themes/README.md) for complete theme creation guide

### Settings Page
- Centralized application preferences
- Theme selection (Trinity or Default)
- Accessible via navbar "Settings" link
- Clean, organized settings interface

### Attendance Grid
- Interactive 31-day × 12-month calendar
- Click any cell to edit time entry
- Visual indicators for entries with notes
- Invalid dates (e.g., Feb 31) automatically disabled
- Compact, responsive design
- Theme-dependent layout and styling

### Entry Editing
- Modal dialog for clean editing experience
- Time code selection with descriptions
- Hours input (0-24)
- Optional notes field
- Validation and error handling

### Balance Tracking
- Real-time calculation of time code usage
- Dynamic allocation limits per employee (customizable in Users tab)
- Progress bars for limited codes (Floating Holiday, Personal Sick, etc.)
- Color-coded remaining hours
- Separate cards for each time code type
- Automatic sync between Users tab (allocation management) and Attendance tab (balance display)

### Employee Time Allocations
- Customize time off allocations per employee per year
- Override default allocations (e.g., part-time employees with reduced PTO)
- Manage allocations via clock icon in Users tab
- Changes immediately reflected in Attendance tab balance cards
- Revert to defaults option for any allocation
- Support for mid-year adjustments and custom arrangements

### Dashboard (Optional)
- Total employees, entries, hours statistics
- Time code usage summary
- Employee activity summary
- Recent entries feed

### Reports (Optional)
- Filter by employee, time code, date range
- Sortable results table
- CSV export functionality
- Real-time query results

## Current Status

✅ **Phase 1: COMPLETE**
- Core Attendance functionality
- Dialog-based editing
- Balance tracking
- Dashboard and reports (optional)

⏳ **Phase 2: Planned**
- Employee-filtered views
- Personalized dashboards
- Access controls

⏳ **Phase 3: Planned**
- Approval workflows
- Advanced analytics
- Notifications
