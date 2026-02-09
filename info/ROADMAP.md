# Product Roadmap - Multi-User Timesheet Application

**Last Updated:** February 5, 2026
**Current Status:** Phase 7 In Progress

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
- [x] Interactive help system (Phase 6)
- [ ] Reporting system (Phase 7) ← **Current**
- [ ] Approval workflows (Phase 8)
- [ ] Policy automation (Phase 9)

---

## Current Phase

### Phase 7: Reporting System
**Status:** In Progress
**Plan:** [PHASE-7-PLAN.md](PHASE-7-PLAN.md)

Flexible reporting system that supports both common reports shared across all brands and brand-specific custom reports.

**Key Deliverables:**
- ✅ Reports landing page
- ✅ Report filters and table components
- ✅ Leave Balance Summary report
- ✅ CSV export functionality
- ✅ Permission-filtered report data
- ✅ Color customization for time codes and status indicators
- ⏳ Additional common reports (Attendance Summary, Time-Off Calendar)
- ⏳ Custom report engine (JSON-driven)

**Impact:** Better visibility into attendance data, customizable appearance.

---

## Completed Phases

| Phase | Description | Plan |
|-------|-------------|------|
| **Phase 1** | Core Attendance System - Excel replacement with web-based attendance grid | - |
| **Phase 2** | Permission System - Multi-user security with granular permissions | [COMPLETE/PHASE-2-PLAN.md](COMPLETE/PHASE-2-PLAN.md) |
| **Phase 3** | Multiple Entries Per Day - Split shifts, multiple time codes | [COMPLETE/PHASE-3-PLAN.md](COMPLETE/PHASE-3-PLAN.md) |
| **Phase 4** | Automated Backups - 7-day, 4-week, 12-month retention | [COMPLETE/PHASE-4-PLAN.md](COMPLETE/PHASE-4-PLAN.md) |
| **Phase 4.5** | White Labeling & Brand URI - Build-time brand selection with configurable API URLs | - |
| **Phase 6** | Contextual Help & Admin Settings - Help system, groups/job titles management, color customization | [PHASE-6-PLAN.md](PHASE-6-PLAN.md) |

---

## Approved Roadmap

These phases have been approved for development after the current phase.

### Phase 8: Leave Request & Approval Workflow
**Plan:** [ROADMAP/PHASE-8-PLAN.md](ROADMAP/PHASE-8-PLAN.md)

Core request and approval workflow allowing managers to submit and approve leave requests on behalf of employees.

**Key Deliverables:**
- Leave request submission (by managers)
- Request states: Draft, Pending, Approved, Denied, Cancelled
- Supervisor approval workflow
- Manager approval dashboard
- Balance deduction on approval

---

### Phase 9: Policy Engine
**Plan:** [ROADMAP/PHASE-9-PLAN.md](ROADMAP/PHASE-9-PLAN.md)

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
- Employee self-service portal (read-only attendance view)
- External system integrations (ADP, Paychex, BambooHR)
- Mobile app for approvals
- Slack/Teams integration

---

## Architecture

**Current:** Next.js web application with SQLite database, JWT authentication, responsive UI, build-time brand configuration, and customizable color themes.

**Phase 8+:** Leave management system, policy engine, approval workflows.

---

## Related Documents

- [SPECS/PHASE-5-9-SPEC.md](SPECS/PHASE-5-9-SPEC.md) - Detailed specifications for leave management
- [SPECS/BRAND-URI-CONFIGURATION.md](SPECS/BRAND-URI-CONFIGURATION.md) - Brand URI build configuration
- [SPECS/DEPLOYMENT.md](SPECS/DEPLOYMENT.md) - Deployment guide
- [SPECS/AUTH-SYSTEM.md](SPECS/AUTH-SYSTEM.md) - Authentication system details

---

**Document Version:** 4.0
**Visibility:** Superuser Only
