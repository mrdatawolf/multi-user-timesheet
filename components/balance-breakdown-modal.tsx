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

interface HoursWorkedAccrualDetails {
  totalHoursWorked: number;
  accrualRate: { earnHours: number; perHoursWorked: number };
  maxAccrual: number;
  maxUsage: { hours: number; days: number; rule: string };
  effectiveUsageLimit: number;
  accrualExclusions: string[];
  hoursCountedBy: {
    nonexempt: string[];
    exemptFullTime: { assumedWeeklyHours: number; condition: string };
    exemptPartTime: string;
  };
}

interface VacationTier {
  minBaseYears: number;
  maxBaseYears: number | null;
  fullTime: { weeks: number; hours: number };
  partTime: { earnHours: number; perHoursWorked: number; maxHours: number };
}

interface TieredSeniorityAccrualDetails {
  baseYears: number;
  currentTier: VacationTier;
  employeeType: 'fullTime' | 'partTime' | 'exempt';
  periodStart: string;
  periodEnd: string;
  hoursThreshold: number;
  estimatedHoursWorked?: number;
  isFullTimeQualified: boolean;
  notes?: {
    baseYearDefinition?: string;
    payoutRule?: string;
    terminationRule?: string;
  };
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
  accrualType?: 'quarterly' | 'hoursWorked' | 'tieredSeniority';
  hoursWorkedDetails?: HoursWorkedAccrualDetails;
  tieredSeniorityDetails?: TieredSeniorityAccrualDetails;
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
                accrualDetails.accrualType === 'tieredSeniority' && accrualDetails.tieredSeniorityDetails ? (
                  /* Tiered Seniority Accrual (Vacation) */
                  <>
                    {/* Eligibility Status */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eligibility:</span>
                      <span className={`font-medium ${accrualDetails.isEligible ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {accrualDetails.isEligible ? 'Eligible' : 'Not Yet Eligible'}
                      </span>
                    </div>

                    {/* Base Years & Employee Type */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Seniority & Status:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Base Years:</span>
                        <span className="font-medium">{accrualDetails.tieredSeniorityDetails.baseYears}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Employee Type:</span>
                        <span className="font-medium capitalize">{accrualDetails.tieredSeniorityDetails.employeeType === 'fullTime' ? 'Full-Time' : accrualDetails.tieredSeniorityDetails.employeeType === 'partTime' ? 'Part-Time' : 'Exempt'}</span>
                      </div>
                      {accrualDetails.tieredSeniorityDetails.employeeType !== 'exempt' && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hours Worked (Est.):</span>
                          <span>~{accrualDetails.tieredSeniorityDetails.estimatedHoursWorked}h</span>
                        </div>
                      )}
                      {accrualDetails.tieredSeniorityDetails.employeeType !== 'exempt' && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Full-Time Threshold:</span>
                          <span>{accrualDetails.tieredSeniorityDetails.hoursThreshold}h</span>
                        </div>
                      )}
                    </div>

                    {/* Benefit Period */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Vacation Base Year:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Period:</span>
                        <span>{formatDate(accrualDetails.tieredSeniorityDetails.periodStart)} - {formatDate(accrualDetails.tieredSeniorityDetails.periodEnd)}</span>
                      </div>
                    </div>

                    {/* Current Tier */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Your Vacation Tier:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Years Range:</span>
                        <span>{accrualDetails.tieredSeniorityDetails.currentTier.minBaseYears}{accrualDetails.tieredSeniorityDetails.currentTier.maxBaseYears !== null ? `-${accrualDetails.tieredSeniorityDetails.currentTier.maxBaseYears}` : '+'} years</span>
                      </div>
                      {accrualDetails.tieredSeniorityDetails.employeeType === 'fullTime' || accrualDetails.tieredSeniorityDetails.employeeType === 'exempt' ? (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Weeks Vacation:</span>
                            <span className="font-medium">{accrualDetails.tieredSeniorityDetails.currentTier.fullTime.weeks}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Hours:</span>
                            <span className="font-medium">{accrualDetails.tieredSeniorityDetails.currentTier.fullTime.hours}h</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Earn Rate:</span>
                            <span>{accrualDetails.tieredSeniorityDetails.currentTier.partTime.earnHours}h per {accrualDetails.tieredSeniorityDetails.currentTier.partTime.perHoursWorked}h worked</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Max Hours:</span>
                            <span className="font-medium">{accrualDetails.tieredSeniorityDetails.currentTier.partTime.maxHours}h</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Accrued Hours */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accrued Hours:</span>
                        <span className="font-medium">{accrualDetails.accruedHours}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Max for tier:</span>
                        <span>{accrualDetails.maxHours}h</span>
                      </div>
                    </div>

                    {/* Policy Notes */}
                    {accrualDetails.tieredSeniorityDetails.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Policy Notes:</div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {accrualDetails.tieredSeniorityDetails.notes.baseYearDefinition && (
                            <div>{accrualDetails.tieredSeniorityDetails.notes.baseYearDefinition}</div>
                          )}
                          {accrualDetails.tieredSeniorityDetails.notes.payoutRule && (
                            <div>{accrualDetails.tieredSeniorityDetails.notes.payoutRule}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : accrualDetails.accrualType === 'hoursWorked' && accrualDetails.hoursWorkedDetails ? (
                  /* Hours-Worked Accrual (PSL) */
                  <>
                    {/* Eligibility Status */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eligibility:</span>
                      <span className={`font-medium ${accrualDetails.isEligible ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {accrualDetails.isEligible ? 'Eligible' : 'Not Yet Eligible'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Starts:</span>
                      <span>First day of employment</span>
                    </div>

                    {/* Accrual Rate */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">How You Earn Hours:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Accrual Rate:</span>
                        <span>{accrualDetails.hoursWorkedDetails.accrualRate.earnHours}h per {accrualDetails.hoursWorkedDetails.accrualRate.perHoursWorked}h worked</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Est. Hours Worked:</span>
                        <span>~{accrualDetails.hoursWorkedDetails.totalHoursWorked}h</span>
                      </div>
                    </div>

                    {/* Accrued Hours */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accrued Hours:</span>
                        <span className="font-medium">{accrualDetails.accruedHours}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Max accrual (12-month):</span>
                        <span>{accrualDetails.hoursWorkedDetails.maxAccrual}h</span>
                      </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Usage Limits (per 12-month):</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Max usage:</span>
                        <span>{accrualDetails.hoursWorkedDetails.maxUsage.days} days or {accrualDetails.hoursWorkedDetails.maxUsage.hours}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Rule:</span>
                        <span>{accrualDetails.hoursWorkedDetails.maxUsage.rule === 'whicheverGreater' ? 'Whichever is greater' : 'Fixed'}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Effective limit:</span>
                        <span className="font-medium">{accrualDetails.hoursWorkedDetails.effectiveUsageLimit}h</span>
                      </div>
                    </div>

                    {/* Accrual Exclusions */}
                    {accrualDetails.hoursWorkedDetails.accrualExclusions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-1">No Accrual During:</div>
                        <div className="text-xs text-muted-foreground">
                          {accrualDetails.hoursWorkedDetails.accrualExclusions.map(ex =>
                            ex === 'paidLeave' ? 'Paid Leave' : ex === 'unpaidLeave' ? 'Unpaid Leave' : ex
                          ).join(', ')}
                        </div>
                      </div>
                    )}

                    {/* Hours Counted By */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Hours Counted:</div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Non-exempt:</span>
                          <span>{accrualDetails.hoursWorkedDetails.hoursCountedBy.nonexempt.map(t =>
                            t === 'straightTime' ? 'Straight time' : t === 'overtime' ? 'Overtime' : t
                          ).join(' + ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exempt (FT):</span>
                          <span>{accrualDetails.hoursWorkedDetails.hoursCountedBy.exemptFullTime.assumedWeeklyHours}h/week assumed</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exempt (PT):</span>
                          <span>Regular schedule</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Quarterly Accrual (FH) */
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
                )
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
