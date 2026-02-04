"use client";

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';

interface EmployeeBalance {
  timeCode: string;
  label: string;
  used: number;
  allocated: number | null;
  hasAllocation: boolean;
}

interface EmployeeRow {
  id: number;
  name: string;
  balances: EmployeeBalance[];
}

interface ColumnDef {
  timeCode: string;
  label: string;
  hasAllocation: boolean;
}

interface LeaveBalanceSummaryData {
  employees: EmployeeRow[];
  columns: ColumnDef[];
  config: {
    warningThreshold: number;
    criticalThreshold: number;
  };
  year: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'usage-high' | 'usage-low';

interface LeaveBalanceSummaryProps {
  data: LeaveBalanceSummaryData | null;
  loading: boolean;
}

export function LeaveBalanceSummary({ data, loading }: LeaveBalanceSummaryProps) {
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  const sortedEmployees = useMemo(() => {
    if (!data?.employees) return [];

    const employees = [...data.employees];

    switch (sortBy) {
      case 'name-asc':
        return employees.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return employees.sort((a, b) => b.name.localeCompare(a.name));
      case 'usage-high':
        // Sort by highest usage percentage (first allocation-based column)
        return employees.sort((a, b) => {
          const aMax = getMaxUsagePercent(a.balances);
          const bMax = getMaxUsagePercent(b.balances);
          return bMax - aMax;
        });
      case 'usage-low':
        // Sort by lowest usage percentage
        return employees.sort((a, b) => {
          const aMax = getMaxUsagePercent(a.balances);
          const bMax = getMaxUsagePercent(b.balances);
          return aMax - bMax;
        });
      default:
        return employees;
    }
  }, [data?.employees, sortBy]);

  const getMaxUsagePercent = (balances: EmployeeBalance[]): number => {
    let maxPercent = 0;
    for (const bal of balances) {
      if (bal.hasAllocation && bal.allocated && bal.allocated > 0) {
        const percent = bal.used / bal.allocated;
        if (percent > maxPercent) maxPercent = percent;
      }
    }
    return maxPercent;
  };

  const getCellStyle = (balance: EmployeeBalance): string => {
    if (!balance.hasAllocation || !balance.allocated || balance.allocated === 0) {
      return '';
    }

    const usagePercent = balance.used / balance.allocated;
    const { warningThreshold, criticalThreshold } = data?.config || {
      warningThreshold: 0.9,
      criticalThreshold: 1.0,
    };

    if (usagePercent >= criticalThreshold) {
      return 'bg-red-100 text-red-700 font-medium';
    }
    if (usagePercent >= warningThreshold) {
      return 'bg-amber-100 text-amber-800';
    }
    return '';
  };

  const formatCell = (balance: EmployeeBalance): string => {
    if (balance.hasAllocation) {
      return `${balance.used}/${balance.allocated ?? 0}`;
    }
    return String(balance.used);
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-8 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data || data.employees.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No employees found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <Label htmlFor="sort-select" className="text-sm">Sort by:</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger id="sort-select" className="w-48 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="usage-high">Most Used %</SelectItem>
            <SelectItem value="usage-low">Least Used %</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-muted z-10">Employee</TableHead>
              {data.columns.map(col => (
                <TableHead key={col.timeCode} className="text-center min-w-[80px]">
                  {col.timeCode}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmployees.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">
                  {emp.name}
                </TableCell>
                {emp.balances.map(bal => (
                  <TableCell
                    key={bal.timeCode}
                    className={`text-center ${getCellStyle(bal)}`}
                  >
                    {formatCell(bal)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Legend:</span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-amber-100 border rounded"></span>
          Warning ({((data.config.warningThreshold) * 100).toFixed(0)}%+ used)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-100 border rounded"></span>
          Critical ({((data.config.criticalThreshold) * 100).toFixed(0)}%+ used)
        </span>
      </div>
    </div>
  );
}

// Export helper for CSV generation
export function prepareLeaveBalanceCsvData(data: LeaveBalanceSummaryData | null): {
  headers: string[];
  rows: (string | number)[][];
} {
  if (!data || data.employees.length === 0) {
    return { headers: [], rows: [] };
  }

  // Build headers: Employee, then for each column: "CODE Used", "CODE Allocated" (if has allocation)
  const headers: string[] = ['Employee'];
  for (const col of data.columns) {
    headers.push(`${col.timeCode} Used`);
    if (col.hasAllocation) {
      headers.push(`${col.timeCode} Allocated`);
    }
  }

  // Build rows
  const rows: (string | number)[][] = data.employees.map(emp => {
    const row: (string | number)[] = [emp.name];
    for (const bal of emp.balances) {
      row.push(bal.used);
      if (bal.hasAllocation) {
        row.push(bal.allocated ?? 0);
      }
    }
    return row;
  });

  return { headers, rows };
}
