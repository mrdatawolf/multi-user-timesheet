"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { formatDateStr, parseDateStr, getWeekBounds, getWeekDates } from '@/lib/date-helpers';
import { TimesheetGrid } from '@/components/timesheet-grid';
import type { HoursEntry } from '@/lib/hours-types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { PageLoading } from '@/components/page-loading';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
  group_id?: number;
}

interface Group {
  id: number;
  name: string;
  is_master?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriodEnding(saturday: Date): string {
  return `${MONTH_NAMES[saturday.getMonth()]} ${saturday.getDate()}, ${saturday.getFullYear()}`;
}

function getInitialWeekStart(searchParams: URLSearchParams): Date {
  const weekParam = searchParams.get('week');
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    return parseDateStr(weekParam);
  }
  return parseDateStr(getWeekBounds(new Date()).start);
}

function TimesheetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, isManager, isAdministrator, isMaster, authFetch } = useAuth();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState<Date>(() => getInitialWeekStart(searchParams));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [entries, setEntries] = useState<HoursEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const isManagerOrAbove = isManager || isAdministrator || isMaster;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (!isManagerOrAbove) { router.replace('/hours'); }
  }, [authLoading, isAuthenticated, isManagerOrAbove, router]);

  // Sync week to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('week', formatDateStr(weekStart));
    router.replace(`/timesheet?${params.toString()}`, { scroll: false });
  }, [weekStart, router]);

  useEffect(() => {
    if (!isAuthenticated || !isManagerOrAbove) return;
    loadInitialData();
  }, [isAuthenticated, isManagerOrAbove]);

  useEffect(() => {
    if (!isAuthenticated || !isManagerOrAbove) return;
    loadWeekEntries(weekStart);
  }, [isAuthenticated, isManagerOrAbove, weekStart]);

  const loadInitialData = async () => {
    try {
      const [empRes, grpRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/groups'),
      ]);
      if (empRes.status === 401) return;
      const empData = empRes.ok ? await empRes.json() : [];
      const grpData = grpRes.ok ? await grpRes.json() : [];
      if (Array.isArray(empData)) setEmployees(empData);
      if (Array.isArray(grpData)) {
        setGroups(grpData.filter((g: Group) => !g.is_master));
      }
    } catch (e) {
      console.error('Failed to load employees', e);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekEntries = async (monday: Date) => {
    const weekDates = getWeekDates(monday).slice(0, 6); // Mon–Sat
    const startDate = formatDateStr(weekDates[0]);
    const endDate = formatDateStr(weekDates[5]);
    try {
      const res = await authFetch(`/api/hours?startDate=${startDate}&endDate=${endDate}`);
      if (res.status === 401) return;
      const data = res.ok ? await res.json() : [];
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load week entries', e);
      setEntries([]);
    }
  };

  const handleCellSave = useCallback(async (empId: number, dateStr: string, hours: number | null) => {
    const key = `${empId}:${dateStr}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const res = await authFetch('/api/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_day',
          employee_id: empId,
          entry_date: dateStr,
          target_entry_date: dateStr,
          entries: hours != null && hours > 0 ? [{ hours }] : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      await loadWeekEntries(weekStart);
    } catch (e) {
      toast({
        title: 'Save Failed',
        description: e instanceof Error ? e.message : 'Failed to save hours.',
        variant: 'destructive',
      });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [authFetch, toast, weekStart]);

  const handlePrevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const handleNextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const handleToday = () => setWeekStart(parseDateStr(getWeekBounds(new Date()).start));

  const weekDates = getWeekDates(weekStart).slice(0, 6); // Mon–Sat
  const saturday = weekDates[5];

  const filteredEmployees = employees
    .filter(e => !selectedGroupId || e.group_id === selectedGroupId)
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));

  if (authLoading || (loading && isAuthenticated && isManagerOrAbove)) {
    return <div className="min-h-screen p-3"><PageLoading label="Loading timesheet..." /></div>;
  }

  if (!isAuthenticated || !isManagerOrAbove) return null;

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex flex-wrap items-stretch gap-3 p-4 border rounded-lg bg-card">
          {groups.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Group</Label>
              <Select
                value={selectedGroupId?.toString() ?? 'all'}
                onValueChange={v => setSelectedGroupId(v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger className="h-9 w-44 text-sm">
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

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Period Ending</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3 text-sm min-w-[160px]" onClick={handleToday}>
                {formatPeriodEnding(saturday)}
              </Button>
              <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TimesheetGrid
          employees={filteredEmployees}
          entries={entries}
          weekDates={weekDates}
          onCellSave={handleCellSave}
          saving={saving}
        />
      </div>
    </div>
  );
}

export default function TimesheetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    }>
      <TimesheetContent />
    </Suspense>
  );
}
