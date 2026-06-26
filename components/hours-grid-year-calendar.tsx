"use client";

import { useState } from 'react';
import { MultiEntryDialog } from './multi-entry-dialog';
import type { HoursEntry, EntryChangeResult } from '@/lib/hours-types';
import { useHoursCell } from '@/hooks/use-hours-cell';
import { getMonthCalendarGrid, formatDateStr, isToday, isWeekend } from '@/lib/date-helpers';

interface HoursGridYearCalendarProps {
  year: number;
  employeeId: number;
  entries: HoursEntry[];
  onEntryChange: (date: string, entries: HoursEntry[], employeeId?: number, originalDate?: string) => Promise<EntryChangeResult>;
  overtimeThresholdHours?: number;
  employeeNameMap?: Record<number, string>;
  readOnly?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// --- MonthCard sub-component ---

interface MonthCardProps {
  year: number;
  month: number; // 1-12
  cellHook: ReturnType<typeof useHoursCell>;
  onCellClick: (date: Date) => void;
}

function MonthCard({ year, month, cellHook, onCellClick }: MonthCardProps) {
  const weeks = getMonthCalendarGrid(year, month);
  const { getEntriesForDate, getCellDisplay, getCellColorClass, hasNotes } = cellHook;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Month header */}
      <div className="bg-muted px-2 py-1 text-sm font-semibold text-center">
        {MONTH_NAMES[month - 1]}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {DAY_LETTERS.map((letter, i) => (
              <th
                key={i}
                className={`text-[10px] font-medium text-center p-0.5 ${
                  i >= 5 ? 'text-muted-foreground' : ''
                }`}
              >
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map(date => {
                const dateStr = formatDateStr(date);
                const isCurrentMonth = date.getMonth() === month - 1;
                const isTodayDate = isToday(date);
                const isWeekendDay = isWeekend(date);
                const entriesForDate = getEntriesForDate(dateStr);

                return (
                  <td
                    key={dateStr}
                    className={`p-0 text-center ${
                      !isCurrentMonth ? 'opacity-20' : ''
                    } ${isWeekendDay && isCurrentMonth ? 'bg-muted/10' : ''}`}
                  >
                    <div
                      className={`relative min-h-[28px] flex flex-col items-center justify-center ${
                        isCurrentMonth ? 'cursor-pointer hover:bg-accent/50' : ''
                      } ${isTodayDate ? 'ring-1 ring-inset ring-primary rounded-sm' : ''} ${
                        isCurrentMonth ? getCellColorClass(entriesForDate, dateStr) : ''
                      }`}
                      onClick={() => isCurrentMonth && onCellClick(date)}
                      title={isCurrentMonth ? `${dateStr}: ${getCellDisplay(entriesForDate)}` : undefined}
                    >
                      {/* Day number */}
                      <span className={`text-[9px] leading-none ${
                        isTodayDate ? 'font-bold text-primary' : 'text-muted-foreground'
                      }`}>
                        {date.getDate()}
                      </span>

                      {/* Entry indicator */}
                      {isCurrentMonth && entriesForDate.length > 0 && (
                        <span className="text-[8px] leading-none font-semibold truncate max-w-full">
                          {getCellDisplay(entriesForDate)}
                        </span>
                      )}

                      {/* Notes dot */}
                      {isCurrentMonth && hasNotes(entriesForDate) && (
                        <div className="absolute top-0 right-0 w-1 h-1 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Main component ---

export function HoursGridYearCalendar({
  year,
  employeeId,
  entries,
  onEntryChange,
  overtimeThresholdHours,
  employeeNameMap,
  readOnly,
}: HoursGridYearCalendarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<HoursEntry[]>([]);

  const cellHook = useHoursCell({ entries, overtimeThresholdHours });

  const handleCellClick = (date: Date) => {
    const dateStr = formatDateStr(date);
    const entriesForDate = cellHook.getEntriesForDate(dateStr);
    setSelectedDate(dateStr);
    setSelectedEntries(entriesForDate);
    setDialogOpen(true);
  };

  const handleSave = (date: string, updatedEntries: HoursEntry[], originalDate?: string) => {
    return onEntryChange(date, updatedEntries, undefined, originalDate);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
          <MonthCard
            key={month}
            year={year}
            month={month}
            cellHook={cellHook}
            onCellClick={handleCellClick}
          />
        ))}
      </div>
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
