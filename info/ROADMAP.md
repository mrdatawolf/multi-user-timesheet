# Product Roadmap - Multi-User Timesheet Application

**Last Updated:** January 20, 2026
**Current Status:** Phase 6 In Progress

---

## Vision

Transform Excel-based timesheet tracking into a modern, secure web application with enterprise integrations, policy-driven leave management, and self-service capabilities.

---

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `info/` | Current phase being worked on |
| `info/COMPLETE/` | Completed phases |
| `info/ROADMAP/` | Approved future phases |
| `info/POTENTIAL/` | Phases under consideration |
| `info/SPECS/` | Technical specifications & documentation |

---

## Key Milestones

- [x] Excel replacement complete (Phase 1)
- [x] Multi-user security implemented (Phase 2)
- [x] Flexible time tracking enabled (Phase 3)
- [x] Data protection automated (Phase 4)
- [x] White labeling & brand URI (Phase 4.5)
- [ ] Interactive help system (Phase 6) ← **Current**
- [ ] Approval workflows (Phase 7)
- [ ] Policy automation (Phase 8)

---

## Current Phase

### Phase 6: Interactive Contextual Help System
**Status:** In Progress
**Plan:** [PHASE-6-PLAN.md](PHASE-6-PLAN.md)

Comprehensive contextual help system with modal overlays and interactive tooltips that guide users through each screen. Provides on-demand help bubbles explaining what each section does, how to use it, and how to update data.

**Key Deliverables:**
- ✅ Screen-level help with hover tooltips (What it is, How to use, How to update)
- ✅ Help toggle button in navbar
- ✅ Brand-specific help content (JSON files)
- ✅ HelpArea component with Radix UI Popover
- ⏳ Welcome tour for new users
- ✅ Brand-specific time codes (move from DB to JSON)
- ✅ Balance breakdown modals
- ✅ Groups management in Settings (super admin only)
- ✅ Job Titles management in Settings (super admin only)

**Impact:** Reduced support questions, improved user onboarding.

---

## Completed Phases

| Phase | Description | Plan |
|-------|-------------|------|
| **Phase 1** | Core Attendance System - Excel replacement with web-based attendance grid | - |
| **Phase 2** | Permission System - Multi-user security with granular permissions | [COMPLETE/PHASE-2-PLAN.md](COMPLETE/PHASE-2-PLAN.md) |
| **Phase 3** | Multiple Entries Per Day - Split shifts, multiple time codes | [COMPLETE/PHASE-3-PLAN.md](COMPLETE/PHASE-3-PLAN.md) |
| **Phase 4** | Automated Backups - 7-day, 4-week, 12-month retention | [COMPLETE/PHASE-4-PLAN.md](COMPLETE/PHASE-4-PLAN.md) |
| **Phase 4.5** | White Labeling & Brand URI - Build-time brand selection with configurable API URLs | - |

---

## Approved Roadmap

These phases have been approved for development after the current phase.

### Phase 7: Leave Request & Approval Workflow
**Plan:** [ROADMAP/PHASE-7-PLAN.md](ROADMAP/PHASE-7-PLAN.md)

Core request and approval workflow allowing managers to submit and approve leave requests on behalf of employees.

**Key Deliverables:**
- Leave request submission (by managers)
- Request states: Draft, Pending, Approved, Denied, Cancelled
- Supervisor approval workflow
- Manager approval dashboard
- Balance deduction on approval

---

### Phase 8: Policy Engine
**Plan:** [ROADMAP/PHASE-8-PLAN.md](ROADMAP/PHASE-8-PLAN.md)

Enforce organization-specific leave policies including eligibility rules, usage limits, and increment requirements.

**Key Deliverables:**
- Eligibility rules (90-day, 1-year, employment type requirements)
- Increment validation (full-day for floating holiday, 2hr minimum for sick)
- Maximum usage limits and bank caps
- Period lockouts for payroll processing

---

## Potential Phases

These phases are under consideration but not yet approved.

### Advanced Features (formerly Phase 5)
**Plan:** [POTENTIAL/PHASE-5-PLAN.md](POTENTIAL/PHASE-5-PLAN.md)

Enterprise-grade features including:
- Approval workflows for attendance submissions
- Attendance period lockouts
- Advanced analytics & trend analysis
- Email notifications
- Multi-tenant support

---

## Future Considerations

The following features may be considered for future phases:
- Interactive help system with tooltips and guided tours
- Employee self-service portal (read-only attendance view)
- External system integrations (ADP, Paychex, BambooHR)
- Mobile app for approvals
- Slack/Teams integration

---

## Architecture

**Current:** Next.js web application with SQLite database, JWT authentication, responsive UI, and build-time brand configuration.

**Phase 6+:** Leave management system, policy engine, approval workflows.

---

## Related Documents

- [SPECS/PHASE-5-9-SPEC.md](SPECS/PHASE-5-9-SPEC.md) - Detailed specifications for leave management
- [SPECS/BRAND-URI-CONFIGURATION.md](SPECS/BRAND-URI-CONFIGURATION.md) - Brand URI build configuration
- [SPECS/DEPLOYMENT.md](SPECS/DEPLOYMENT.md) - Deployment guide
- [SPECS/AUTH-SYSTEM.md](SPECS/AUTH-SYSTEM.md) - Authentication system details

---

**Document Version:** 3.0
**Visibility:** Superuser Only
