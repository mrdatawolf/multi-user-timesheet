"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { config } from '@/lib/config';
import { useHelp } from '@/lib/help-context';
import { useAuth } from '@/lib/auth-context';
import { ReportFilters } from '@/components/reports/report-filters';
import { HoursWorkedReport, type HoursWorkedReportData } from '@/components/reports/hours-worked-report';
import { HoursWorkedExport } from '@/components/reports/hours-worked-export';
import { GraysonTimeFilters } from '@/components/reports/grayson-time-filters';
import { GraysonTimeReport, type GraysonTimeReportData } from '@/components/reports/grayson-time-report';
import { GraysonTimeExport } from '@/components/reports/grayson-time-export';
import { ReportPrintButton } from '@/components/reports/report-print-button';
import { formatDateStr, parseDateStr, getWeekBounds } from '@/lib/date-helpers';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/page-loading';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  role?: string;
  group_id?: number;
}

interface Group {
  id: number;
  name: string;
  is_master?: number;
}

type ReportType = 'grayson' | 'hours-worked';

function getDefaultPeriodStart(): Date {
  // Most recent Monday — the default report covers a single current week.
  return parseDateStr(getWeekBounds(new Date()).start);
}

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isManager, isAdministrator, isMaster, authFetch } = useAuth();
  const { setCurrentScreen } = useHelp();

  const [reportType, setReportType] = useState<ReportType>('grayson');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Hours Worked Report state
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<HoursWorkedReportData | null>(null);

  // Grayson Time Report state
  const [graysonGroupId, setGraysonGroupId] = useState<string>('all');
  const [graysonEmployeeId, setGraysonEmployeeId] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState<Date | undefined>(() => getDefaultPeriodStart());
  const [graysonPeriods, setGraysonPeriods] = useState<1 | 2>(1);
  const [graysonData, setGraysonData] = useState<GraysonTimeReportData | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const canEditOtherHours = isManager || isAdministrator || isMaster;

  useEffect(() => {
    setCurrentScreen('reports');
  }, [setCurrentScreen]);

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
    if (!isAuthenticated || initialLoading) return;
    handleGenerateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initialLoading, reportType]);

  const loadInitialData = async () => {
    const cached = getCachedData<{ employees: Employee[]; groups: Group[] }>('reports:initial');
    if (cached) {
      setEmployees(cached.employees);
      setGroups(cached.groups ?? []);
      setInitialLoading(false);
    }

    try {
      const [employeesRes, groupsRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/groups'),
      ]);

      if (employeesRes.status === 401) return;

      const employeesData = await employeesRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : [];

      const nextEmployees = Array.isArray(employeesData) ? employeesData : [];
      const nextGroups = Array.isArray(groupsData) ? groupsData.filter((g: Group) => !g.is_master) : [];

      setEmployees(nextEmployees);
      setGroups(nextGroups);

      setCachedData('reports:initial', { employees: nextEmployees, groups: nextGroups });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const formatDateForApi = (date: Date | undefined): string => {
    if (!date) return '';
    return formatDateStr(date);
  };

  const handleGenerateReport = async () => {
    if (reportType === 'grayson') {
      await loadGraysonReport();
    } else {
      await loadHoursWorkedReport();
    }
  };

  const loadHoursWorkedReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        groupId: selectedGroupId,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
      });

      const res = await authFetch(`/api/reports?${params.toString()}`);
      if (res.status === 401) return;

      if (res.ok) {
        setReportData(await res.json());
      } else {
        console.error('Failed to generate report');
        setReportData(null);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const loadGraysonReport = async () => {
    if (!periodStart) return;
    setReportLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: graysonEmployeeId,
        groupId: graysonGroupId,
        periodStart: formatDateForApi(periodStart),
        periods: String(graysonPeriods),
      });

      const res = await authFetch(`/api/reports/grayson?${params.toString()}`);
      if (res.status === 401) return;

      if (res.ok) {
        setGraysonData(await res.json());
      } else {
        console.error('Failed to generate Grayson Time Report');
        setGraysonData(null);
      }
    } catch (error) {
      console.error('Failed to generate Grayson Time Report:', error);
      setGraysonData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleOtherHoursChange = async (employeeId: number, weekStartDate: string, hours: number) => {
    const res = await authFetch('/api/reports/grayson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'other_hours', employee_id: employeeId, week_start_date: weekStartDate, hours }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save Other hours');
    }
    await loadGraysonReport();
  };

  const handleNotesChange = async (employeeId: number, periodStartStr: string, notes: string) => {
    const res = await authFetch('/api/reports/grayson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notes', employee_id: employeeId, period_start: periodStartStr, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save Changes');
    }
    await loadGraysonReport();
  };

  if (!config.features.enableReports) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Reports Disabled</h1>
          <p className="text-muted-foreground">
            The reports feature is currently disabled. Edit{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">lib/config.ts</code> and set{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">features.enableReports</code> to{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">true</code>.
          </p>
          <Link href="/hours" className="inline-block text-blue-600 hover:underline">
            &larr; Go back to Hours
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen p-3">
        <PageLoading label="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {reportType === 'grayson' ? 'Grayson Time Report' : 'Hours Worked Report'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {reportType === 'grayson'
                ? 'Bi-weekly REG/OT hours per employee, with manual Other (1FE) adjustments.'
                : 'Totals are grouped by team, with overtime hours flagged per employee.'}
            </p>
            {reportType === 'grayson' && graysonData && (
              <p className="hidden print:block text-sm text-muted-foreground mt-1">
                Period: {graysonData.week1Start} to {graysonData.week2End}
              </p>
            )}
            {reportType === 'hours-worked' && reportData && (
              <p className="hidden print:block text-sm text-muted-foreground mt-1">
                Period: {reportData.startDate} to {reportData.endDate}
              </p>
            )}
          </div>

          <div className="print:hidden inline-flex rounded-lg border bg-muted p-0.5">
            {([
              { value: 'grayson', label: 'Grayson Time Report' },
              { value: 'hours-worked', label: 'Hours Worked Report' },
            ] as { value: ReportType; label: string }[]).map(({ value, label }) => (
              <Button
                key={value}
                variant={reportType === value ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-8 text-sm px-3 rounded-md')}
                onClick={() => setReportType(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {reportType === 'grayson' ? (
          <>
            <GraysonTimeFilters
              employees={employees}
              groups={groups}
              selectedGroupId={graysonGroupId}
              onGroupChange={setGraysonGroupId}
              selectedEmployeeId={graysonEmployeeId}
              onEmployeeChange={setGraysonEmployeeId}
              periodStart={periodStart}
              onPeriodStartChange={setPeriodStart}
              periods={graysonPeriods}
              onPeriodsChange={setGraysonPeriods}
              onGenerate={loadGraysonReport}
              loading={reportLoading}
              actionButtons={
                <>
                  <GraysonTimeExport data={graysonData} filename="grayson-time-report.csv" />
                  <ReportPrintButton disabled={!graysonData || graysonData.employees.length === 0} />
                </>
              }
            />

            <div className="w-full print:w-full mx-auto space-y-2 [&_td]:py-1 [&_th]:py-1 [&_th]:h-auto">
              <GraysonTimeReport
                data={graysonData}
                loading={reportLoading}
                onOtherHoursChange={handleOtherHoursChange}
                onNotesChange={handleNotesChange}
                canEditAdjustments={canEditOtherHours}
              />
            </div>
          </>
        ) : (
          <>
            <ReportFilters
              employees={employees}
              groups={groups}
              selectedGroupId={selectedGroupId}
              onGroupChange={setSelectedGroupId}
              selectedEmployeeId={selectedEmployeeId}
              onEmployeeChange={setSelectedEmployeeId}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              onGenerate={loadHoursWorkedReport}
              loading={reportLoading}
              actionButtons={
                <>
                  <HoursWorkedExport data={reportData} filename="hours-worked-report.csv" />
                  <ReportPrintButton disabled={!reportData || reportData.groups.length === 0} />
                </>
              }
            />

            <div className="w-4/5 print:w-full mx-auto space-y-2 [&_td]:py-1 [&_th]:py-1 [&_th]:h-auto">
              <HoursWorkedReport data={reportData} loading={reportLoading} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
