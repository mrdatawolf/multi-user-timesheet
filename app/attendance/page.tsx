"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { AttendanceGridYear } from '@/components/attendance-grid';
import { AttendanceGridMonth } from '@/components/attendance-grid-month';
import { AttendanceGridWeek } from '@/components/attendance-grid-week';
import { AttendanceGridYearCalendar } from '@/components/attendance-grid-year-calendar';
import { ViewToggle } from '@/components/view-toggle';
import { PeriodNavigator } from '@/components/period-navigator';
import type { AttendanceEntry, DailySummary, ViewType } from '@/lib/attendance-types';
import { formatDateStr, parseDateStr, getWeekBounds, navigatePeriod, getPeriodLabel } from '@/lib/date-helpers';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BalanceCards } from '@/components/balance-cards';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { UserPlus, CalendarRange } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth-context';
import { useHelp } from '@/lib/help-context';
import { HelpArea } from '@/components/help-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getBrandFeatures, getCompanyHolidayDates, isGlobalReadAccessEnabled, getAttendanceYearLayout, getBulkEntryConfig } from '@/lib/brand-features';
import { BulkEntryDialog } from '@/components/bulk-entry-dialog';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
  email?: string;
  role: string;
  group_id?: number;
}

interface Group {
  id: number;
  name: string;
  is_master?: number;
}

interface TimeCode {
  id: number;
  code: string;
  description: string;
  hours_limit?: number;
}

interface TimeAllocation {
  time_code: string;
  description: string;
  default_allocation: number | null;
  allocated_hours: number | null;
  is_override: boolean;
}

function getInitialView(searchParams: URLSearchParams): ViewType {
  const urlView = searchParams.get('view') as ViewType;
  if (urlView && ['year', 'month', 'week'].includes(urlView)) return urlView;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('attendance_view') as ViewType;
    if (stored && ['year', 'month', 'week'].includes(stored)) return stored;
  }
  return 'year';
}

function getInitialDate(searchParams: URLSearchParams): Date {
  const monthParam = searchParams.get('month');
  const weekParam = searchParams.get('week');
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    return parseDateStr(monthParam + '-01');
  }
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    return parseDateStr(weekParam);
  }
  return new Date();
}

function AttendanceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, authFetch } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [allocations, setAllocations] = useState<TimeAllocation[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>();
  const [year, setYear] = useState(() => {
    const initialDate = getInitialDate(searchParams);
    return initialDate.getFullYear();
  });
  const [loading, setLoading] = useState(true);
  const [companyHolidays, setCompanyHolidays] = useState<Set<string>>(new Set());
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [totalActiveEmployees, setTotalActiveEmployees] = useState<number>(0);
  const [maxOutOfOffice, setMaxOutOfOffice] = useState<number>(0);
  const [capacityWarningCount, setCapacityWarningCount] = useState<number>(3);
  const [capacityCriticalCount, setCapacityCriticalCount] = useState<number>(5);
  const [globalReadEnabled, setGlobalReadEnabled] = useState(false);
  const [yearLayout, setYearLayout] = useState<'table' | 'calendar'>('table');
  const [bulkEntryOpen, setBulkEntryOpen] = useState(false);
  const [bulkEntryEnabled, setBulkEntryEnabled] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [allEmployeesEntries, setAllEmployeesEntries] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);
  const { setCurrentScreen } = useHelp();

  // View state
  const [view, setView] = useState<ViewType>(() => getInitialView(searchParams));
  const [currentDate, setCurrentDate] = useState<Date>(() => getInitialDate(searchParams));

  // Responsive auto-switch: year → week on small screens
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (isSmallScreen && view === 'year') {
      setView('week');
    }
  }, [isSmallScreen]);

  // Sync view + period to localStorage and URL
  useEffect(() => {
    localStorage.setItem('attendance_view', view);

    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'month') {
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      params.set('month', `${currentDate.getFullYear()}-${m}`);
    } else if (view === 'week') {
      const { start } = getWeekBounds(currentDate);
      params.set('week', start);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [view, currentDate, pathname, router]);

  // Set the current screen for help context
  useEffect(() => {
    setCurrentScreen('attendance');
  }, [setCurrentScreen]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedEmployeeId && !viewAll && isAuthenticated) {
      loadAttendanceData();
    }
  }, [selectedEmployeeId, year, isAuthenticated, viewAll]);

  useEffect(() => {
    if (viewAll && isAuthenticated) {
      loadAllEmployeesData();
    }
  }, [viewAll, year, isAuthenticated]);

  // Reload company holidays when year changes
  useEffect(() => {
    const loadHolidays = async () => {
      const brandFeatures = await getBrandFeatures();
      const holidays = getCompanyHolidayDates(brandFeatures, year);
      setCompanyHolidays(holidays);
    };
    loadHolidays();
  }, [year]);

  // Reload data when navigating to attendance page
  useEffect(() => {
    if (pathname === '/attendance' && isAuthenticated) {
      if (viewAll) {
        loadAllEmployeesData();
      } else if (selectedEmployeeId) {
        loadAttendanceData();
      }
    }
  }, [pathname]);

  // Re-fetch daily summary when office presence is toggled (via navbar buttons)
  useEffect(() => {
    const handlePresenceChange = () => {
      if (selectedEmployeeId && isAuthenticated && globalReadEnabled) {
        loadAttendanceData();
      }
    };
    window.addEventListener('office-presence-changed', handlePresenceChange);
    return () => window.removeEventListener('office-presence-changed', handlePresenceChange);
  }, [selectedEmployeeId, isAuthenticated, globalReadEnabled]);

  const loadInitialData = async () => {
    if (!isAuthenticated) {
      console.warn('Cannot load initial data: not authenticated');
      return;
    }

    try {
      // Load brand features for company holidays and global read access
      const brandFeatures = await getBrandFeatures();
      const holidays = getCompanyHolidayDates(brandFeatures, year);
      setCompanyHolidays(holidays);
      setGlobalReadEnabled(isGlobalReadAccessEnabled(brandFeatures));
      setYearLayout(getAttendanceYearLayout(brandFeatures));
      setBulkEntryEnabled(getBulkEntryConfig(brandFeatures).enabled);

      const [employeesRes, timeCodesRes, groupsRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/time-codes'),
        authFetch('/api/groups'),
      ]);

      // If redirected to login due to expired session, stop processing
      if (employeesRes.status === 401 || timeCodesRes.status === 401) {
        return;
      }

      const employeesData = await employeesRes.json();
      const timeCodesData = await timeCodesRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : [];

      // Validate that we received arrays
      if (Array.isArray(groupsData)) {
        // Exclude master groups from the filter (they're admin-only)
        setGroups(groupsData.filter((g: Group) => !g.is_master));
      }

      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
        if (employeesData.length > 0 && !selectedEmployeeId) {
          // Default to "All" when there are multiple employees
          if (employeesData.length > 1) {
            setViewAll(true);
          } else {
            // Prefer the user's linked employee, fall back to first in list
            const linkedEmployee = user?.employee_id
              ? employeesData.find((e: Employee) => e.id === user.employee_id)
              : null;
            setSelectedEmployeeId(linkedEmployee ? linkedEmployee.id : employeesData[0].id);
          }
        }
      } else {
        console.error('Invalid employees data:', employeesData);
        setEmployees([]);
      }

      if (Array.isArray(timeCodesData)) {
        setTimeCodes(timeCodesData);
      } else {
        console.error('Invalid time codes data:', timeCodesData);
        setTimeCodes([]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setEmployees([]);
      setTimeCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedEmployeeId || !isAuthenticated) return;

    try {
      // Build parallel fetch list
      const fetches: Promise<Response>[] = [
        authFetch(`/api/attendance?employeeId=${selectedEmployeeId}&year=${year}`),
        authFetch(`/api/employee-allocations?employeeId=${selectedEmployeeId}&year=${year}`),
      ];

      // Also fetch daily summary if global read access is enabled
      if (globalReadEnabled) {
        fetches.push(authFetch(`/api/attendance/daily-summary?year=${year}`));
      }

      const results = await Promise.all(fetches);
      const [attendanceRes, allocationsRes] = results;
      const summaryRes = globalReadEnabled ? results[2] : null;

      // If redirected to login due to expired session, stop processing
      if (attendanceRes.status === 401 || allocationsRes.status === 401) {
        return;
      }

      const attendanceData = await attendanceRes.json();
      const allocationsData = await allocationsRes.json();

      // Validate that we received an array for attendance
      if (Array.isArray(attendanceData)) {
        setEntries(attendanceData);
      } else {
        console.error('Invalid attendance data:', attendanceData);
        setEntries([]);
      }

      // Validate and set allocations
      if (allocationsData && Array.isArray(allocationsData.allocations)) {
        setAllocations(allocationsData.allocations);
      } else {
        console.error('Invalid allocations data:', allocationsData);
        setAllocations([]);
      }

      // Process daily summary if available
      if (summaryRes && summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setDailySummary(summaryData.dailySummary || null);
        setTotalActiveEmployees(summaryData.totalActiveEmployees || 0);
        setMaxOutOfOffice(summaryData.maxOutOfOffice || 0);
        setCapacityWarningCount(summaryData.capacityWarningCount ?? 3);
        setCapacityCriticalCount(summaryData.capacityCriticalCount ?? 5);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setEntries([]);
      setAllocations([]);
    }
  };

  const loadAllEmployeesData = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`/api/attendance?year=${year}`);
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        setAllEmployeesEntries(Array.isArray(data) ? data : []);
      } else {
        setAllEmployeesEntries([]);
      }
      // Also refresh daily summary when viewing all
      if (globalReadEnabled) {
        const summaryRes = await authFetch(`/api/attendance/daily-summary?year=${year}`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setDailySummary(summaryData.dailySummary || null);
          setTotalActiveEmployees(summaryData.totalActiveEmployees || 0);
          setMaxOutOfOffice(summaryData.maxOutOfOffice || 0);
          setCapacityWarningCount(summaryData.capacityWarningCount ?? 3);
          setCapacityCriticalCount(summaryData.capacityCriticalCount ?? 5);
        }
      }
    } catch (error) {
      console.error('Failed to load all employees data:', error);
      setAllEmployeesEntries([]);
    }
  };

  const handleEntryChange = async (date: string, updatedEntries: AttendanceEntry[], employeeId?: number) => {
    const targetEmployeeId = employeeId ?? selectedEmployeeId;
    if (!targetEmployeeId || !isAuthenticated) {
      if (viewAll && isAuthenticated) {
        toast({
          title: 'Select an employee to edit',
          description: 'Choose a specific employee from the dropdown to make changes.',
        });
      }
      return;
    }

    try {
      // Send batch update to API
      const response = await authFetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_day',
          employee_id: targetEmployeeId,
          entry_date: date,
          entries: updatedEntries,
        }),
      });

      // If redirected to login due to expired session, stop processing
      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      // Reload attendance data to show updated entries
      if (viewAll) {
        await loadAllEmployeesData();
      } else {
        await loadAttendanceData();
      }

      toast({
        title: 'Attendance Saved',
        description: updatedEntries.length === 0
          ? 'Entries deleted successfully.'
          : `${updatedEntries.length} ${updatedEntries.length === 1 ? 'entry' : 'entries'} saved successfully.`,
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'There was an error saving your attendance. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Navigation handlers
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const newDate = navigatePeriod(view, currentDate, direction);
    setCurrentDate(newDate);
    const newYear = newDate.getFullYear();
    if (newYear !== year) {
      setYear(newYear);
    }
  }, [view, currentDate, year]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    if (today.getFullYear() !== year) {
      setYear(today.getFullYear());
    }
  }, [year]);

  const handleYearChange = useCallback((newYear: number) => {
    setYear(newYear);
    const today = new Date();
    if (newYear === today.getFullYear()) {
      setCurrentDate(today);
    } else {
      setCurrentDate(new Date(newYear, 0, 1));
    }
  }, []);

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
  }, []);

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  // Filter employees by selected group for the "All" view
  const filteredEmployees = selectedGroupId
    ? employees.filter(e => e.group_id === selectedGroupId)
    : employees;

  // When viewAll, use all employees' entries (filtered by group if needed)
  const activeEntries = viewAll
    ? (selectedGroupId
        ? allEmployeesEntries.filter(e => filteredEmployees.some(emp => emp.id === e.employee_id))
        : allEmployeesEntries)
    : entries;

  const employeeNameMap: Record<number, string> | undefined = viewAll
    ? Object.fromEntries(filteredEmployees.map(e => [e.id, `${e.first_name} ${e.last_name}`]))
    : undefined;

  // Shared grid props
  const gridProps = {
    employeeId: selectedEmployeeId ?? 0,
    entries: activeEntries,
    timeCodes,
    onEntryChange: handleEntryChange,
    companyHolidays,
    dailySummary,
    totalActiveEmployees,
    maxOutOfOffice,
    capacityWarningCount,
    capacityCriticalCount,
    employeeNameMap,
    readOnly: viewAll,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Attendance</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Selects + View controls - inline */}
          <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-card">
            {employees.length > 0 && (
              <>
                {/* Group filter — only when multiple non-master groups visible */}
                {groups.length > 1 && (
                  <div className="w-40 space-y-1">
                    <Label htmlFor="group-filter" className="text-xs">Group</Label>
                    <Select
                      value={selectedGroupId?.toString() ?? 'all'}
                      onValueChange={(value) => setSelectedGroupId(value === 'all' ? null : parseInt(value))}
                    >
                      <SelectTrigger id="group-filter" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Employee selector */}
                <div className="w-64 space-y-1">
                  <HelpArea helpId="employee-selector" bubblePosition="bottom">
                    <Label htmlFor="employee" className="text-xs cursor-help">Employee</Label>
                  </HelpArea>
                  <Select
                    value={viewAll ? 'all' : (selectedEmployeeId?.toString() || '')}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setViewAll(true);
                        setSelectedEmployeeId(undefined);
                      } else {
                        setViewAll(false);
                        setSelectedEmployeeId(parseInt(value));
                      }
                    }}
                  >
                    <SelectTrigger id="employee" className="h-8 text-xs ring-2 ring-primary">
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="font-semibold">All Employees</span>
                      </SelectItem>
                      {(selectedGroupId
                        ? employees.filter(e => e.group_id === selectedGroupId)
                        : employees
                      ).map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          <span className="font-semibold">{emp.last_name}, {emp.first_name}</span>
                          {emp.employee_number && <span className="text-muted-foreground"> ({emp.employee_number})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Year selector (only in year view — month/week have it in PeriodNavigator) */}
            {view === 'year' && (
              <div className="w-20 space-y-1">
                <HelpArea helpId="year-selector" bubblePosition="bottom">
                  <Label htmlFor="year" className="text-xs cursor-help">Year</Label>
                </HelpArea>
                <Select
                  value={year.toString()}
                  onValueChange={(value) => handleYearChange(parseInt(value))}
                >
                  <SelectTrigger id="year" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View toggle */}
            <div className="space-y-1">
              <Label className="text-xs">View</Label>
              <ViewToggle view={view} onViewChange={handleViewChange} />
            </div>

            {/* Period navigator (month/week views) */}
            {view !== 'year' && (
              <div className="space-y-1">
                <Label className="text-xs">Period</Label>
                <PeriodNavigator
                  view={view}
                  year={year}
                  currentDate={currentDate}
                  onNavigate={handleNavigate}
                  onToday={handleToday}
                  onYearChange={handleYearChange}
                />
              </div>
            )}

            {/* Bulk Entry button */}
            {bulkEntryEnabled && selectedEmployeeId && !viewAll && (
              <div className="space-y-1">
                <Label className="text-xs">&nbsp;</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setBulkEntryOpen(true)}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Bulk Add Attendance
                </Button>
              </div>
            )}
          </div>

          {/* Balance Cards — only in single-employee view */}
          {selectedEmployeeId && !viewAll && (
            <div className="flex-1 min-w-0">
              <BalanceCards entries={entries} allocations={allocations} employeeId={selectedEmployeeId} />
            </div>
          )}
        </div>

        {(viewAll || selectedEmployeeId) && (
          <>
            <div className="space-y-3">
              <HelpArea helpId="attendance-grid" bubblePosition="bottom">
                <h2 className="text-lg font-semibold cursor-help">
                  {view === 'year' && (viewAll ? `Staff Overview: ${year}` : `Attendance Record: ${year}`)}
                  {view === 'month' && (viewAll ? `Staff Overview: ${getPeriodLabel('month', currentDate)}` : `Attendance: ${getPeriodLabel('month', currentDate)}`)}
                  {view === 'week' && (viewAll ? `Staff Overview: ${getPeriodLabel('week', currentDate)}` : `Attendance: ${getPeriodLabel('week', currentDate)}`)}
                </h2>
              </HelpArea>

              {view === 'year' && yearLayout === 'calendar' && (
                <AttendanceGridYearCalendar
                  year={year}
                  {...gridProps}
                />
              )}

              {view === 'year' && yearLayout !== 'calendar' && (
                <AttendanceGridYear
                  year={year}
                  {...gridProps}
                />
              )}

              {view === 'month' && (
                <AttendanceGridMonth
                  year={currentDate.getFullYear()}
                  month={currentDate.getMonth() + 1}
                  {...gridProps}
                />
              )}

              {view === 'week' && (
                <AttendanceGridWeek
                  weekStart={parseDateStr(getWeekBounds(currentDate).start)}
                  {...gridProps}
                />
              )}
            </div>

            <div className="mt-3 p-2 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-1 text-sm">Time Code Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs">
                {timeCodes.map(tc => (
                  <div key={tc.code}>
                    <span className="font-mono font-bold">{tc.code}</span> - {tc.description}
                    {tc.hours_limit && (
                      <span className="text-muted-foreground"> ({tc.hours_limit}h limit)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bulk Entry Dialog */}
        {bulkEntryEnabled && selectedEmployeeId && !viewAll && (
          <BulkEntryDialog
            open={bulkEntryOpen}
            onOpenChange={setBulkEntryOpen}
            employeeId={selectedEmployeeId}
            timeCodes={timeCodes}
            authFetch={authFetch}
            onSave={async () => {
              await loadAttendanceData();
              toast({
                title: 'Bulk Entry Saved',
                description: 'Date range entries have been saved successfully.',
              });
            }}
          />
        )}

        {!selectedEmployeeId && employees.length === 0 && (
          <div className="text-center p-8 border rounded-lg flex flex-col items-center">
            <UserPlus className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-1.5">No Employees Yet</h2>
            <p className="text-muted-foreground mb-3">
              Go to the Employees tab to add employees and get started with attendance tracking.
            </p>
            <Link href="/employees">
              <Button>
                Go to Employees
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    }>
      <AttendanceContent />
    </Suspense>
  );
}
