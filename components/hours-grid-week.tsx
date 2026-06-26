"use client";

import { useState } from 'react';
import { MultiEntryDialog } from './multi-entry-dialog';
import type { HoursEntry, EntryChangeResult } from '@/lib/hours-types';
import { useHoursCell } from '@/hooks/use-hours-cell';
import { getWeekDates, formatDateStr, isToday, isWeekend, DAY_NAMES_SHORT } from '@/lib/date-helpers';

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface HoursGridWeekProps {
  weekStart: Date;
  employeeId: number;
  entries: HoursEntry[];
  onEntryChange: (date: string, entries: HoursEntry[], employeeId?: number, originalDate?: string) => Promise<EntryChangeResult>;
  overtimeThresholdHours?: number;
  employeeNameMap?: Record<number, string>;
  readOnly?: boolean;
}

export function HoursGridWeek({
  weekStart,
  employeeId,
  entries,
  onEntryChange,
  overtimeThresholdHours,
  employeeNameMap,
  readOnly,
}: HoursGridWeekProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<HoursEntry[]>([]);

  const {
    getEntriesForDate,
    getCellColorClass,
  } = useHoursCell({ entries, overtimeThresholdHours });

  const dates = getWeekDates(weekStart);

  const handleCardClick = (date: Date) => {
    const dateStr = formatDateStr(date);
    const entriesForDate = getEntriesForDate(dateStr);
    setSelectedDate(dateStr);
    setSelectedEntries(entriesForDate);
    setDialogOpen(true);
  };

  const handleSave = (date: string, updatedEntries: HoursEntry[], originalDate?: string) => {
    return onEntryChange(date, updatedEntries, undefined, originalDate);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {dates.map((date, index) => {
          const dateStr = formatDateStr(date);
          const isTodayDate = isToday(date);
          const isWeekendDay = isWeekend(date);
          const entriesForDate = getEntriesForDate(dateStr);
          const totalHours = entriesForDate.reduce((sum, e) => sum + e.hours, 0);

          return (
            <div
              key={dateStr}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-colors hover:border-primary/50 ${
                isTodayDate ? 'ring-2 ring-primary' : ''
              } ${isWeekendDay ? 'bg-muted/10' : ''}`}
              onClick={() => handleCardClick(date)}
            >
              {/* Day header */}
              <div className={`px-2 py-1.5 border-b text-xs font-medium ${
                isTodayDate ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <div className="flex justify-between items-center">
                  <span>{DAY_NAMES_SHORT[index]}</span>
                  <span>{SHORT_MONTH_NAMES[date.getMonth()]} {date.getDate()}</span>
                </div>
              </div>

              {/* Day content */}
              <div className="p-2 min-h-[80px] flex flex-col relative">
                {entriesForDate.length === 0 ? null : (
                  <div className="space-y-1 flex-1">
                    {entriesForDate.map((entry, entryIndex) => (
                      <div
                        key={entry.id || entryIndex}
                        className={`text-xs px-1.5 py-0.5 rounded ${getCellColorClass([entry], dateStr)}`}
                        title={entry.work_location || undefined}
                      >
                        <span className="font-semibold">{entry.hours}h</span>
                        {entry.work_location && (
                          <span className="text-muted-foreground capitalize"> ({entry.work_location})</span>
                        )}
                        {entry.notes && (
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Total hours */}
                {entriesForDate.length > 0 && (
                  <div className="text-[10px] text-muted-foreground text-right mt-1 pt-1 border-t">
                    Total: {totalHours}h
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
