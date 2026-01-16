# Product Roadmap - Multi-User Timesheet Application

**Last Updated:** January 15, 2026
**Current Status:** Phase 4.5 Complete | Phase 5 Next

---

## Vision

Transform Excel-based timesheet tracking into a modern, secure web application with enterprise integrations, policy-driven leave management, and self-service capabilities.

---

## Key Milestones

- [x] Excel replacement complete
- [x] Multi-user security implemented
- [x] Flexible time tracking enabled
- [x] Data protection automated
- [x] White labeling enabled
- [ ] Employee data extended (Phase 5)
- [ ] Leave balance tracking (Phase 6)
- [ ] Approval workflows (Phase 7)
- [ ] Policy automation (Phase 8-9)
- [ ] Self-service portal (Phase 11)
- [ ] External integrations (Phase 12)

---

## Completed

### Phase 1: Core Attendance System
**Completed:** Q4 2025

Replaced Excel templates with an interactive web-based attendance grid. Includes employee management, time code tracking, balance cards, and basic reporting.

**Impact:** Foundation for all future features. Users can now track attendance online instead of Excel.

---

### Phase 2: Permission System
**Completed:** January 2026

Added user management with granular permissions. Managers can control which employees they see and edit. Superusers have full system access. Includes automatic database migrations for safe updates.

**Impact:** Multi-user collaboration with enterprise-grade security.

---

### Phase 3: Multiple Entries Per Day
**Completed:** January 2026

Employees can now have multiple attendance entries on the same day (e.g., split shifts, multiple time codes).

**Impact:** Handles real-world scheduling complexity.

---

### Phase 4: Automated Backups
**Completed:** January 2026

Database backup system with 7-day, 4-week, and 12-month retention. Includes manual backup creation, restore, download, and integrity verification. Backups are accessible from Settings page for administrators.

**Impact:** Data protection and compliance-ready backup strategy.

---

### Phase 4.5: White Labeling
**Completed:** January 2026

Build-time brand selection system allowing the application to be white-labeled for different organizations. Brand assets (logos) are stored in organized folders under public/. Run `npm run select-brand` to choose brand before building.

**Impact:** Single codebase supports multiple branded deployments.

---

## Planned

### Phase 5: Employee Data & Brand Features
**Target:** Q1 - Week 4 2026

Extend employee records with HR-relevant fields and implement brand-specific feature configuration. This phase lays the foundation for leave management and policy enforcement.

**Key Deliverables:**
- Employee fields: hire_date, rehire_date, employment_type, seniority_rank
- Brand feature configuration files (brand-features.json per brand)
- Feature flag utility for checking enabled features
- UI updates for employee management
- Database migration scripts

**Impact:** Foundation for brand-specific policies and leave management.

See: [PHASE-5-9-SPEC.md](PHASE-5-9-SPEC.md) for detailed specifications.

---

### Phase 6: Leave Types & Balance Tracking
**Target:** Q1 - Week 5 2026

Define leave types and track balances per employee. Enables manual balance management before automated accruals are implemented.

**Key Deliverables:**
- Leave types table (Vacation, Sick, Floating Holiday, Paid Holiday)
- Per-brand leave type configuration
- Balance tracking per employee per leave type
- Manual balance entry/adjustment by managers
- Balance display on employee cards
- Year boundary handling (calendar year vs vacation year)

**Impact:** Visibility into employee leave balances.

---

### Phase 7: Leave Request & Approval Workflow
**Target:** Q1 - Week 5 2026

Core request and approval workflow allowing managers to submit and approve leave requests on behalf of employees.

**Key Deliverables:**
- Leave request submission (by managers)
- Request states: Draft, Pending, Approved, Denied, Cancelled
- Supervisor approval workflow
- Super admin delegation for absent supervisors
- Manager approval dashboard
- Request history and audit log
- Balance deduction on approval

**Impact:** Formalized leave request process with approval chain.

---

### Phase 8: Policy Engine
**Target:** Q1 - Week 6 2026

Enforce organization-specific leave policies including eligibility rules, usage limits, and increment requirements.

**Key Deliverables:**
- Eligibility rules (90-day, 1-year, employment type requirements)
- Increment validation (full-day for floating holiday, 2hr minimum for sick)
- Maximum usage limits (40hr/year sick, 24hr floating holiday)
- Bank maximum enforcement (80hr sick leave cap)
- Pro-rated floating holiday calculation based on anniversary date
- Period lockouts for payroll processing

**Impact:** Automated policy compliance and reduced manual oversight.

---

### Phase 9: Accruals & Payouts
**Target:** Q1 - Week 6 2026

Automated balance calculations including accruals, payouts, and year-end processing.

**Key Deliverables:**
- Sick leave accrual engine (1hr per 30hrs worked)
- Configurable payout date calculations (December 15, June 1)
- Payout reports for payroll export
- Year-end rollover processing
- Documentation requirement tracking (doctor's note for 3+ consecutive days)

**Impact:** Reduced manual calculation and automated compliance.

---

### Phase 10: Interactive Help System
**Target:** Q1 - Week 7 2026

Built-in help overlays, tooltips, guided tours, and contextual documentation throughout the application.

**Impact:** Reduced training time and improved user adoption.

---

### Phase 11: Employee Self-Service Portal
**Target:** Q1 - Week 7 2026

Employees can log in to view their own attendance (read-only), see personalized dashboards, and access calendar views. Managers get "My Team" views and team calendars.

**Impact:** Employee self-service reduces manager workload.

---

### Phase 12: External System Integrations
**Target:** Q1 - Week 8 2026

Integration with ADP Workforce Now for employee sync and timecard export. Framework designed to support future integrations with Paychex, Gusto, BambooHR, and other HR/payroll systems.

**Impact:** Single source of truth across all business systems.

---

## Architecture

**Current:** Next.js web application with SQLite database, JWT authentication, and responsive UI.

**Phase 5+:** Brand-specific feature configuration, leave management system, policy engine.

**Future:** Employee portal, external API integrations, and advanced analytics.

---


## Related Documents

- [PHASE-5-9-SPEC.md](PHASE-5-9-SPEC.md) - Detailed specifications for leave management phases

---

**Document Version:** 2.0
**Visibility:** Superuser Only
**Next Review:** Week 4 2026
