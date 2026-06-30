"use client";

import { Button } from '@/components/ui/button';
import { Parser } from 'json2csv';
import type { GraysonTimeReportData } from './grayson-time-report';

interface GraysonTimeExportProps {
  data: GraysonTimeReportData | null;
  filename?: string;
}

export function GraysonTimeExport({ data, filename = 'grayson-time-report.csv' }: GraysonTimeExportProps) {
  const handleExportCsv = () => {
    if (!data || data.employees.length === 0) return;

    const twoPeriods = data.periods === 2;

    const fields = twoPeriods
      ? ['Employee', 'Week 1 REG', 'Week 1 OT', 'Week 1 Other', 'Week 2 REG', 'Week 2 OT', 'Week 2 Other', 'Total REG', 'Total OT', '1FE', 'TOTAL', 'Changes']
      : ['Employee', 'REG', 'OT', 'Other', 'Changes'];

    const rows = data.employees.map(emp => {
      if (twoPeriods) {
        return {
          'Employee': emp.employeeName,
          'Week 1 REG': emp.week1Reg.toFixed(2),
          'Week 1 OT': emp.week1Ot.toFixed(2),
          'Week 1 Other': emp.week1Other.toFixed(2),
          'Week 2 REG': emp.week2Reg.toFixed(2),
          'Week 2 OT': emp.week2Ot.toFixed(2),
          'Week 2 Other': emp.week2Other.toFixed(2),
          'Total REG': emp.totalReg.toFixed(2),
          'Total OT': emp.totalOt.toFixed(2),
          '1FE': emp.total1FE.toFixed(2),
          'TOTAL': emp.totalHours.toFixed(2),
          'Changes': emp.notes || '',
        };
      }
      return {
        'Employee': emp.employeeName,
        'REG': emp.week1Reg.toFixed(2),
        'OT': emp.week1Ot.toFixed(2),
        'Other': emp.week1Other.toFixed(2),
        'Changes': emp.notes || '',
      };
    });

    const totalRow = twoPeriods
      ? {
          'Employee': 'GRAND TOTAL',
          'Week 1 REG': '', 'Week 1 OT': '', 'Week 1 Other': '',
          'Week 2 REG': '', 'Week 2 OT': '', 'Week 2 Other': '',
          'Total REG': data.grandTotals.reg.toFixed(2),
          'Total OT': data.grandTotals.ot.toFixed(2),
          '1FE': data.grandTotals.other.toFixed(2),
          'TOTAL': data.grandTotals.total.toFixed(2),
          'Changes': '',
        }
      : {
          'Employee': 'GRAND TOTAL',
          'REG': data.grandTotals.reg.toFixed(2),
          'OT': data.grandTotals.ot.toFixed(2),
          'Other': data.grandTotals.other.toFixed(2),
          'Changes': '',
        };
    rows.push(totalRow);

    const parser = new Parser({ fields });
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
    <Button onClick={handleExportCsv} disabled={!data || data.employees.length === 0} variant="outline">
      Export CSV
    </Button>
  );
}
