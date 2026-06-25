"use client";

import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { MultiEntryDialog } from './multi-entry-dialog';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import type { AttendanceEntry, EntryChangeResult } from '@/lib/attendance-types';
import { useAttendanceCell } from '@/hooks/use-attendance-cell';

// Re-export types for backward compatibility
export type { AttendanceEntry };

interface AttendanceGridProps {
  year: number;
  employeeId: number;
  entries: AttendanceEntry[];
  onEntryChange: (date: string, entries: AttendanceEntry[], employeeId?: number, originalDate?: string) => Promise<EntryChangeResult>;
  overtimeThresholdHours?: number;
  employeeNameMap?: Record<number, string>;
  readOnly?: boolean;
}

const MONTHS = [
  { name: 'Jan', num: 1 },
  { name: 'Feb', num: 2 },
  { name: 'Mar', num: 3 },
  { name: 'Apr', num: 4 },
  { name: 'May', num: 5 },
  { name: 'June', num: 6 },
  { name: 'July', num: 7 },
  { name: 'Aug', num: 8 },
  { name: 'Sept', num: 9 },
  { name: 'Oct', num: 10 },
  { name: 'Nov', num: 11 },
  { name: 'Dec', num: 12 },
];

export function AttendanceGridYear({
  year,
  employeeId,
  entries,
  onEntryChange,
  overtimeThresholdHours,
  employeeNameMap,
  readOnly,
}: AttendanceGridProps) {
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<AttendanceEntry[]>([]);

  const {
    getEntriesForDate,
    getCellDisplay,
    getCellColorClass,
    hasNotes,
  } = useAttendanceCell({ entries, overtimeThresholdHours });

  const getEntriesForDay = (month: number, day: number): AttendanceEntry[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getEntriesForDate(dateStr);
  };

  const handleCellClick = (month: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entriesForDate = getEntriesForDay(month, day);
    setSelectedDate(dateStr);
    setSelectedEntries(entriesForDate);
    setDialogOpen(true);
  };

  const handleSave = (date: string, updatedEntries: AttendanceEntry[], originalDate?: string) => {
    return onEntryChange(date, updatedEntries, undefined, originalDate);
  };

  const getDaysInMonth = (month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getCellTooltip = (entries: AttendanceEntry[]): string => {
    if (entries.length === 0) return '';
    return entries
      .map(e => `${e.hours}h${e.work_location ? ` (${e.work_location})` : ''}${e.notes ? ` - ${e.notes}` : ''}`)
      .join('\n');
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border p-0.5 text-xs font-semibold sticky left-0 bg-muted z-10 min-w-[35px]">
              Month
            </th>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <th key={day} className="border px-0.5 py-px text-xs font-semibold min-w-[30px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((month, index) => (
            <Fragment key={`month-${month.num}`}>
              <tr className="hover:bg-muted/50">
                <td className="border p-0.5 text-xs font-medium sticky left-0 bg-background z-10">
                  {month.name}
                </td>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const daysInMonth = getDaysInMonth(month.num);
                  const isValidDay = day <= daysInMonth;
                  const dateStr = `${year}-${String(month.num).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const entriesForDate = getEntriesForDay(month.num, day);

                  return (
                    <td
                      key={day}
                      className={`border px-0.5 py-px ${
                        !isValidDay ? 'bg-muted/30' : ''
                      }`}
                    >
                      {isValidDay && (
                        <Button
                          variant="ghost"
                          className={`h-5 text-xs w-full px-1 relative ${getCellColorClass(entriesForDate, dateStr)}`}
                          onClick={() => handleCellClick(month.num, day)}
                          title={getCellTooltip(entriesForDate)}
                        >
                          {getCellDisplay(entriesForDate)}
                          {hasNotes(entriesForDate) && (
                            <div className="absolute top-0 right-0 w-1 h-1 bg-blue-500 rounded-full"></div>
                          )}
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* Month separator (if theme config enables it) */}
              {themeConfig.layout.attendance.showMonthSeparators && index < MONTHS.length - 1 && (
                <tr className="h-2">
                  <td colSpan={32} className="p-0"></td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <MultiEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        entries={selectedEntries}
        onSave={handleSave}
        employeeNameMap={employeeNameMap}
        readOnly={readOnly}
      />
    </div>
  );
}

// Backward-compatible alias
export const AttendanceGrid = AttendanceGridYear;
