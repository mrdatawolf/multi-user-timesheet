"use client";

import { useState } from 'react';
import { BalanceBreakdownModal } from './balance-breakdown-modal';

interface AttendanceEntry {
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
}

interface AccrualDetails {
  isEligible: boolean;
  eligibilityDate: string | null;
  accruedHours: number;
  maxHours: number;
  quartersEarned: number;
  quarterDetails: Array<{
    quarter: string;
    startDate: string;
    hours: number;
    earned: boolean;
  }>;
  nextAccrualDate: string | null;
  message: string;
  accrualType?: 'quarterly' | 'hoursWorked' | 'tieredSeniority';
  hoursWorkedDetails?: {
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
  };
  tieredSeniorityDetails?: {
    baseYears: number;
    currentTier: {
      minBaseYears: number;
      maxBaseYears: number | null;
      fullTime: { weeks: number; hours: number };
      partTime: { earnHours: number; perHoursWorked: number; maxHours: number };
    };
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
  };
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

interface BalanceCardsProps {
  entries: AttendanceEntry[];
  allocations: TimeAllocation[];
}

interface ModalState {
  isOpen: boolean;
  timeCode: string;
  title: string;
}

export function BalanceCards({ entries, allocations }: BalanceCardsProps) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    timeCode: '',
    title: '',
  });

  const openModal = (timeCode: string, title: string) => {
    setModalState({ isOpen: true, timeCode, title });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, timeCode: '', title: '' });
  };
  const calculateUsage = (code: string): number => {
    const total = entries
      .filter(e => e.time_code === code)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
    return total;
  };

  const getAllocatedHours = (code: string): number => {
    const allocation = allocations.find(a => a.time_code === code);
    const hours = allocation?.allocated_hours ?? 0;
    return hours;
  };

  const floatingHolidayUsed = calculateUsage('FH');
  const floatingHolidayLimit = getAllocatedHours('FH');
  const floatingHolidayRemaining = Math.max(0, floatingHolidayLimit - floatingHolidayUsed);

  const personalSickUsed = calculateUsage('PS');
  const personalSickLimit = getAllocatedHours('PS');
  const personalSickRemaining = Math.max(0, personalSickLimit - personalSickUsed);

  const vacationUsed = calculateUsage('V');
  const holidayUsed = calculateUsage('H');

  const getSelectedAllocation = () => {
    return allocations.find(a => a.time_code === modalState.timeCode) || null;
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <div
          className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => openModal('FH', 'Floating Holiday')}
          title="Click to see breakdown"
        >
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Floating Holiday
          </div>
          <div className="text-lg font-bold">
            {floatingHolidayRemaining}h
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {floatingHolidayUsed}h used / {floatingHolidayLimit}h total
          </div>
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${floatingHolidayLimit > 0 ? (floatingHolidayUsed / floatingHolidayLimit) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div
          className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => openModal('PS', 'Personal Sick Day')}
          title="Click to see breakdown"
        >
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Personal Sick Day
          </div>
          <div className="text-lg font-bold">
            {personalSickRemaining}h
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {personalSickUsed}h used / {personalSickLimit}h total
          </div>
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${personalSickLimit > 0 ? (personalSickUsed / personalSickLimit) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div
          className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => openModal('V', 'Vacation')}
          title="Click to see breakdown"
        >
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Vacation Days Used
          </div>
          <div className="text-lg font-bold">
            {vacationUsed}h
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Total vacation hours this year
          </div>
        </div>

        <div
          className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => openModal('H', 'Holiday')}
          title="Click to see breakdown"
        >
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Holidays Used
          </div>
          <div className="text-lg font-bold">
            {holidayUsed}h
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Total holiday hours this year
          </div>
        </div>
      </div>

      <BalanceBreakdownModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        timeCode={modalState.timeCode}
        title={modalState.title}
        entries={entries}
        allocation={getSelectedAllocation()}
      />
    </>
  );
}
