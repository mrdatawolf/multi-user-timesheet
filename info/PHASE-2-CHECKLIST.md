# Phase 2 Implementation Checklist

Quick reference for tracking Phase 2 development progress.

## Sprint 1: Core Filtering & Access Controls ⏳

### Employee Auto-Selection (Feature 1.1)
- [ ] Detect user's employee record on page load
- [ ] Auto-select logged-in user's employee_id
- [ ] Show "My Attendance" header for self-view
- [ ] Add toggle to switch between "My Attendance" and "Team View" (for managers)

### Row-Level Security Middleware (Feature 3.1)
- [ ] Create middleware for automatic data filtering
- [ ] Apply user context to all queries
- [ ] Filter results based on group permissions
- [ ] Log permission check failures
- [ ] Provide override for admin queries

### Permission Helper Functions (Feature 3.4)
- [ ] Implement `canViewEmployee(userId, employeeId)`
- [ ] Implement `canEditEmployee(userId, employeeId)`
- [ ] Implement `canViewAttendance(userId, employeeId)`
- [ ] Implement `canEditAttendance(userId, employeeId)`
- [ ] Implement `getAccessibleEmployees(userId)`
- [ ] Write unit tests for all permission functions

### API Route Security Enhancement (Feature 3.6)
- [ ] Add permission checks to `/api/attendance` routes
- [ ] Add permission checks to `/api/employees` routes
- [ ] Add permission checks to `/api/employee-allocations` routes
- [ ] Add permission checks to `/api/time-codes` routes
- [ ] Add permission checks to `/api/reports` routes
- [ ] Return 403 Forbidden for unauthorized access
- [ ] Log unauthorized access attempts
- [ ] Add rate limiting for failed permission checks

### Employee Self-Service (Feature 3.2)
- [ ] Create `/app/profile/page.tsx` for user profile
- [ ] Allow employees to edit email and contact info
- [ ] Restrict editing of employee_number, group_id, role
- [ ] Enable password change with current password verification
- [ ] Add audit logging for profile changes

---

## Sprint 2: Advanced Filtering & Manager Features ⏳

### URL-Based Employee Selection (Feature 1.2)
- [ ] Add URL parameter parsing for `?employee=123`
- [ ] Auto-load employee from URL on page mount
- [ ] Update URL when employee selection changes
- [ ] Handle invalid employee IDs gracefully

### Employee Filter Component (Feature 1.3)
- [ ] Create `components/employee-filter.tsx`
- [ ] Implement employee search functionality
- [ ] Add "All Employees" option (admin only)
- [ ] Group employees by department/group
- [ ] Add keyboard navigation (arrow keys, enter)
- [ ] Show employee number + name format

### Date Range Filters (Feature 1.4)
- [ ] Create `components/date-range-picker.tsx`
- [ ] Add pre-defined ranges (Current Month, Year, Last 30 Days)
- [ ] Implement custom range selection
- [ ] Filter attendance grid by selected range
- [ ] Update balance cards to reflect filtered range
- [ ] Persist selected range in localStorage

### Manager Team Access (Feature 3.3)
- [ ] Define manager-employee relationships (group-based)
- [ ] Allow managers to view team members' attendance
- [ ] Allow managers to edit team members' attendance
- [ ] Restrict managers from viewing other teams
- [ ] Add team member list to manager dashboard
- [ ] Log manager edits to team attendance

### UI Permission Integration (Feature 3.5)
- [ ] Hide/disable edit buttons based on permissions
- [ ] Show read-only mode for restricted views
- [ ] Add permission indicators ("View Only", "Full Access")
- [ ] Create `components/permission-guard.tsx` wrapper
- [ ] Add graceful permission error messages
- [ ] Hide restricted navigation links

---

## Sprint 3: Personalized Dashboards ⏳

### Employee Dashboard (Feature 2.1)
- [ ] Create `components/dashboards/employee-dashboard.tsx`
- [ ] Show current year attendance summary
- [ ] Display personal balance cards
- [ ] Show upcoming time off entries
- [ ] Add "Enter Attendance for Today" quick action
- [ ] Show month-to-date hours worked
- [ ] Add attendance streak indicator

### Manager Dashboard (Feature 2.2)
- [ ] Create `components/dashboards/manager-dashboard.tsx`
- [ ] Show team attendance overview
- [ ] List team members with recent activity
- [ ] Add time off calendar view (who's out when)
- [ ] Show quick stats (team hours, absences this week)
- [ ] Add links to direct reports' attendance

### Admin Dashboard (Feature 2.3)
- [ ] Create `components/dashboards/admin-dashboard.tsx`
- [ ] Show system-wide statistics
- [ ] Display recent audit log entries
- [ ] Add user activity metrics
- [ ] Show database health indicators
- [ ] Add quick actions (Add employee, View reports)

### Dashboard Router (Feature 2.4)
- [ ] Create dashboard type selector based on user role
- [ ] Route to appropriate dashboard component
- [ ] Add dashboard preference override in settings
- [ ] Implement dashboard data caching
- [ ] Add loading states for dashboard data

---

## Sprint 4: UX Polish & Calendar View ⏳

### Context-Aware Navbar (Feature 4.1)
- [ ] Show different nav items based on role
- [ ] Hide restricted pages from navigation
- [ ] Highlight active section
- [ ] Add "viewing as" indicator for admin impersonation

### Breadcrumb Navigation (Feature 4.2)
- [ ] Create `components/breadcrumbs.tsx`
- [ ] Show path: Home > Attendance > Employee > Month
- [ ] Make breadcrumb segments clickable
- [ ] Add mobile-collapsed breadcrumbs

### Quick Actions Menu (Feature 4.3)
- [ ] Create `components/quick-actions.tsx`
- [ ] Add quick action button to navbar
- [ ] Implement context-sensitive actions
- [ ] Add keyboard shortcuts for common actions
- [ ] Show recently accessed items

### Enhanced User Dropdown (Feature 4.4)
- [ ] Add user avatar/initials display
- [ ] Add "My Profile" link to dropdown
- [ ] Add "My Attendance" link (for employees)
- [ ] Show current role/group in dropdown
- [ ] Add theme switcher to dropdown

### Mobile Navigation (Feature 4.5)
- [ ] Create `components/mobile-nav.tsx`
- [ ] Implement hamburger menu for mobile
- [ ] Add bottom navigation bar (optional)
- [ ] Implement swipe gestures for common actions
- [ ] Optimize dropdowns for mobile

### Calendar Component (Feature 5.1) - Optional
- [ ] Install calendar library (react-big-calendar)
- [ ] Create `components/attendance-calendar.tsx`
- [ ] Display attendance entries as calendar events
- [ ] Color-code by time code type
- [ ] Make events clickable to view/edit
- [ ] Add view toggle (grid vs calendar)

---

## Database Migrations

- [ ] Add `employee_id` column to `users` table
- [ ] Add `last_login` column to `users` table
- [ ] Add `failed_login_attempts` column to `users` table
- [ ] Add `manager_id` column to `employees` table (optional)
- [ ] Add `department` column to `employees` table (optional)
- [ ] Create `employee_managers` table (if using direct assignment)
- [ ] Create indexes for performance (employee_id, group_id, etc.)
- [ ] Write migration scripts for existing data

---

## Testing

### Unit Tests
- [ ] Test permission helper functions
- [ ] Test row-level security filtering logic
- [ ] Test employee filter component
- [ ] Test date range calculations
- [ ] Test dashboard data aggregation

### Integration Tests
- [ ] Test employee can only view own attendance
- [ ] Test manager can view team attendance
- [ ] Test admin can view all attendance
- [ ] Test unauthorized access returns 403
- [ ] Test URL manipulation doesn't bypass permissions

### E2E Tests
- [ ] Test employee login → personal dashboard flow
- [ ] Test manager login → team overview flow
- [ ] Test filter employees by name
- [ ] Test select date range and verify data
- [ ] Test switch between grid and calendar views
- [ ] Test permission-denied scenarios

---

## Documentation

- [ ] Update README.md with Phase 2 features
- [ ] Create USER-GUIDE.md for employees
- [ ] Create MANAGER-GUIDE.md for managers
- [ ] Update AUTH-SYSTEM.md with new permissions
- [ ] Create PERMISSIONS-GUIDE.md
- [ ] Update DEPLOYMENT.md with migration steps
- [ ] Create video tutorials for common tasks

---

## Deployment

- [ ] Run database migrations on staging
- [ ] Deploy Phase 2 to staging environment
- [ ] Conduct security audit
- [ ] User acceptance testing (UAT)
- [ ] Performance testing and optimization
- [ ] Create rollback plan
- [ ] Deploy to production
- [ ] Monitor for 1 week post-deployment
- [ ] Gather user feedback

---

## Configuration Updates

- [ ] Add `enableCalendarView` to `lib/config.ts`
- [ ] Add `enableEmployeeSelfService` to `lib/config.ts`
- [ ] Add `enableTeamView` to `lib/config.ts`
- [ ] Add permissions config section
- [ ] Update version to 2.0.0
- [ ] Document all new configuration options

---

## Success Criteria

- [ ] All API routes have permission checks (100%)
- [ ] Zero unauthorized data access in audit logs
- [ ] Page load time < 2 seconds for filtered views
- [ ] Mobile-responsive on all pages (100%)
- [ ] Employee adoption rate > 80%
- [ ] Manager satisfaction > 90%
- [ ] Support tickets reduced by 50%

---

**Last Updated:** January 7, 2026
**Status:** Planning → Ready to Start
