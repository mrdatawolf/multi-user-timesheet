# Multi-User Attendance Application

A modern Next.js-based employee Attendance management system that replaces Excel templates with an enhanced, responsive UI.

## Overview

This application digitizes the traditional Excel-based Attendance process with:
- **Calendar-based attendance entry** - Interactive 31 days × 12 months grid
- **Dialog-based editing** - Clean modal interface for entry management
- **Balance tracking** - Real-time tracking of time code usage and limits
- **Dashboard** - Statistics and summaries (optional feature)
- **Reports** - Filterable reports with CSV export (optional feature)
- **SQLite database** - Fast, reliable data persistence
- **Employee management** - Add and manage employee records
- **Time code tracking** - Vacation, Holiday, Personal, and more

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
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Lucide React
- **Data Export**: json2csv for CSV generation
- **Excel Processing**: xlsx library

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

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Database Management

```bash
# Initialize database (create tables and seed data)
npm run db:init

# Run migrations only
npm run db:migrate

# Seed sample data
npm run db:seed
```

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── employees/           # Employee CRUD endpoints
│   │   ├── reports/             # Report generation endpoint
│   │   ├── time-codes/          # Time code endpoints
│   │   └── attendance/          # Attendance entry endpoints
│   ├── dashboard/               # Dashboard page (optional)
│   ├── reports/                 # Reports page (optional)
│   ├── attendance/              # Main Attendance page
│   ├── globals.css              # Global styles with Tailwind
│   ├── layout.tsx               # Root layout with navbar
│   └── page.tsx                 # Home/landing page
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── balance-cards.tsx        # Time code balance display
│   ├── entry-edit-dialog.tsx   # Entry editing modal
│   ├── navbar.tsx               # Navigation bar
│   └── attendance-grid.tsx      # Calendar grid component
├── lib/
│   ├── config.ts                # Feature flags and settings
│   ├── db-sqlite.ts             # Database connection
│   ├── queries-sqlite.ts        # Database queries
│   ├── schema.sql               # Database schema
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

See [lib/schema.sql](lib/schema.sql) for the complete schema including:
- `employees` - Employee records
- `time_codes` - Time entry code definitions
- `attendance_entries` - Daily time entries
- `attendances` - Monthly Attendance grouping (for future approval workflows)

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

- `npm run dev` - Start development server (with Turbopack)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:init` - Initialize database with schema and seed data
- `npm run db:migrate` - Run database migrations only
- `npm run db:seed` - Seed sample data only

## Features

### Attendance Grid
- Interactive 31-day × 12-month calendar
- Click any cell to edit time entry
- Visual indicators for entries with notes
- Invalid dates (e.g., Feb 31) automatically disabled
- Compact, responsive design

### Entry Editing
- Modal dialog for clean editing experience
- Time code selection with descriptions
- Hours input (0-24)
- Optional notes field
- Validation and error handling

### Balance Tracking
- Real-time calculation of time code usage
- Progress bars for limited codes (Floating Holiday, Personal Sick)
- Color-coded remaining hours
- Separate cards for each time code type

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
