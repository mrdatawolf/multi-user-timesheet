"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MultiEntryDialog } from './multi-entry-dialog';
import type { AttendanceEntry, EntryChangeResult } from '@/lib/attendance-types';
import { useAttendanceCell } from '@/hooks/use-attendance-cell';
import { getMonthCalendarGrid, formatDateStr, isToday, isWeekend, DAY_NAMES_SHORT } from '@/lib/date-helpers';

interface AttendanceGridMonthProps {
  year: number;
  month: number; // 1-12
  employeeId: number;
  entries: AttendanceEntry[];
  onEntryChange: (date: string, entries: AttendanceEntry[], employeeId?: number, originalDate?: string) => Promise<EntryChangeResult>;
  overtimeThresholdHours?: number;
  employeeNameMap?: Record<number, string>;
  readOnly?: boolean;
}

export function AttendanceGridMonth({
  year,
  month,
  employeeId,
  entries,
  onEntryChange,
  overtimeThresholdHours,
  employeeNameMap,
  readOnly,
}: AttendanceGridMonthProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<AttendanceEntry[]>([]);

  const {
    getEntriesForDate,
    getCellDisplay,
    getCellColorClass,
    hasNotes,
  } = useAttendanceCell({ entries, overtimeThresholdHours });

  const weeks = getMonthCalendarGrid(year, month);

  const handleCellClick = (date: Date) => {
    const dateStr = formatDateStr(date);
    const entriesForDate = getEntriesForDate(dateStr);
    setSelectedDate(dateStr);
    setSelectedEntries(entriesForDate);
    setDialogOpen(true);
  };

  const handleSave = (date: string, updatedEntries: AttendanceEntry[], originalDate?: string) => {
    return onEntryChange(date, updatedEntries, undefined, originalDate);
  };

  const getCellTooltip = (entries: AttendanceEntry[]): string => {
    if (entries.length === 0) return '';
    return entries
      .map(e => `${e.hours}h${e.work_location ? ` (${e.work_location})` : ''}${e.notes ? ` - ${e.notes}` : ''}`)
      .join('\n');
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            {DAY_NAMES_SHORT.map((day, i) => (
              <th
                key={day}
                className={`border p-1.5 text-xs font-semibold text-center ${
                  i >= 5 ? 'text-muted-foreground' : ''
                }`}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((date) => {
                const dateStr = formatDateStr(date);
                const isCurrentMonth = date.getMonth() === month - 1;
                const isTodayDate = isToday(date);
                const isWeekendDay = isWeekend(date);
                const entriesForDate = getEntriesForDate(dateStr);

                return (
                  <td
                    key={dateStr}
                    className={`border p-0.5 align-top h-18 ${
                      !isCurrentMonth ? 'bg-muted/20' : ''
                    } ${
                      isWeekendDay && isCurrentMonth ? 'bg-muted/10' : ''
                    } ${isTodayDate ? 'ring-2 ring-inset ring-primary' : ''}`}
                  >
                    <div className="min-h-[56px] flex flex-col">
                      {/* Day number */}
                      <div className={`text-xs px-1 ${
                        !isCurrentMonth ? 'text-muted-foreground/40' : ''
                      } ${isTodayDate ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        {date.getDate()}
                      </div>

                      {/* Entry content */}
                      {isCurrentMonth && (
                        <div className="flex-1 relative">
                          <Button
                            variant="ghost"
                            className={`h-auto min-h-[32px] text-xs w-full px-1 py-0.5 justify-start relative ${getCellColorClass(entriesForDate, dateStr)}`}
                            onClick={() => handleCellClick(date)}
                            title={getCellTooltip(entriesForDate)}
                          >
                            <span className="truncate">
                              {entriesForDate.length > 0 ? getCellDisplay(entriesForDate) : ''}
                            </span>
                            {hasNotes(entriesForDate) && (
                              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
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
