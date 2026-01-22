"use client";

import { useState, useEffect } from 'react';
import { BalanceBreakdownModal } from './balance-breakdown-modal';
import { getBrandFeatures, type LeaveTypeConfig } from '@/lib/brand-features';

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

interface LeaveTypes {
  vacation?: LeaveTypeConfig;
  sickLeave?: LeaveTypeConfig;
  floatingHoliday?: LeaveTypeConfig;
  paidHoliday?: LeaveTypeConfig;
}

// Default leave types for backwards compatibility
const DEFAULT_LEAVE_TYPES: LeaveTypes = {
  vacation: { enabled: true, timeCode: 'V', label: 'Vacation' },
  sickLeave: { enabled: true, timeCode: 'PS', label: 'Personal Sick Day' },
  floatingHoliday: { enabled: true, timeCode: 'FH', label: 'Floating Holiday' },
  paidHoliday: { enabled: true, timeCode: 'H', label: 'Holiday' }
};

export function BalanceCards({ entries, allocations }: BalanceCardsProps) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    timeCode: '',
    title: '',
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypes>(DEFAULT_LEAVE_TYPES);
  const [leaveManagementEnabled, setLeaveManagementEnabled] = useState(true);

  // Load brand features to get time code mappings
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const features = await getBrandFeatures();

        if (features?.features?.leaveManagement) {
          setLeaveManagementEnabled(features.features.leaveManagement.enabled);
          const loadedLeaveTypes = features.features.leaveManagement.leaveTypes as LeaveTypes | undefined;
          if (loadedLeaveTypes) {
            setLeaveTypes(loadedLeaveTypes);
          }
        }
      } catch (error) {
        console.error('Failed to load brand features:', error);
      }
    };

    loadFeatures();
  }, []);

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

  const getSelectedAllocation = () => {
    return allocations.find(a => a.time_code === modalState.timeCode) || null;
  };

  // Don't render if leave management is disabled
  if (!leaveManagementEnabled) {
    return null;
  }

  // Helper to render a balance card with usage tracking (shows remaining)
  const renderBalanceCard = (config: LeaveTypeConfig | undefined, key: string, defaultLabel: string) => {
    if (!config?.enabled || !config.timeCode) return null;

    const timeCode = config.timeCode;
    const label = config.label || defaultLabel;
    const used = calculateUsage(timeCode);
    const limit = getAllocatedHours(timeCode);
    const remaining = Math.max(0, limit - used);

    return (
      <div
        key={key}
        className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => openModal(timeCode, label)}
        title="Click to see breakdown"
      >
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          {label}
        </div>
        <div className="text-lg font-bold">
          {remaining}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {used}h used / {limit}h total
        </div>
        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${limit > 0 ? (used / limit) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    );
  };

  // Helper to render a usage-only card (no allocation tracking)
  const renderUsageCard = (config: LeaveTypeConfig | undefined, key: string, defaultLabel: string, subtitle: string) => {
    if (!config?.enabled || !config.timeCode) return null;

    const timeCode = config.timeCode;
    const label = config.label || defaultLabel;
    const used = calculateUsage(timeCode);

    return (
      <div
        key={key}
        className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => openModal(timeCode, label)}
        title="Click to see breakdown"
      >
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          {label} Used
        </div>
        <div className="text-lg font-bold">
          {used}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {subtitle}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {renderBalanceCard(leaveTypes.floatingHoliday, 'floatingHoliday', 'Floating Holiday')}
        {renderBalanceCard(leaveTypes.sickLeave, 'sickLeave', 'Paid Sick Leave')}
        {renderUsageCard(leaveTypes.vacation, 'vacation', 'Vacation', 'Total vacation hours this year')}
        {renderUsageCard(leaveTypes.paidHoliday, 'paidHoliday', 'Holiday', 'Total holiday hours this year')}
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
