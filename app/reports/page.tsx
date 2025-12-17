"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Parser } from 'json2csv';
import { Spinner } from '@/components/spinner';
import { FileX } from 'lucide-react';
import Link from 'next/link';
import { config } from '@/lib/config';

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

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeCodes, setTimeCodes] = useState<TimeCode[]>([]);
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedTimeCode, setSelectedTimeCode] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 11, 31));

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [employeesRes, timeCodesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/time-codes'),
      ]);

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
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        timeCode: selectedTimeCode,
        startDate: startDate?.toISOString() || '',
        endDate: endDate?.toISOString() || '',
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
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

  const handleExportCsv = () => {
    if (reportData.length === 0) return;

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(reportData);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'timesheet_report.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
          <Link href="/timesheet" className="inline-block text-blue-600 hover:underline">
            ← Go back to Timesheet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-full mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Reports</h1>

        <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-card">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs">Employee</label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.last_name}, {emp.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs">Time Code</label>
            <Select value={selectedTimeCode} onValueChange={setSelectedTimeCode}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time Codes</SelectItem>
                {timeCodes.map(tc => (
                  <SelectItem key={tc.code} value={tc.code}>
                    {tc.code} - {tc.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs">Start Date</label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>

          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs">End Date</label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>

          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? <Spinner /> : 'Generate Report'}
          </Button>

          <Button onClick={handleExportCsv} disabled={reportData.length === 0} variant="outline">
            Export CSV
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time Code</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Spinner />
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.employee_name}</TableCell>
                    <TableCell>{row.entry_date}</TableCell>
                    <TableCell>{row.time_code}</TableCell>
                    <TableCell>{row.hours}</TableCell>
                    <TableCell>{row.notes}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
