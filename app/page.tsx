'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, TrendingUp, LogIn } from 'lucide-react';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
}

interface AttendanceEntry {
  id: number;
  employee_id: number;
  entry_date: string;
  time_code: string;
  hours: number;
}

interface TimeCodeSummary {
  code: string;
  count: number;
  totalHours: number;
}

interface EmployeeSummary {
  employee: Employee;
  entryCount: number;
  totalHours: number;
}

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading, token } = useAuth();
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, token]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [employeesRes, entriesRes] = await Promise.all([
        fetch('/api/employees', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('/api/attendance', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const employeesData = await employeesRes.json();
      const entriesData = await entriesRes.json();

      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
      } else {
        console.error('Invalid employees data:', employeesData);
        setEmployees([]);
      }

      if (Array.isArray(entriesData)) {
        setEntries(entriesData);
      } else {
        console.error('Invalid entries data:', entriesData);
        setEntries([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const timeCodeSummary: TimeCodeSummary[] = entries.reduce((acc, entry) => {
    const existing = acc.find(item => item.code === entry.time_code);
    if (existing) {
      existing.count++;
      existing.totalHours += entry.hours || 0;
    } else {
      acc.push({
        code: entry.time_code,
        count: 1,
        totalHours: entry.hours || 0,
      });
    }
    return acc;
  }, [] as TimeCodeSummary[]);

  timeCodeSummary.sort((a, b) => b.totalHours - a.totalHours);

  const employeeSummaries: EmployeeSummary[] = employees.map(emp => {
    const empEntries = entries.filter(e => e.employee_id === emp.id);
    return {
      employee: emp,
      entryCount: empEntries.length,
      totalHours: empEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
    .slice(0, 10);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const logoSrc = themeConfig.branding.logo || '/default.png';
    const logoAlt = themeConfig.branding.logoAlt || 'Logo';
    const appTitle = themeConfig.branding.appTitle;

    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="border-2 border-dashed rounded-lg p-8">
            <div className="flex justify-center mb-4">
              <Image
                src={logoSrc}
                alt={logoAlt}
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2">{appTitle}</h1>
            <p className="text-muted-foreground mb-6">
              Employee attendance management system
            </p>
            <Link href="/login">
              <Button size="lg" className="gap-2">
                <LogIn className="h-5 w-5" />
                Sign In to Continue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, <span className="font-semibold">{user?.full_name}</span>
            </p>
          </div>
          <Link href="/attendance">
            <Button variant="outline" size="sm">
              Go to Attendance →
            </Button>
          </Link>
        </div>

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
              <p className="text-xs text-muted-foreground">Attendance entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Hours logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Codes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeCodeSummary.length}</div>
              <p className="text-xs text-muted-foreground">Different codes used</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time Code Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeCodeSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No time codes used yet</p>
                ) : (
                  timeCodeSummary.map(tc => (
                    <div key={tc.code} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{tc.code}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{tc.count} entries</span>
                        <span className="font-semibold text-foreground">{tc.totalHours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {employeeSummaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees found</p>
                ) : (
                  employeeSummaries.map(summary => (
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
            <CardTitle className="text-base">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries found</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map(entry => {
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
                        <span className="font-medium">{entry.time_code}</span>
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
