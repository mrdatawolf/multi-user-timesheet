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
import { ReportPrintButton } from '@/components/reports/report-print-button';
import { formatDateStr } from '@/lib/date-helpers';
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

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, authFetch } = useAuth();
  const { setCurrentScreen } = useHelp();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const [reportData, setReportData] = useState<HoursWorkedReportData | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

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
  }, [isAuthenticated, initialLoading]);

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
        const data = await res.json();
        setReportData(data);
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
        <div>
          <h1 className="text-2xl font-bold">Hours Worked Report</h1>
          <p className="text-sm text-muted-foreground">
            Totals are grouped by team, with overtime hours flagged per employee.
          </p>
          {reportData && (
            <p className="hidden print:block text-sm text-muted-foreground mt-1">
              Period: {reportData.startDate} to {reportData.endDate}
            </p>
          )}
        </div>

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
          onGenerate={handleGenerateReport}
          loading={reportLoading}
          actionButtons={
            <>
              <HoursWorkedExport data={reportData} filename="hours-worked-report.csv" />
              <ReportPrintButton data={reportData} />
            </>
          }
        />

        <div className="w-4/5 print:w-full mx-auto space-y-2 [&_td]:py-1 [&_th]:py-1 [&_th]:h-auto">
          <HoursWorkedReport data={reportData} loading={reportLoading} />
        </div>
      </div>
    </div>
  );
}
