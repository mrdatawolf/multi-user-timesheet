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
import { LeaveBalanceSummary } from '@/components/reports/leave-balance-summary';
import { LeaveBalanceExport } from '@/components/reports/leave-balance-export';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';

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
  type?: string;
  isDefault?: boolean;
  columns?: ReportColumn[];
  export: {
    csv: boolean;
    pdf: boolean;
    filename: string;
  };
}

interface LeaveBalanceSummaryData {
  employees: Array<{
    id: number;
    name: string;
    balances: Array<{
      timeCode: string;
      label: string;
      used: number;
      allocated: number | null;
      hasAllocation: boolean;
    }>;
  }>;
  columns: Array<{
    timeCode: string;
    label: string;
    hasAllocation: boolean;
  }>;
  config: {
    warningThreshold: number;
    criticalThreshold: number;
  };
  year: number;
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

  // Report definitions
  const [reportDefinitions, setReportDefinitions] = useState<ReportDefinition[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Attendance Summary state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [attendanceData, setAttendanceData] = useState<ReportEntry[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedTimeCode, setSelectedTimeCode] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 11, 31));

  // Leave Balance Summary state
  const [leaveBalanceData, setLeaveBalanceData] = useState<LeaveBalanceSummaryData | null>(null);

  // Loading states
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

  // Load report when selection changes
  useEffect(() => {
    if (selectedReportId === 'leave-balance-summary' && isAuthenticated) {
      loadLeaveBalanceSummary();
    }
  }, [selectedReportId, isAuthenticated]);

  const loadInitialData = async () => {
    try {
      const [employeesRes, timeCodesRes, reportDefsRes] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/time-codes'),
        authFetch('/api/report-definitions'),
      ]);

      if (employeesRes.status === 401 || timeCodesRes.status === 401) {
        return;
      }

      const employeesData = await employeesRes.json();
      const timeCodesData = await timeCodesRes.json();

      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
      }

      if (Array.isArray(timeCodesData)) {
        setTimeCodes(timeCodesData);
      }

      // Load all report definitions
      if (reportDefsRes.ok) {
        const reportDefsData = await reportDefsRes.json();
        // API returns array directly
        if (Array.isArray(reportDefsData)) {
          setReportDefinitions(reportDefsData);
          // Select the default report or first one
          const defaultReport = reportDefsData.find((r: ReportDefinition) => r.isDefault);
          setSelectedReportId(defaultReport?.id || reportDefsData[0]?.id || '');
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadLeaveBalanceSummary = async () => {
    setReportLoading(true);
    try {
      const res = await authFetch('/api/reports/leave-balance-summary');

      if (res.status === 401) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setLeaveBalanceData(data);
      } else {
        console.error('Failed to load leave balance summary');
        setLeaveBalanceData(null);
      }
    } catch (error) {
      console.error('Failed to load leave balance summary:', error);
      setLeaveBalanceData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const formatDateForApi = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleGenerateAttendanceReport = async () => {
    setReportLoading(true);
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
        setAttendanceData(data);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setAttendanceData([]);
    } finally {
      setReportLoading(false);
    }
  };

  const selectedReport = reportDefinitions.find(r => r.id === selectedReportId);
  const isLeaveBalanceSummary = selectedReportId === 'leave-balance-summary';

  // Use report definition values or fall back to defaults
  const columns = selectedReport?.columns || DEFAULT_COLUMNS;
  const exportFilename = selectedReport?.export?.filename
    ? `${selectedReport.export.filename}.csv`
    : 'report.csv';

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
          <Link href="/attendance" className="inline-block text-blue-600 hover:underline">
            &larr; Go back to Attendance
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header with Report Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Reports</h1>

          {reportDefinitions.length > 1 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="report-select" className="text-sm font-medium">Report:</Label>
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger id="report-select" className="w-64">
                  <SelectValue placeholder="Select report..." />
                </SelectTrigger>
                <SelectContent>
                  {reportDefinitions.map(report => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Report Description */}
        {selectedReport?.description && (
          <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
        )}

        {/* Conditional Report Content */}
        {isLeaveBalanceSummary ? (
          /* Leave Balance Summary Report */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {leaveBalanceData?.year || new Date().getFullYear()} Leave Balances
              </h2>
              <LeaveBalanceExport
                data={leaveBalanceData}
                filename={exportFilename}
              />
            </div>

            <LeaveBalanceSummary
              data={leaveBalanceData}
              loading={reportLoading}
            />
          </div>
        ) : (
          /* Attendance Summary Report (and other table-based reports) */
          <>
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
              onGenerate={handleGenerateAttendanceReport}
              loading={reportLoading}
              actionButtons={
                <ReportExport
                  data={attendanceData}
                  filename={exportFilename}
                />
              }
            />

            <ReportTable
              columns={columns}
              data={attendanceData}
              loading={reportLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
