"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { config } from '@/lib/config';
import { useHelp } from '@/lib/help-context';
import { useAuth } from '@/lib/auth-context';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportTable } from '@/components/reports/report-table';
import { ReportExport } from '@/components/reports/report-export';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

interface TimeCode {
  id: number;
  code: string;
  description: string;
}

interface ReportEntry {
  employee_name: string;
  entry_date: string;
  time_code: string;
  hours: number;
  notes: string;
}

interface ReportColumn {
  key: string;
  header: string;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
  isDefault?: boolean;
  columns: ReportColumn[];
  export: {
    csv: boolean;
    pdf: boolean;
    filename: string;
  };
}

const DEFAULT_COLUMNS: ReportColumn[] = [
  { key: 'employee_name', header: 'Employee' },
  { key: 'entry_date', header: 'Date' },
  { key: 'time_code', header: 'Time Code' },
  { key: 'hours', header: 'Hours' },
  { key: 'notes', header: 'Notes' },
];

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, authFetch } = useAuth();
  const { setCurrentScreen } = useHelp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [reportDefinition, setReportDefinition] = useState<ReportDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedTimeCode, setSelectedTimeCode] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 11, 31));

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

  const loadInitialData = async () => {
    try {
      const [employeesRes, timeCodesRes, reportDefRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/time-codes'),
        authFetch('/api/report-definitions?id=attendance-summary'),
      ]);

      if (employeesRes.status === 401 || timeCodesRes.status === 401) {
        return;
      }

      const employeesData = await employeesRes.json();
      const timeCodesData = await timeCodesRes.json();

      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
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

      // Load report definition (non-critical, use defaults if fails)
      if (reportDefRes.ok) {
        const reportDefData = await reportDefRes.json();
        if (reportDefData && !reportDefData.error) {
          setReportDefinition(reportDefData);
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Format date as YYYY-MM-DD for database comparison
  const formatDateForApi = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        timeCode: selectedTimeCode,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
      });

      const res = await authFetch(`/api/reports?${params.toString()}`);

      if (res.status === 401) {
        return;
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setReportData(data);
      } else {
        console.error('Invalid report data:', data);
        setReportData([]);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Use report definition values or fall back to defaults
  const columns = reportDefinition?.columns || DEFAULT_COLUMNS;
  const exportFilename = reportDefinition?.export?.filename
    ? `${reportDefinition.export.filename}.csv`
    : 'attendance_report.csv';

  if (!config.features.enableReports) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Reports Disabled</h1>
          <p className="text-muted-foreground">
            The reports feature is currently disabled.
            <code className="text-sm bg-muted px-2 py-1 rounded">lib/config.ts</code> and set{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">features.enableReports</code> to{' '}
            <code className="text-sm bg-muted px-2 py-1 rounded">true</code>.
          </p>
          <Link href="/attendance" className="inline-block text-blue-600 hover:underline">
            &larr; Go back to Attendance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-4">
        <h1 className="text-2xl font-bold">
          {reportDefinition?.name || 'Reports'}
        </h1>

        <ReportFilters
          employees={employees}
          timeCodes={timeCodes}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={setSelectedEmployeeId}
          selectedTimeCode={selectedTimeCode}
          onTimeCodeChange={setSelectedTimeCode}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onGenerate={handleGenerateReport}
          loading={loading}
          actionButtons={
            <ReportExport
              data={reportData}
              filename={exportFilename}
            />
          }
        />

        <ReportTable
          columns={columns}
          data={reportData}
          loading={loading}
        />
      </div>
    </div>
  );
}
