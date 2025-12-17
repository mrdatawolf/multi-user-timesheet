# Multi-User Timesheet Application

A Next.js-based employee timesheet management system replacing Excel templates with an enhanced UI.

## Overview

This application digitizes the traditional Excel-based timesheet process with:
- Calendar-based timesheet entry (31 days × 12 months)
- Enhanced UI components (dropdowns, autocomplete, date pickers)
- SQLite database for data persistence
- Employee management
- Time code tracking (Vacation, Holiday, Personal, etc.)

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

### Phase 1: Timesheet Entry UI
- Replicate Excel layout with enhanced components
- Calendar grid (days 1-31 across columns, months down rows)
- Employee header information
- Vacation/Holiday balance tracking
- SQLite database storage

### Phase 2: Employee Views
- Filter timesheets by employee name
- Filter by date ranges
- Personalized employee dashboards

### Phase 3: Reports & Analytics
- Generate required reports
- Export capabilities
- Analytics dashboard

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Database**: SQLite (sql.js - pure JavaScript, no native bindings)
- **Styling**: Tailwind CSS
- **Excel Processing**: xlsx library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Initialize database
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db.ts             # Database connection
│   ├── schema.sql        # Database schema
│   └── utils.ts          # Utility functions
├── scripts/
│   ├── migrate.js        # Database migration script
│   └── read-excel.js     # Excel analysis tool
└── examples/
    └── employee attendance 1.xlsx  # Original Excel template
```

## Database Schema

See [lib/schema.sql](lib/schema.sql) for the complete schema including:
- `employees` - Employee records
- `time_codes` - Time entry code definitions
- `timesheet_entries` - Daily time entries
- `timesheets` - Monthly timesheet grouping (for future approval workflows)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations

## Current Status

✅ Project scaffolded with Next.js + shadcn/ui
✅ Database schema designed
✅ Excel template analyzed
⏳ Phase 1: Building timesheet entry UI
⏳ Phase 2: Employee filtered views
⏳ Phase 3: Reports generation
