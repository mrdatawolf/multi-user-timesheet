"use client";

import { useEffect, useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { MultiEntryDialog } from './multi-entry-dialog';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth-context';

interface TimeCode {
  code: string;
  description: string;
}

// Mapping of semantic colors to Tailwind background classes for cells
const CELL_BG_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 hover:bg-blue-200',
  amber: 'bg-amber-100 hover:bg-amber-200',
  red: 'bg-red-100 hover:bg-red-200',
  teal: 'bg-teal-100 hover:bg-teal-200',
  purple: 'bg-purple-100 hover:bg-purple-200',
  green: 'bg-green-100 hover:bg-green-200',
  gray: 'bg-gray-100 hover:bg-gray-200',
};

interface TimeCodeColorInfo {
  code: string;
  defaultColor: string;
}

interface ColorConfig {
  config_type: string;
  config_key: string;
  color_name: string;
}

export interface AttendanceEntry {
  id?: number;
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
}

export interface DailySummaryDay {
  outCount: number;
}

export type DailySummary = Record<string, DailySummaryDay>;

interface AttendanceGridProps {
  year: number;
  employeeId: number;
  entries: AttendanceEntry[];
  timeCodes: TimeCode[];
  onEntryChange: (date: string, entries: AttendanceEntry[]) => void;
  companyHolidays?: Set<string>;
  dailySummary?: DailySummary | null;
  totalActiveEmployees?: number;
  maxOutOfOffice?: number;
  capacityWarningCount?: number;
  capacityCriticalCount?: number;
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
  dailySummary,
  totalActiveEmployees,
  maxOutOfOffice = 0,
  capacityWarningCount = 3,
  capacityCriticalCount = 5,
}: AttendanceGridProps) {
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);
  const { authFetch } = useAuth();

  // Store entries as Map<date, AttendanceEntry[]> to support multiple entries per day
  const [localEntries, setLocalEntries] = useState<Map<string, AttendanceEntry[]>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<AttendanceEntry[]>([]);

  // Time code colors state
  const [timeCodeColors, setTimeCodeColors] = useState<Map<string, string>>(new Map());

  // Fetch time code colors from the API
  useEffect(() => {
    const loadColorConfig = async () => {
      try {
        const response = await authFetch('/api/color-config');
        if (response.ok) {
          const data = await response.json();
          const colorMap = new Map<string, string>();

          // First, set defaults from the JSON time codes
          if (data.timeCodes) {
            data.timeCodes.forEach((tc: TimeCodeColorInfo) => {
              if (tc.defaultColor) {
                colorMap.set(tc.code, tc.defaultColor);
              }
            });
          }

          // Then, override with any custom configs from the database
          if (data.colorConfigs) {
            data.colorConfigs.forEach((config: ColorConfig) => {
              if (config.config_type === 'time_code') {
                colorMap.set(config.config_key, config.color_name);
              }
            });
          }

          setTimeCodeColors(colorMap);
        }
      } catch (error) {
        console.error('Failed to load color config:', error);
      }
    };
    loadColorConfig();
  }, [authFetch]);

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

  // Get the CSS class for cell coloring based on entries
  const getCellColorClass = (entriesForDate: AttendanceEntry[]): string => {
    if (entriesForDate.length === 0) {
      return '';
    }

    // For single entry, use that time code's color
    if (entriesForDate.length === 1) {
      const colorName = timeCodeColors.get(entriesForDate[0].time_code);
      if (colorName) {
        return CELL_BG_COLOR_MAP[colorName] || '';
      }
    }

    // For multiple entries, use a neutral color or the first entry's color
    // Using gray for mixed entries
    return CELL_BG_COLOR_MAP.gray || '';
  };

  // Get the fullness bar color and width for a date
  // Color scheme: grey (normal) → amber/yellow (warning) → red (critical)
  // Thresholds are based on number of employees OUT of office
  const getFullnessInfo = (dateStr: string) => {
    if (!dailySummary || !totalActiveEmployees || totalActiveEmployees === 0) {
      return null;
    }

    const daySummary = dailySummary[dateStr];
    const outCount = daySummary?.outCount ?? 0;
    const inOfficePercent = ((totalActiveEmployees - outCount) / totalActiveEmployees) * 100;
    const isOverLimit = maxOutOfOffice > 0 && outCount > maxOutOfOffice;

    let barColor: string;
    if (isOverLimit || (capacityCriticalCount > 0 && outCount >= capacityCriticalCount)) {
      barColor = 'bg-red-400';
    } else if (capacityWarningCount > 0 && outCount >= capacityWarningCount) {
      barColor = 'bg-amber-400';
    } else {
      barColor = 'bg-gray-300';
    }

    return { outCount, inOfficePercent, barColor, isOverLimit };
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
                  const fullness = isValidDay ? getFullnessInfo(dateStr) : null;

                  return (
                    <td
                      key={day}
                      className={`border px-0.5 py-px ${
                        !isClickable ? 'bg-muted/30' : ''
                      }`}
                    >
                      {isClickable && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            className={`h-5 text-xs w-full px-1 relative ${getCellColorClass(entriesForDate)}`}
                            onClick={() => handleCellClick(month.num, day)}
                          >
                            {getCellDisplay(entriesForDate)}
                            {hasNotes(entriesForDate) && (
                              <div className="absolute top-0 right-0 w-1 h-1 bg-blue-500 rounded-full"></div>
                            )}
                          </Button>
                          {/* Out-of-office count badge */}
                          {fullness && fullness.outCount > 0 && (
                            <span
                              className={`absolute top-0 left-0 text-[8px] leading-none font-bold rounded-br px-0.5 py-px z-10 ${
                                fullness.isOverLimit
                                  ? 'bg-red-200 text-red-700'
                                  : 'bg-sky-200 text-sky-700'
                              }`}
                              title={`${fullness.outCount}${maxOutOfOffice > 0 ? `/${maxOutOfOffice}` : ''} out of office`}
                            >
                              {fullness.outCount}
                            </span>
                          )}
                          {/* Fullness bar */}
                          {fullness && (
                            <div className="h-[2px] w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${fullness.barColor} transition-all`}
                                style={{ width: `${Math.max(fullness.inOfficePercent, 2)}%` }}
                              />
                            </div>
                          )}
                        </div>
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
