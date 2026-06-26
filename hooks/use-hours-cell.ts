import { useMemo } from 'react';
import type { AttendanceEntry } from '@/lib/attendance-types';

// Background classes for grid cells, keyed by work location
export const LOCATION_BG_COLOR_MAP: Record<string, string> = {
  onsite: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100',
  remote: 'bg-teal-100 hover:bg-teal-200 dark:bg-teal-900 dark:hover:bg-teal-800 dark:text-teal-100',
};

const OVERTIME_BG_CLASS = 'bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700';

interface UseAttendanceCellOptions {
  entries: AttendanceEntry[];
  overtimeThresholdHours?: number;
}

// Returns the Monday (YYYY-MM-DD) of the ISO week containing the given date
function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function useAttendanceCell({ entries, overtimeThresholdHours = 40 }: UseAttendanceCellOptions) {
  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, AttendanceEntry[]>();
    entries.forEach(entry => {
      const existing = map.get(entry.entry_date) || [];
      existing.push(entry);
      map.set(entry.entry_date, existing);
    });
    return map;
  }, [entries]);

  // Total hours per ISO week (Monday-start), used to flag overtime
  const weekTotals = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(entry => {
      const wk = weekStartOf(entry.entry_date);
      map.set(wk, (map.get(wk) || 0) + (entry.hours || 0));
    });
    return map;
  }, [entries]);

  const getEntriesForDate = (dateStr: string): AttendanceEntry[] => {
    return entriesByDate.get(dateStr) || [];
  };

  const getCellDisplay = (entriesForDate: AttendanceEntry[]): string => {
    if (entriesForDate.length === 0) {
      return '-';
    }
    const totalHours = entriesForDate.reduce((sum, e) => sum + e.hours, 0);
    return `${totalHours}h`;
  };

  const hasNotes = (entriesForDate: AttendanceEntry[]): boolean => {
    return entriesForDate.some(e => e.notes && e.notes.trim().length > 0);
  };

  const isOvertimeWeek = (dateStr: string): boolean => {
    const wk = weekStartOf(dateStr);
    return (weekTotals.get(wk) || 0) > overtimeThresholdHours;
  };

  const getCellColorClass = (entriesForDate: AttendanceEntry[], dateStr: string): string => {
    if (entriesForDate.length === 0) {
      return '';
    }
    if (isOvertimeWeek(dateStr)) {
      return OVERTIME_BG_CLASS;
    }
    if (entriesForDate.length === 1 && entriesForDate[0].work_location) {
      return LOCATION_BG_COLOR_MAP[entriesForDate[0].work_location] || '';
    }
    return '';
  };

  return {
    entriesByDate,
    getEntriesForDate,
    getCellDisplay,
    getCellColorClass,
    hasNotes,
    isOvertimeWeek,
  };
}
