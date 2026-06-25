"use client";

import { Button } from '@/components/ui/button';
import { Parser } from 'json2csv';
import type { HoursWorkedReportData } from './hours-worked-report';

interface HoursWorkedExportProps {
  data: HoursWorkedReportData | null;
  filename?: string;
}

export function HoursWorkedExport({ data, filename = 'hours-worked-report.csv' }: HoursWorkedExportProps) {
  const handleExportCsv = () => {
    if (!data || data.groups.length === 0) return;

    const rows: Record<string, string | number>[] = [];
    for (const group of data.groups) {
      for (const emp of group.employees) {
        rows.push({
          Group: group.groupName,
          Employee: emp.employeeName,
          'Total Hours': emp.totalHours.toFixed(2),
          'Overtime Hours': emp.overtimeHours.toFixed(2),
        });
      }
      rows.push({
        Group: group.groupName,
        Employee: 'TOTAL',
        'Total Hours': group.subtotalHours.toFixed(2),
        'Overtime Hours': group.subtotalOvertimeHours.toFixed(2),
      });
    }

    const parser = new Parser({ fields: ['Group', 'Employee', 'Total Hours', 'Overtime Hours'] });
    const csv = parser.parse(rows);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleExportCsv} disabled={!data || data.groups.length === 0} variant="outline">
      Export CSV
    </Button>
  );
}
