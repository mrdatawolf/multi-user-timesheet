"use client";

import { useEffect, useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { MultiEntryDialog } from './multi-entry-dialog';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';

interface TimeCode {
  code: string;
  description: string;
}

export interface AttendanceEntry {
  id?: number;
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
}

interface AttendanceGridProps {
  year: number;
  employeeId: number;
  entries: AttendanceEntry[];
  timeCodes: TimeCode[];
  onEntryChange: (date: string, entries: AttendanceEntry[]) => void;
  companyHolidays?: Set<string>;
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

export function AttendanceGrid({
  year,
  employeeId,
  entries,
  timeCodes,
  onEntryChange,
  companyHolidays = new Set(),
}: AttendanceGridProps) {
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);

  // Store entries as Map<date, AttendanceEntry[]> to support multiple entries per day
  const [localEntries, setLocalEntries] = useState<Map<string, AttendanceEntry[]>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<AttendanceEntry[]>([]);

  useEffect(() => {
    // Group entries by date
    const entriesByDate = new Map<string, AttendanceEntry[]>();
    entries.forEach(entry => {
      const existing = entriesByDate.get(entry.entry_date) || [];
      existing.push(entry);
      entriesByDate.set(entry.entry_date, existing);
    });
    setLocalEntries(entriesByDate);
  }, [entries, year]);

  const getEntriesForDate = (month: number, day: number): AttendanceEntry[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return localEntries.get(dateStr) || [];
  };

  const handleCellClick = (month: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entriesForDate = getEntriesForDate(month, day);
    setSelectedDate(dateStr);
    setSelectedEntries(entriesForDate);
    setDialogOpen(true);
  };

  const handleSave = (date: string, updatedEntries: AttendanceEntry[]) => {
    const newEntries = new Map(localEntries);
    if (updatedEntries.length > 0) {
      newEntries.set(date, updatedEntries);
    } else {
      newEntries.delete(date);
    }
    setLocalEntries(newEntries);

    onEntryChange(date, updatedEntries);
  };

  const getDaysInMonth = (month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getCellDisplay = (entriesForDate: AttendanceEntry[]) => {
    if (entriesForDate.length === 0) {
      return '-';
    }

    if (entriesForDate.length === 1) {
      const entry = entriesForDate[0];
      return `${entry.time_code} (${entry.hours})`;
    }

    // Multiple entries: show *totalHours
    const totalHours = entriesForDate.reduce((sum, e) => sum + e.hours, 0);
    return `*${totalHours.toFixed(1)}`;
  };

  const hasNotes = (entriesForDate: AttendanceEntry[]) => {
    return entriesForDate.some(e => e.notes && e.notes.trim().length > 0);
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
                  const isCompanyHoliday = companyHolidays.has(dateStr);
                  const isClickable = isValidDay && !isCompanyHoliday;
                  const entriesForDate = getEntriesForDate(month.num, day);

                  return (
                    <td
                      key={day}
                      className={`border px-0.5 py-px ${
                        !isClickable ? 'bg-muted/30' : ''
                      }`}
                    >
                      {isClickable && (
                        <Button
                          variant="ghost"
                          className="h-5 text-xs w-full px-1 relative"
                          onClick={() => handleCellClick(month.num, day)}
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
        timeCodes={timeCodes}
        onSave={handleSave}
      />
    </div>
  );
}
