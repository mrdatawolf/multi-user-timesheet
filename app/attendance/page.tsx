"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AttendanceGrid } from '@/components/attendance-grid';
import { BalanceCards } from '@/components/balance-cards';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

interface AttendanceEntry {
  id: number;
  employee_id: number;
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
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
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [allocations, setAllocations] = useState<TimeAllocation[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);

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
    if (selectedEmployeeId && token) {
      loadAttendanceData();
    }
  }, [selectedEmployeeId, year, token]);

  // Reload data when navigating to attendance page
  useEffect(() => {
    if (pathname === '/attendance' && selectedEmployeeId && token) {
      loadAttendanceData();
    }
  }, [pathname]);

  const loadInitialData = async () => {
    try {
      const [employeesRes, timeCodesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/time-codes'),
      ]);

      const employeesData = await employeesRes.json();
      const timeCodesData = await timeCodesRes.json();

      // Validate that we received arrays
      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
        if (employeesData.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(employeesData[0].id);
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
    if (!selectedEmployeeId || !token) return;

    try {
      const [attendanceRes, allocationsRes] = await Promise.all([
        fetch(`/api/attendance?employeeId=${selectedEmployeeId}&year=${year}`),
        fetch(`/api/employee-allocations?employeeId=${selectedEmployeeId}&year=${year}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      ]);

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
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setEntries([]);
      setAllocations([]);
    }
  };

  const handleEntryChange = async (date: string, timeCode: string, hours: number, notes: string) => {
    if (!selectedEmployeeId) return;

    try {
      if (timeCode === '__NONE__' || !timeCode) {
        // Delete entry
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            employee_id: selectedEmployeeId,
            entry_date: date,
          }),
        });
      } else {
        // Upsert entry
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: selectedEmployeeId,
            entry_date: date,
            time_code: timeCode,
            hours: hours,
            notes: notes,
          }),
        });
      }

      // Reload attendance data to show updated entries
      await loadAttendanceData();

      toast({
        title: 'Attendance Saved',
        description: 'Entry saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your attendance. Please try again.',
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
        <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-card">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label htmlFor="employee" className="text-xs">Employee</Label>
            <Select
              value={selectedEmployeeId?.toString() || ''}
              onValueChange={(value) => setSelectedEmployeeId(parseInt(value))}
            >
              <SelectTrigger id="employee" className="h-8 text-xs">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.last_name}, {emp.first_name}
                    {emp.employee_number && ` (${emp.employee_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-24 space-y-1">
            <Label htmlFor="year" className="text-xs">Year</Label>
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

        {selectedEmployeeId && (
          <>
            {themeConfig.layout.attendance.sectionOrder === 'recordFirst' ? (
              <>
                {/* Attendance Record first layout */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    Attendance Record: {year}
                  </h2>

                  <AttendanceGrid
                    year={year}
                    employeeId={selectedEmployeeId}
                    entries={entries}
                    timeCodes={timeCodes}
                    onEntryChange={handleEntryChange}
                  />
                </div>

                <BalanceCards entries={entries} allocations={allocations} />

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
                {/* Balance Cards first layout */}
                <BalanceCards entries={entries} allocations={allocations} />

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    Attendance Record: {year}
                  </h2>

                  <AttendanceGrid
                    year={year}
                    employeeId={selectedEmployeeId}
                    entries={entries}
                    timeCodes={timeCodes}
                    onEntryChange={handleEntryChange}
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
