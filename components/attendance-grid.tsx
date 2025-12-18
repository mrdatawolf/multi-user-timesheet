"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EntryEditDialog } from './entry-edit-dialog';

interface TimeCode {
  code: string;
  description: string;
}

interface AttendanceEntry {
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
  onEntryChange: (date: string, timeCode: string, hours: number, notes: string) => void;
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
}: AttendanceGridProps) {
  const [localEntries, setLocalEntries] = useState<Map<string, { time_code: string; hours: number; notes: string }>>(
    new Map(entries.map(e => [e.entry_date, { time_code: e.time_code, hours: e.hours, notes: e.notes || '' }]))
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeCode, setSelectedTimeCode] = useState('');
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState('');

  useEffect(() => {
    setLocalEntries(new Map(entries.map(e => [e.entry_date, { time_code: e.time_code, hours: e.hours, notes: e.notes || '' }])));
  }, [entries, year]);

  const getEntryForDate = (month: number, day: number): { time_code: string; hours: number; notes: string } => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return localEntries.get(dateStr) || { time_code: '__NONE__', hours: 0, notes: '' };
  };

  const handleCellClick = (month: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = getEntryForDate(month, day);
    setSelectedDate(dateStr);
    setSelectedTimeCode(entry.time_code);
    setSelectedHours(entry.hours);
    setSelectedNotes(entry.notes);
    setDialogOpen(true);
  };

  const handleSave = (date: string, timeCode: string, hours: number, notes: string) => {
    const newEntries = new Map(localEntries);
    if (timeCode && timeCode !== '__NONE__') {
      newEntries.set(date, { time_code: timeCode, hours, notes });
    } else {
      newEntries.delete(date);
    }
    setLocalEntries(newEntries);

    onEntryChange(date, timeCode === '__NONE__' ? '' : timeCode, hours, notes);
  };

  const getDaysInMonth = (month: number): number => {
    return new Date(year, month, 0).getDate();
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
          {MONTHS.map(month => (
            <tr key={month.num} className="hover:bg-muted/50">
              <td className="border p-0.5 text-xs font-medium sticky left-0 bg-background z-10">
                {month.name}
              </td>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const daysInMonth = getDaysInMonth(month.num);
                const isValidDay = day <= daysInMonth;
                const { time_code, hours, notes } = getEntryForDate(month.num, day);

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
                        className="h-5 text-xs w-full px-1 relative"
                        onClick={() => handleCellClick(month.num, day)}
                      >
                        {time_code !== '__NONE__' ? `${time_code} (${hours})` : '-'}
                        {notes && <div className="absolute top-0 right-0 w-1 h-1 bg-blue-500 rounded-full"></div>}
                      </Button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <EntryEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        timeCode={selectedTimeCode}
        hours={selectedHours}
        notes={selectedNotes}
        timeCodes={timeCodes}
        onSave={handleSave}
      />
    </div>
  );
}
