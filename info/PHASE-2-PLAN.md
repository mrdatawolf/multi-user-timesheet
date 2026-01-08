# Phase 2: Employee Views & Enhanced Access Controls

## Overview

Phase 2 focuses on employee-centric features, personalized views, and enhanced access controls. This phase transforms the application from an admin-focused tool into a multi-user platform where employees can manage their own attendance while administrators retain full control.

## Goals

1. **Employee Self-Service** - Allow employees to view and manage their own attendance
2. **Filtered Views** - Enable filtering by employee, date range, and other criteria
3. **Personalized Dashboards** - Provide role-specific landing pages
4. **Enhanced Access Controls** - Implement row-level security and data filtering
5. **Improved User Experience** - Better navigation and context-aware UI

---

## Feature Breakdown

### 1. Employee-Filtered Attendance Views

**Priority: HIGH**
**Estimated Effort: Medium**

#### Current State
- Attendance page shows all employees (no filtering)
- Users select employee from dropdown
- No way to filter by date range
- No employee-specific default view

#### Target State
- Employees automatically see only their own attendance
- Admins/Managers can filter by employee
- URL-based employee selection (shareable links)
- Quick filters for current month, current year, custom ranges
- "My Attendance" vs "Team Attendance" views

#### Tasks

**1.1 Employee Auto-Selection**
- [ ] Detect user's employee record on page load
- [ ] Auto-select logged-in user's employee_id
- [ ] Show "My Attendance" header for self-view
- [ ] Add toggle to switch between "My Attendance" and "Team View" (for managers)

**1.2 URL-Based Employee Selection**
- [ ] Add `/attendance?employee=123` URL parameter support
- [ ] Parse employee_id from URL on page load
- [ ] Update URL when employee selection changes
- [ ] Enable shareable attendance links

**1.3 Employee Filter Component**
- [ ] Create employee search/filter dropdown
- [ ] Add "All Employees" option (admin only)
- [ ] Group employees by department/group
- [ ] Show employee number + name in dropdown
- [ ] Add keyboard navigation support

**1.4 Date Range Filters**
- [ ] Add date range picker component
- [ ] Pre-defined ranges: "Current Month", "Current Year", "Last 30 Days"
- [ ] Custom range selection
- [ ] Filter attendance grid by date range
- [ ] Update balance cards to reflect filtered range

**1.5 Access Control Integration**
- [ ] Hide employee dropdown for non-admin users
- [ ] Filter employee list based on user permissions
- [ ] Prevent unauthorized employee access via URL manipulation
- [ ] Show permission-denied message for restricted views

**Files to Modify:**
- `app/attendance/page.tsx` - Add filtering logic
- `components/employee-filter.tsx` - NEW: Employee filter component
- `components/date-range-picker.tsx` - NEW: Date range picker
- `lib/queries-sqlite.ts` - Add filtered query functions

---

### 2. Personalized Dashboards

**Priority: MEDIUM**
**Estimated Effort: Medium**

#### Current State
- Landing page (`/`) shows generic welcome or stats
- Same dashboard for all user types
- No role-specific information

#### Target State
- Employee landing: Personal attendance summary, upcoming time off
- Manager landing: Team overview, pending approvals (future)
- Admin landing: System statistics, recent activity
- Quick actions based on role

#### Tasks

**2.1 Employee Dashboard**
- [ ] Show current year attendance summary
- [ ] Display balance cards (personal allocations)
- [ ] Show upcoming time off (future entries)
- [ ] Quick link to "Enter Attendance" for today
- [ ] Month-to-date hours worked
- [ ] Attendance streak indicator

**2.2 Manager Dashboard**
- [ ] Team attendance overview
- [ ] Team members list with recent activity
- [ ] Time off calendar view (who's out when)
- [ ] Quick stats: team hours, absences this week
- [ ] Links to direct reports' attendance

**2.3 Admin Dashboard**
- [ ] System-wide statistics
- [ ] Recent audit log entries
- [ ] User activity metrics
- [ ] Database health indicators
- [ ] Quick actions: Add employee, View reports

**2.4 Dashboard Router**
- [ ] Create dashboard type selector based on user role
- [ ] Route to appropriate dashboard component
- [ ] Provide dashboard preference override in settings
- [ ] Cache dashboard data for performance

**Files to Modify:**
- `app/page.tsx` - Add role-based routing
- `components/dashboards/employee-dashboard.tsx` - NEW
- `components/dashboards/manager-dashboard.tsx` - NEW
- `components/dashboards/admin-dashboard.tsx` - NEW
- `lib/queries-sqlite.ts` - Add dashboard query functions

---

### 3. Enhanced Access Controls

**Priority: HIGH**
**Estimated Effort: Large**

#### Current State
- Basic authentication with JWT tokens
- Group-based permissions (Master, Manager, HR, Employee)
- `canUserViewGroup` and `canUserEditGroup` functions
- Manual permission checks in API routes

#### Target State
- Automatic row-level security
- Fine-grained permissions (view own, view team, view all)
- Permission-based UI element hiding
- Audit trail for permission checks
- Self-service profile editing with restrictions

#### Tasks

**3.1 Row-Level Security Middleware**
- [ ] Create middleware for automatic data filtering
- [ ] Apply user context to all queries
- [ ] Filter results based on group permissions
- [ ] Log permission check failures
- [ ] Provide override for admin queries

**3.2 Employee Self-Service**
- [ ] Allow employees to edit their own basic info (email, etc.)
- [ ] Restrict employees from editing employee_number, group_id
- [ ] Enable password change for own account
- [ ] Profile page with editable fields
- [ ] Require current password for sensitive changes

**3.3 Manager Team Access**
- [ ] Define manager-employee relationships (group-based or direct assignment)
- [ ] Allow managers to view team members' attendance
- [ ] Allow managers to edit team members' attendance (with audit)
- [ ] Restrict managers from viewing other teams
- [ ] Dashboard showing managed employees

**3.4 Permission Helper Functions**
- [ ] `canViewEmployee(userId, employeeId)` - Check view permission
- [ ] `canEditEmployee(userId, employeeId)` - Check edit permission
- [ ] `canViewAttendance(userId, employeeId)` - Attendance-specific
- [ ] `canEditAttendance(userId, employeeId)` - Edit attendance permission
- [ ] `getAccessibleEmployees(userId)` - List of viewable employees

**3.5 UI Permission Integration**
- [ ] Hide/disable edit buttons based on permissions
- [ ] Show read-only mode for restricted views
- [ ] Add permission indicators ("View Only", "Full Access")
- [ ] Graceful permission error messages
- [ ] Permission-aware navigation (hide restricted links)

**3.6 API Route Security Enhancement**
- [ ] Add permission checks to all API routes
- [ ] Return 403 Forbidden for unauthorized access
- [ ] Log unauthorized access attempts
- [ ] Rate limit failed permission checks
- [ ] Consistent error response format

**Files to Modify:**
- `lib/middleware/auth.ts` - Enhance with row-level security
- `lib/middleware/permissions.ts` - NEW: Permission helpers
- `lib/queries-auth.ts` - Add new permission functions
- `app/api/*/route.ts` - All API routes: Add permission checks
- `app/profile/page.tsx` - NEW: User profile page
- `components/permission-guard.tsx` - NEW: UI permission wrapper

---

### 4. Navigation & UX Improvements

**Priority: MEDIUM**
**Estimated Effort: Small**

#### Current State
- Static navbar with all links visible
- No breadcrumbs or context indicators
- No "quick actions" menu
- User dropdown shows minimal info

#### Target State
- Context-aware navigation
- Breadcrumbs showing current location
- Quick actions menu for common tasks
- Enhanced user dropdown with profile link
- Mobile-optimized navigation

#### Tasks

**4.1 Context-Aware Navbar**
- [ ] Show different nav items based on role
- [ ] Hide restricted pages from navigation
- [ ] Highlight active section
- [ ] Add "viewing as" indicator when admin views employee

**4.2 Breadcrumb Navigation**
- [ ] Add breadcrumb component
- [ ] Show path: Home > Attendance > John Doe > January 2025
- [ ] Clickable breadcrumb segments
- [ ] Mobile-collapsed breadcrumbs

**4.3 Quick Actions Menu**
- [ ] Add quick action button to navbar
- [ ] Context-sensitive actions (e.g., "Add Entry" when on attendance page)
- [ ] Keyboard shortcuts for common actions
- [ ] Recently accessed items

**4.4 Enhanced User Dropdown**
- [ ] Show user avatar/initials
- [ ] Add "My Profile" link
- [ ] Add "My Attendance" link (for employees)
- [ ] Show current role/group
- [ ] Theme switcher in dropdown

**4.5 Mobile Navigation**
- [ ] Hamburger menu for mobile
- [ ] Bottom navigation bar (optional)
- [ ] Swipe gestures for common actions
- [ ] Mobile-optimized dropdowns

**Files to Modify:**
- `components/navbar.tsx` - Enhanced navigation
- `components/breadcrumbs.tsx` - NEW: Breadcrumb component
- `components/quick-actions.tsx` - NEW: Quick actions menu
- `components/mobile-nav.tsx` - NEW: Mobile navigation

---

### 5. Employee Time Off Calendar View

**Priority: LOW**
**Estimated Effort: Medium**

#### Current State
- Grid view only (31 days × 12 months)
- No visual calendar representation
- Hard to see time off patterns

#### Target State
- Calendar view option (month view, week view)
- Color-coded time off types
- Team calendar showing who's out when
- Print-friendly view

#### Tasks

**5.1 Calendar Component**
- [ ] Integrate calendar library (react-big-calendar or similar)
- [ ] Display attendance entries as calendar events
- [ ] Color-code by time code type
- [ ] Click event to view/edit entry
- [ ] Month view with full details

**5.2 Team Calendar**
- [ ] Show multiple employees on one calendar
- [ ] Filter by team/group
- [ ] Export calendar view as PDF/image
- [ ] Overlay mode (see conflicts/coverage)

**5.3 View Toggle**
- [ ] Switch between grid view and calendar view
- [ ] Persist view preference
- [ ] Responsive calendar layout
- [ ] Print-optimized calendar view

**Files to Modify:**
- `app/attendance/page.tsx` - Add view toggle
- `components/attendance-calendar.tsx` - NEW: Calendar view
- `components/team-calendar.tsx` - NEW: Team calendar
- `package.json` - Add calendar library dependency

---

## Implementation Priority

### Sprint 1: Core Filtering & Access Controls (2-3 weeks)
1. Employee Auto-Selection (1.1)
2. Row-Level Security Middleware (3.1)
3. Permission Helper Functions (3.4)
4. API Route Security Enhancement (3.6)
5. Employee Self-Service (3.2)

**Goal:** Employees can log in and see only their own attendance safely.

### Sprint 2: Advanced Filtering & Manager Features (2 weeks)
1. URL-Based Employee Selection (1.2)
2. Employee Filter Component (1.3)
3. Date Range Filters (1.4)
4. Manager Team Access (3.3)
5. UI Permission Integration (3.5)

**Goal:** Managers can view/edit team member attendance with proper permissions.

### Sprint 3: Personalized Dashboards (2 weeks)
1. Employee Dashboard (2.1)
2. Manager Dashboard (2.2)
3. Admin Dashboard (2.3)
4. Dashboard Router (2.4)

**Goal:** Role-appropriate landing pages for all user types.

### Sprint 4: UX Polish & Calendar View (1-2 weeks)
1. Context-Aware Navbar (4.1)
2. Breadcrumb Navigation (4.2)
3. Quick Actions Menu (4.3)
4. Enhanced User Dropdown (4.4)
5. Mobile Navigation (4.5)
6. Calendar Component (5.1) - if time permits

**Goal:** Polished, professional user experience.

---

## Testing Requirements

### Unit Tests
- [ ] Permission helper functions
- [ ] Row-level security filtering
- [ ] Employee filter logic
- [ ] Date range calculations

### Integration Tests
- [ ] Employee can only view own attendance
- [ ] Manager can view team attendance
- [ ] Admin can view all attendance
- [ ] Unauthorized access returns 403
- [ ] URL manipulation doesn't bypass permissions

### E2E Tests
- [ ] Employee login → see personal dashboard
- [ ] Manager login → see team overview
- [ ] Filter employees by name
- [ ] Select date range and verify filtered data
- [ ] Switch between grid and calendar views

---

## Database Schema Changes

### New Tables

**employee_managers** (if needed for direct manager assignment)
```sql
CREATE TABLE IF NOT EXISTS employee_managers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  manager_user_id INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (manager_user_id) REFERENCES users(id)
);
```

### New Columns

**users table:**
- `employee_id INTEGER` - Link user account to employee record
- `last_login DATETIME` - Track last login for security
- `failed_login_attempts INTEGER DEFAULT 0` - Security feature

**employees table:**
- `manager_id INTEGER` - Direct manager reference (optional)
- `department TEXT` - Organizational grouping

---

## Configuration Changes

### lib/config.ts additions
```typescript
export const config = {
  features: {
    enableDashboard: true,
    enableReports: true,
    enableCalendarView: true,  // NEW
    enableEmployeeSelfService: true,  // NEW
    enableTeamView: true,  // NEW
  },
  permissions: {
    employeeCanEditOwnAttendance: true,  // NEW
    employeeCanViewOwnHistory: true,  // NEW
    managerCanEditTeamAttendance: true,  // NEW
    requireApprovalForPastEntries: false,  // FUTURE
  },
  app: {
    name: 'Multi-User Attendance',
    version: '2.0.0',  // Phase 2
  },
};
```

---

## Migration Plan

### Phase 1 → Phase 2 Migration Steps

1. **Database Migration**
   - Add new columns to users table
   - Add new columns to employees table
   - Create employee_managers table (if using direct assignment)
   - Migrate existing data (link users to employees)

2. **Code Migration**
   - Deploy permission middleware
   - Update all API routes with permission checks
   - Deploy new UI components incrementally
   - Update navbar with permission-aware logic

3. **User Communication**
   - Notify users of new self-service features
   - Provide training for managers on team view
   - Document new permission model
   - Create user guide for new features

4. **Rollback Plan**
   - Keep Phase 1 code in separate branch
   - Database migration is reversible
   - Feature flags to disable Phase 2 features
   - Rollback script prepared

---

## Success Metrics

### Technical Metrics
- All API routes have permission checks (100% coverage)
- No unauthorized data access (0 security issues in audit logs)
- Page load time < 2 seconds for filtered views
- Mobile-responsive on all pages (100% responsive)

### User Metrics
- Employee adoption rate > 80% (employees using self-service)
- Manager satisfaction with team view > 90%
- Reduced support tickets for "how do I view my attendance" (target: -50%)
- Increased user engagement (weekly active users +30%)

### Business Metrics
- Time saved on attendance management (target: 5 hours/week)
- Reduced data entry errors (target: -70%)
- Improved compliance with time-off policies
- Faster attendance report generation

---

## Dependencies

### New npm Packages
- `react-big-calendar` (^1.14.0) - Calendar view component
- `date-fns` (^3.0.0) - Date manipulation utilities
- `react-select` (^5.8.0) - Enhanced dropdown for employee filter

### External Services
- None required

---

## Documentation Updates

### Files to Create/Update
- [ ] Update README.md with Phase 2 features
- [ ] Create USER-GUIDE.md for employees
- [ ] Create MANAGER-GUIDE.md for managers
- [ ] Update AUTH-SYSTEM.md with new permissions
- [ ] Create PERMISSIONS-GUIDE.md
- [ ] Update DEPLOYMENT.md with migration steps

---

## Risk Assessment

### High Risk
- **Permission System Bugs** - Could expose sensitive data
  - Mitigation: Extensive testing, audit logging, gradual rollout

### Medium Risk
- **Performance Issues** - Row-level filtering could slow queries
  - Mitigation: Database indexing, query optimization, caching

### Low Risk
- **UI Complexity** - Too many filters could confuse users
  - Mitigation: Progressive disclosure, good defaults, user testing

---

## Phase 2 Completion Criteria

Phase 2 is complete when:
- [✓] All Sprint 1-4 tasks are completed
- [✓] All tests pass (unit, integration, E2E)
- [✓] Security audit completed with 0 critical issues
- [✓] Documentation updated and reviewed
- [✓] User training materials created
- [✓] Production deployment successful
- [✓] Post-deployment monitoring shows no issues for 1 week

---

## Next Phase Preview: Phase 3

**Phase 3: Workflow & Automation** (Future)
- Attendance approval workflows
- Email notifications for time off requests
- Calendar integrations (Google Calendar, Outlook)
- Automated time-off accrual calculations
- Advanced analytics and forecasting
- Mobile app (React Native)

---

**Document Version:** 1.0
**Created:** January 7, 2026
**Status:** Planning
**Expected Start:** After Phase 1 sign-off
**Expected Completion:** 6-8 weeks after start
