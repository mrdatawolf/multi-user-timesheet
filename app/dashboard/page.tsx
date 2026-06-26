"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useHelp } from '@/lib/help-context';
import { HelpArea } from '@/components/help-area';
import { formatDateStr, getLocalToday, parseDateStr } from '@/lib/date-helpers';
import { PageLoading } from '@/components/page-loading';
import { getCachedData, setCachedData } from '@/lib/client-cache';

const PAGE_SIZE = 5;

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
  group_id?: number;
}

interface HoursEntry {
  id: number;
  employee_id: number;
  entry_date: string;
  hours: number;
  work_location?: 'onsite' | 'remote' | null;
}

interface LocationSummary {
  location: string;
  count: number;
  totalHours: number;
}

interface EmployeeSummary {
  employee: Employee;
  entryCount: number;
  totalHours: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, authFetch } = useAuth();
  const { setCurrentScreen } = useHelp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<HoursEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [locPage, setLocPage] = useState(0);
  const [empPage, setEmpPage] = useState(0);

  // Set the current screen for help context
  useEffect(() => {
    setCurrentScreen('dashboard');
  }, [setCurrentScreen]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && pathname === '/dashboard') {
      loadDashboardData();
    }
  }, [isAuthenticated, pathname]);

  const loadDashboardData = async () => {
    if (!isAuthenticated) {
      console.warn('Cannot load dashboard data: not authenticated');
      return;
    }

    const cachedDashboard = getCachedData<{
      employees: Employee[];
      entries: HoursEntry[];
    }>('dashboard:data');
    if (cachedDashboard) {
      setEmployees(cachedDashboard.employees);
      setEntries(cachedDashboard.entries ?? []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const todayStr = getLocalToday();
      const startDate = new Date(parseDateStr(todayStr));
      startDate.setDate(startDate.getDate() - 13);
      const startDateStr = formatDateStr(startDate);

      const [employeesRes, entriesRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch(`/api/hours?startDate=${startDateStr}&endDate=${todayStr}`),
      ]);

      if (employeesRes.status === 401) {
        return;
      }

      const employeesData = await employeesRes.json();
      const entriesData = entriesRes.ok ? await entriesRes.json() : [];

      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
      } else {
        console.error('Invalid employees data:', employeesData);
        setEmployees([]);
      }

      if (Array.isArray(entriesData)) {
        setEntries(entriesData);
      } else {
        setEntries([]);
      }

      setCachedData('dashboard:data', {
        employees: Array.isArray(employeesData) ? employeesData : [],
        entries: Array.isArray(entriesData) ? entriesData : [],
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const locationSummary: LocationSummary[] = entries.reduce((acc, entry) => {
    const location = entry.work_location || 'unspecified';
    const existing = acc.find(item => item.location === location);
    if (existing) {
      existing.count++;
      existing.totalHours += entry.hours || 0;
    } else {
      acc.push({ location, count: 1, totalHours: entry.hours || 0 });
    }
    return acc;
  }, [] as LocationSummary[]).sort((a, b) => b.totalHours - a.totalHours);

  const locTotalPages = Math.max(1, Math.ceil(locationSummary.length / PAGE_SIZE));
  const locSafePage = Math.min(locPage, locTotalPages - 1);
  const locPagedRows = locationSummary.slice(locSafePage * PAGE_SIZE, (locSafePage + 1) * PAGE_SIZE);

  const employeeSummaries: EmployeeSummary[] = employees.map(emp => {
    const empEntries = entries.filter(e => e.employee_id === emp.id);
    return {
      employee: emp,
      entryCount: empEntries.length,
      totalHours: empEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
    };
  }).filter(s => s.entryCount > 0).sort((a, b) => b.totalHours - a.totalHours);

  const empTotalPages = Math.max(1, Math.ceil(employeeSummaries.length / PAGE_SIZE));
  const empSafePage = Math.min(empPage, empTotalPages - 1);
  const empPagedRows = employeeSummaries.slice(empSafePage * PAGE_SIZE, (empSafePage + 1) * PAGE_SIZE);

  const periodEntries = [...entries]
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

  if (!config.features.enableDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Dashboard Disabled</h1>
          <p className="text-muted-foreground">
            The dashboard feature is currently disabled.
            <code className="text-sm bg-muted px-2 py-1 rounded">lib/config.ts</code> and set{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">features.enableDashboard</code> to{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">true</code>.
          </p>
          <Link href="/hours" className="inline-block text-blue-600 hover:underline">
            ← Go back to Hours
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen p-3">
        <PageLoading label="Loading dashboard..." />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <Link href="/hours" className="text-sm text-blue-600 hover:underline">
            Go to Hours →
          </Link>
        </div>

        <HelpArea helpId="stats-cards" bubblePosition="bottom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{entries.length}</div>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locationSummary.length}</div>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>
          </div>
        </HelpArea>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <HelpArea helpId="hours-by-location" bubblePosition="right">
                <CardTitle className="text-base cursor-help">Hours by Location <span className="text-xs font-normal text-muted-foreground">(Last 14 Days)</span></CardTitle>
              </HelpArea>
              {locationSummary.length > PAGE_SIZE && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{locSafePage + 1}/{locTotalPages}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLocPage(p => Math.max(0, p - 1))} disabled={locSafePage === 0}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLocPage(p => Math.min(locTotalPages - 1, p + 1))} disabled={locSafePage >= locTotalPages - 1}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {locationSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries in this period</p>
                ) : (
                  locPagedRows.map(loc => (
                    <div key={loc.location} className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{loc.location}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{loc.count} entries</span>
                        <span className="font-semibold text-foreground">{loc.totalHours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <HelpArea helpId="employee-summary" bubblePosition="left">
                <CardTitle className="text-base cursor-help">Employee Summary <span className="text-xs font-normal text-muted-foreground">(Last 14 Days)</span></CardTitle>
              </HelpArea>
              {employeeSummaries.length > PAGE_SIZE && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{empSafePage + 1}/{empTotalPages}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEmpPage(p => Math.max(0, p - 1))} disabled={empSafePage === 0}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEmpPage(p => Math.min(empTotalPages - 1, p + 1))} disabled={empSafePage >= empTotalPages - 1}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employeeSummaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees found</p>
                ) : (
                  empPagedRows.map(summary => (
                    <div key={summary.employee.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {summary.employee.first_name} {summary.employee.last_name}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{summary.entryCount} entries</span>
                        <span className="font-semibold text-foreground">{summary.totalHours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <HelpArea helpId="recent-entries" bubblePosition="bottom">
              <CardTitle className="text-base cursor-help">Entries (Last 14 Days)</CardTitle>
            </HelpArea>
          </CardHeader>
          <CardContent>
            {periodEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries in this period</p>
            ) : (
              <div className="space-y-2">
                {periodEntries.map(entry => {
                  const employee = employees.find(e => e.id === entry.employee_id);
                  return (
                    <div key={entry.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium">
                          {employee ? `${employee.first_name} ${employee.last_name}` : `Employee #${entry.employee_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{entry.entry_date}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.work_location && (
                          <span className="text-xs capitalize text-muted-foreground">{entry.work_location}</span>
                        )}
                        <span className="text-muted-foreground">{entry.hours}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
