"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDateStr } from '@/lib/date-helpers';
import type { HoursEntry } from '@/lib/hours-types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

interface TimesheetGridProps {
  employees: Employee[];
  entries: HoursEntry[];
  weekDates: Date[]; // Mon–Sat, 6 dates
  onCellSave: (employeeId: number, date: string, hours: number | null) => Promise<void>;
  saving: Record<string, boolean>; // "empId:date" -> true while saving
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildHoursMap(entries: HoursEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of entries) {
    const key = `${entry.employee_id}:${entry.entry_date}`;
    map[key] = (map[key] ?? 0) + entry.hours;
  }
  return map;
}

export function TimesheetGrid({ employees, entries, weekDates, onCellSave, saving }: TimesheetGridProps) {
  const [cellState, setCellState] = useState<Record<string, string>>({});
  const committedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const hoursMap = buildHoursMap(entries);
    const initial: Record<string, string> = {};
    for (const emp of employees) {
      for (const date of weekDates) {
        const dateStr = formatDateStr(date);
        const key = `${emp.id}:${dateStr}`;
        const hours = hoursMap[key];
        initial[key] = hours != null && hours > 0 ? String(hours) : '';
      }
    }
    setCellState(initial);
    committedRef.current = { ...initial };
  }, [entries, employees, weekDates]);

  const handleChange = (key: string, value: string) => {
    setCellState(prev => ({ ...prev, [key]: value }));
  };

  const handleBlur = useCallback(async (empId: number, dateStr: string, inputValue: string) => {
    const key = `${empId}:${dateStr}`;
    const committed = committedRef.current[key] ?? '';
    if (inputValue === committed) return;

    const hours = inputValue === '' ? null : parseFloat(inputValue);
    if (hours !== null && (isNaN(hours) || hours < 0)) {
      setCellState(prev => ({ ...prev, [key]: committed }));
      return;
    }

    committedRef.current[key] = inputValue;
    await onCellSave(empId, dateStr, hours);
  }, [onCellSave]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/50 border-b min-w-[180px]">
              Employee
            </th>
            {weekDates.map((date, i) => (
              <th key={i} className="text-center px-2 py-2 font-medium border-b min-w-[80px]">
                <div>{DAY_LABELS[i]}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {String(date.getMonth() + 1).padStart(2, '0')}/{String(date.getDate()).padStart(2, '0')}
                </div>
              </th>
            ))}
            <th className="text-center px-2 py-2 font-medium border-b min-w-[72px] text-muted-foreground">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-10 text-muted-foreground">
                No employees found.
              </td>
            </tr>
          )}
          {employees.map((emp, rowIdx) => {
            let total = 0;
            return (
              <tr key={emp.id} className={rowIdx % 2 !== 0 ? 'bg-muted/20' : undefined}>
                <td className={cn(
                  'px-3 py-1.5 font-medium sticky left-0 border-b',
                  rowIdx % 2 !== 0 ? 'bg-muted/20' : 'bg-background'
                )}>
                  {emp.last_name}, {emp.first_name}
                </td>
                {weekDates.map((date, i) => {
                  const dateStr = formatDateStr(date);
                  const key = `${emp.id}:${dateStr}`;
                  const val = cellState[key] ?? '';
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal) && numVal > 0) total += numVal;
                  const isSaving = saving[key] ?? false;
                  return (
                    <td key={i} className="px-1.5 py-1 border-b text-center">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={val}
                        onChange={e => handleChange(key, e.target.value)}
                        onFocus={e => e.target.select()}
                        onBlur={e => handleBlur(emp.id, dateStr, e.target.value)}
                        disabled={isSaving}
                        className={cn(
                          'h-7 w-16 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          isSaving && 'opacity-50'
                        )}
                        placeholder="—"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 border-b text-center font-medium">
                  {total > 0 ? total : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
