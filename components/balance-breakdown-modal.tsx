"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

interface AttendanceEntry {
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
}

interface QuarterAccrual {
  quarter: string;
  startDate: string;
  hours: number;
  earned: boolean;
}

interface AccrualDetails {
  isEligible: boolean;
  eligibilityDate: string | null;
  accruedHours: number;
  maxHours: number;
  quartersEarned: number;
  quarterDetails: QuarterAccrual[];
  nextAccrualDate: string | null;
  message: string;
}

interface TimeAllocation {
  time_code: string;
  description: string;
  default_allocation: number | null;
  allocated_hours: number | null;
  is_override: boolean;
  is_accrual?: boolean;
  accrual_details?: AccrualDetails | null;
}

interface BalanceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeCode: string;
  title: string;
  entries: AttendanceEntry[];
  allocation: TimeAllocation | null;
}

export function BalanceBreakdownModal({
  isOpen,
  onClose,
  timeCode,
  title,
  entries,
  allocation,
}: BalanceBreakdownModalProps) {
  // Filter entries for this specific time code
  const relevantEntries = entries
    .filter(e => e.time_code === timeCode)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const totalUsed = relevantEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const allocatedHours = allocation?.allocated_hours ?? 0;
  const defaultAllocation = allocation?.default_allocation ?? 0;
  const isOverride = allocation?.is_override ?? false;
  const isAccrual = allocation?.is_accrual ?? false;
  const accrualDetails = allocation?.accrual_details;
  const remaining = Math.max(0, allocatedHours - totalUsed);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Group entries by month for better organization
  const entriesByMonth: Record<string, AttendanceEntry[]> = {};
  relevantEntries.forEach(entry => {
    const monthKey = entry.entry_date.substring(0, 7); // "YYYY-MM"
    if (!entriesByMonth[monthKey]) {
      entriesByMonth[monthKey] = [];
    }
    entriesByMonth[monthKey].push(entry);
  });

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, 'MMMM yyyy');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title} - Balance Breakdown</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Allocation Source */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">
              {isAccrual ? 'Accrual-Based Allocation' : 'Allocation'}
            </h3>
            <div className="space-y-1 text-sm">
              {isAccrual && accrualDetails ? (
                <>
                  {/* Eligibility Status */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eligibility:</span>
                    <span className={`font-medium ${accrualDetails.isEligible ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {accrualDetails.isEligible ? 'Eligible' : 'Not Yet Eligible'}
                    </span>
                  </div>
                  {accrualDetails.eligibilityDate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Eligible from:</span>
                      <span>{formatDate(accrualDetails.eligibilityDate)}</span>
                    </div>
                  )}
                  {/* Accrued Hours */}
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Accrued Hours:</span>
                    <span className="font-medium">{accrualDetails.accruedHours}h</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max per year:</span>
                    <span>{accrualDetails.maxHours}h</span>
                  </div>
                  {/* Quarters Earned */}
                  {accrualDetails.quartersEarned > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quarters Earned:</span>
                      <span className="font-medium">{accrualDetails.quartersEarned}</span>
                    </div>
                  )}
                  {/* Quarter Details */}
                  {accrualDetails.quarterDetails && accrualDetails.quarterDetails.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Quarter Breakdown:</div>
                      <div className="space-y-1">
                        {accrualDetails.quarterDetails.map((q, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className={q.earned ? '' : 'text-muted-foreground'}>
                              {q.quarter} ({formatDate(q.startDate)})
                            </span>
                            <span className={q.earned ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              {q.earned ? `+${q.hours}h` : 'Upcoming'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Next Accrual */}
                  {accrualDetails.nextAccrualDate && (
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t">
                      <span className="text-muted-foreground">Next accrual:</span>
                      <span>{formatDate(accrualDetails.nextAccrualDate)}</span>
                    </div>
                  )}
                </>
              ) : allocatedHours > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {isOverride ? 'Employee Override:' : 'Default Allocation:'}
                    </span>
                    <span className="font-medium">{allocatedHours}h</span>
                  </div>
                  {isOverride && defaultAllocation > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">(Default was {defaultAllocation}h)</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">No allocation limit</div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Used:</span>
                <span className="font-medium">{totalUsed}h</span>
              </div>
              {allocatedHours > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`font-medium ${remaining === 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {remaining}h
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${totalUsed > allocatedHours ? 'bg-destructive' : 'bg-primary'}`}
                      style={{
                        width: `${Math.min(100, (totalUsed / allocatedHours) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Usage Details */}
          <div className="border rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2">
              Usage Details ({relevantEntries.length} {relevantEntries.length === 1 ? 'entry' : 'entries'})
            </h3>

            {relevantEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No time entries recorded for this code.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(entriesByMonth).map(([monthKey, monthEntries]) => (
                  <div key={monthKey}>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {formatMonthLabel(monthKey)}
                    </div>
                    <div className="space-y-1">
                      {monthEntries.map((entry, idx) => (
                        <div
                          key={`${entry.entry_date}-${idx}`}
                          className="flex justify-between items-start text-sm py-1 border-b last:border-0"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {format(parseISO(entry.entry_date), 'MMM d')}
                            </span>
                            {entry.notes && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                - {entry.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-medium ml-2">{entry.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
