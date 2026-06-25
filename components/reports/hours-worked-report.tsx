"use client";

import { Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/spinner';

export interface HoursWorkedEmployeeSummary {
  employeeId: number;
  employeeName: string;
  groupId: number | null;
  totalHours: number;
  overtimeHours: number;
}

export interface HoursWorkedGroup {
  groupId: number | null;
  groupName: string;
  employees: HoursWorkedEmployeeSummary[];
  subtotalHours: number;
  subtotalOvertimeHours: number;
}

export interface HoursWorkedReportData {
  startDate: string;
  endDate: string;
  groups: HoursWorkedGroup[];
  grandTotalHours: number;
}

interface HoursWorkedReportProps {
  data: HoursWorkedReportData | null;
  loading: boolean;
}

export function HoursWorkedReport({ data, loading }: HoursWorkedReportProps) {
  if (loading) {
    return (
      <div className="border rounded-lg flex items-center justify-center h-24">
        <Spinner />
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="border rounded-lg flex items-center justify-center h-24 text-muted-foreground">
        No results found.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead className="text-right">Overtime Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.groups.map(group => (
            <Fragment key={group.groupId ?? 'none'}>
              <TableRow className="bg-muted">
                <TableCell colSpan={3} className="font-semibold">{group.groupName}</TableCell>
              </TableRow>
              {group.employees.map(emp => (
                <TableRow key={emp.employeeId}>
                  <TableCell className="pl-6">{emp.employeeName}</TableCell>
                  <TableCell className="text-right">{emp.totalHours.toFixed(2)}</TableCell>
                  <TableCell className={`text-right ${emp.overtimeHours > 0 ? 'text-amber-600 font-medium' : ''}`}>
                    {emp.overtimeHours > 0 ? emp.overtimeHours.toFixed(2) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="pl-6 italic text-muted-foreground">Subtotal</TableCell>
                <TableCell className="text-right italic text-muted-foreground">{group.subtotalHours.toFixed(2)}</TableCell>
                <TableCell className="text-right italic text-muted-foreground">
                  {group.subtotalOvertimeHours > 0 ? group.subtotalOvertimeHours.toFixed(2) : '—'}
                </TableCell>
              </TableRow>
            </Fragment>
          ))}
          <TableRow className="border-t-2 bg-muted">
            <TableCell className="font-bold">Grand Total</TableCell>
            <TableCell className="text-right font-bold">{data.grandTotalHours.toFixed(2)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
