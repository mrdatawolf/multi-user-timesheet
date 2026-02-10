"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AttendanceGrid, type AttendanceEntry, type DailySummary } from '@/components/attendance-grid';
import { BalanceCards } from '@/components/balance-cards';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth-context';
import { useHelp } from '@/lib/help-context';
import { HelpArea } from '@/components/help-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getBrandFeatures, getCompanyHolidayDates, isGlobalReadAccessEnabled } from '@/lib/brand-features';

interface Employee {
  id: number;
  first_name: string;

  last_name: string;
  employee_number?: string;
  email?: string;
  role: string;
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

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading, authFetch } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [allocations, setAllocations] = useState<TimeAllocation[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [companyHolidays, setCompanyHolidays] = useState<Set<string>>(new Set());
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [totalActiveEmployees, setTotalActiveEmployees] = useState<number>(0);
  const [maxOutOfOffice, setMaxOutOfOffice] = useState<number>(0);
  const [capacityWarningCount, setCapacityWarningCount] = useState<number>(3);
  const [capacityCriticalCount, setCapacityCriticalCount] = useState<number>(5);
  const [globalReadEnabled, setGlobalReadEnabled] = useState(false);
  const { toast } = useToast();
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);
  const { setCurrentScreen } = useHelp();

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
    if (selectedEmployeeId && isAuthenticated) {
      loadAttendanceData();
    }
  }, [selectedEmployeeId, year, isAuthenticated]);

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
    if (pathname === '/attendance' && selectedEmployeeId && isAuthenticated) {
      loadAttendanceData();
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

      const [employeesRes, timeCodesRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/time-codes'),
      ]);

      // If redirected to login due to expired session, stop processing
      if (employeesRes.status === 401 || timeCodesRes.status === 401) {
        return;
      }

      const employeesData = await employeesRes.json();
      const timeCodesData = await timeCodesRes.json();

      // Validate that we received arrays
      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
        if (employeesData.length > 0 && !selectedEmployeeId) {
          // Prefer the user's linked employee, fall back to first in list
          const linkedEmployee = user?.employee_id
            ? employeesData.find((e: Employee) => e.id === user.employee_id)
            : null;
          setSelectedEmployeeId(linkedEmployee ? linkedEmployee.id : employeesData[0].id);
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

  const handleEntryChange = async (date: string, updatedEntries: AttendanceEntry[]) => {
    if (!selectedEmployeeId || !isAuthenticated) return;

    try {
      // Send batch update to API
      const response = await authFetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_day',
          employee_id: selectedEmployeeId,
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
      await loadAttendanceData();

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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

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
          {/* Selects - inline */}
          <div className="flex items-end gap-2 p-2 border rounded-lg bg-card">
            <div className="w-64 space-y-1">
              <HelpArea helpId="employee-selector" bubblePosition="bottom">
                <Label htmlFor="employee" className="text-xs cursor-help">Employee</Label>
              </HelpArea>
              <Select
                value={selectedEmployeeId?.toString() || ''}
                onValueChange={(value) => setSelectedEmployeeId(parseInt(value))}
              >
                <SelectTrigger id="employee" className="h-8 text-xs ring-2 ring-primary">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      <span className="font-semibold">{emp.last_name}, {emp.first_name}</span>
                      {emp.employee_number && <span className="text-muted-foreground"> ({emp.employee_number})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-20 space-y-1">
              <HelpArea helpId="year-selector" bubblePosition="bottom">
                <Label htmlFor="year" className="text-xs cursor-help">Year</Label>
              </HelpArea>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
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
          </div>

          {/* Balance Cards - 3/4 width */}
          {selectedEmployeeId && (
            <div className="flex-1 min-w-0">
              <BalanceCards entries={entries} allocations={allocations} />
            </div>
          )}
        </div>

        {selectedEmployeeId && (
          <>
            {themeConfig.layout.attendance.sectionOrder === 'recordFirst' ? (
              <>
                {/* Attendance Record first layout */}
                <div className="space-y-3">
                  <HelpArea helpId="attendance-grid" bubblePosition="bottom">
                    <h2 className="text-lg font-semibold cursor-help">
                      Attendance Record: {year}
                    </h2>
                  </HelpArea>

                  <AttendanceGrid
                    year={year}
                    employeeId={selectedEmployeeId}
                    entries={entries}
                    timeCodes={timeCodes}
                    onEntryChange={handleEntryChange}
                    companyHolidays={companyHolidays}
                    dailySummary={dailySummary}
                    totalActiveEmployees={totalActiveEmployees}
                    maxOutOfOffice={maxOutOfOffice}
                    capacityWarningCount={capacityWarningCount}
                    capacityCriticalCount={capacityCriticalCount}
                  />
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
            ) : (
              <>
                {/* Balance Cards first layout - cards already shown above */}
                <div className="space-y-3">
                  <HelpArea helpId="attendance-grid" bubblePosition="bottom">
                    <h2 className="text-lg font-semibold cursor-help">
                      Attendance Record: {year}
                    </h2>
                  </HelpArea>

                  <AttendanceGrid
                    year={year}
                    employeeId={selectedEmployeeId}
                    entries={entries}
                    timeCodes={timeCodes}
                    onEntryChange={handleEntryChange}
                    companyHolidays={companyHolidays}
                    dailySummary={dailySummary}
                    totalActiveEmployees={totalActiveEmployees}
                    maxOutOfOffice={maxOutOfOffice}
                    capacityWarningCount={capacityWarningCount}
                    capacityCriticalCount={capacityCriticalCount}
                  />
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
          </>
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
