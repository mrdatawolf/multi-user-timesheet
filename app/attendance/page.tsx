"use client";

import { useEffect, useState } from 'react';
import { AttendanceGrid } from '@/components/attendance-grid';
import { BalanceCards } from '@/components/balance-cards';
import { NewEmployeeDialog } from '@/components/new-employee-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';

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

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmployeeOpen, setNewEmployeeOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { time_code: string; hours: number; notes: string }>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadAttendanceData();
    }
  }, [selectedEmployeeId, year]);

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
    if (!selectedEmployeeId) return;

    try {
      const res = await fetch(
        `/api/attendance?employeeId=${selectedEmployeeId}&year=${year}`
      );
      const data = await res.json();

      // Validate that we received an array
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        console.error('Invalid attendance data:', data);
        setEntries([]);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setEntries([]);
    }
  };

  const handleEntryChange = (date: string, timeCode: string, hours: number, notes: string) => {
    const newPendingChanges = new Map(pendingChanges);
    if (timeCode) {
      newPendingChanges.set(date, { time_code: timeCode, hours, notes });
    } else {
      newPendingChanges.set(date, { time_code: '', hours: 0, notes: '' }); // Mark for deletion
    }
    setPendingChanges(newPendingChanges);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId || pendingChanges.size === 0) return;

    setSaving(true);
    try {
      const promises = Array.from(pendingChanges.entries()).map(([date, { time_code, hours, notes }]) => {
        if (time_code === '') {
          // Delete entry
          return fetch('/api/attendance', {
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
          return fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: selectedEmployeeId,
              entry_date: date,
              time_code: time_code,
              hours: hours,
              notes: notes,
            }),
          });
        }
      });

      await Promise.all(promises);
      setPendingChanges(new Map());
      await loadAttendanceData();

      toast({
        title: 'Attendance Saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your attendance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNewEmployee = async (employeeData: {
    first_name: string;
    last_name: string;
    employee_number: string;
    email: string;
  }) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });

      const newEmployee = await res.json();

      // Validate response has an id
      if (newEmployee && newEmployee.id) {
        setEmployees([...employees, newEmployee]);
        setSelectedEmployeeId(newEmployee.id);
        toast({
          title: 'Employee Created',
          description: `Welcome, ${newEmployee.first_name}!`,
        });
      } else {
        console.error('Invalid response from create employee:', newEmployee);
        toast({
          title: 'Creation Failed',
          description: 'There was an error creating the employee.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      toast({
        title: 'Creation Failed',
        description: 'There was an error creating the employee.',
        variant: 'destructive',
      });
    }
  };

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Attendance</h1>
          <Button onClick={() => setNewEmployeeOpen(true)} variant="outline" size="sm">
            New Employee
          </Button>
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
            <BalanceCards entries={entries} />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Attendance Record: {year}
                </h2>
                <Button
                  onClick={handleSave}
                  disabled={saving || pendingChanges.size === 0}
                >
                  {saving ? 'Saving...' : `Save Changes${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
                </Button>
              </div>

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

        {!selectedEmployeeId && employees.length === 0 && (
          <div className="text-center p-8 border rounded-lg flex flex-col items-center">
            <UserPlus className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-1.5">No Employees Yet</h2>
            <p className="text-muted-foreground mb-3">
              Create your first employee to get started with attendance tracking.
            </p>
            <Button onClick={() => setNewEmployeeOpen(true)}>
              Add First Employee
            </Button>
          </div>
        )}

        <NewEmployeeDialog
          open={newEmployeeOpen}
          onOpenChange={setNewEmployeeOpen}
          onSubmit={handleNewEmployee}
        />
      </div>
    </div>
  );
}
