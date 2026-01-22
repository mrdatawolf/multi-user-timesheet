/**
 * Accrual Calculations Utility
 *
 * Calculates time-off accruals based on brand-specific rules.
 * Currently supports quarterly accrual with eligibility wait periods.
 */

export interface QuarterDefinition {
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
}

// Tiered seniority vacation types
export interface VacationTier {
  minBaseYears: number;
  maxBaseYears: number | null;
  fullTime: { weeks: number; hours: number };
  partTime: { earnHours: number; perHoursWorked: number; maxHours: number };
}

export interface TieredSeniorityRule {
  type: 'tieredSeniority';
  period: {
    type: 'custom' | 'calendarYear';
    startMonth?: number;
    startDay?: number;
    endMonth?: number;
    endDay?: number;
  };
  eligibility: {
    fullTime: {
      hoursThreshold: number;
      includesHolidayPay?: boolean;
      includesJuryDuty?: boolean;
      includesFuneralLeave?: boolean;
    };
    exempt: {
      waitPeriod: { months?: number; years?: number; days?: number };
      expectedUsage: number;
    };
  };
  tiers: VacationTier[];
  notes?: {
    baseYearDefinition?: string;
    payoutRule?: string;
    terminationRule?: string;
  };
}

export interface AccrualRule {
  type: 'quarterly' | 'monthly' | 'annual' | 'hoursWorked' | 'tieredSeniority';
  hoursPerPeriod?: number;
  maxAnnual?: number;
  maxAccrual?: number;  // For hoursWorked type
  maxUsage?: {          // For hoursWorked type
    hours: number;
    days: number;
    rule: 'whicheverGreater' | 'whicheverLesser' | 'fixed';
  };
  period?: '12month' | 'calendarYear' | { type: string; startMonth?: number; startDay?: number; endMonth?: number; endDay?: number };
  accrualRate?: {       // For hoursWorked type
    earnHours: number;
    perHoursWorked: number;
  };
  eligibility?: {
    waitPeriod?: {
      years?: number;
      months?: number;
      days?: number;
    };
    fullTime?: {
      hoursThreshold?: number;
      includesHolidayPay?: boolean;
      includesJuryDuty?: boolean;
      includesFuneralLeave?: boolean;
    };
    exempt?: {
      waitPeriod?: { months?: number; years?: number; days?: number };
      expectedUsage?: number;
    };
  };
  accrualExclusions?: string[];  // e.g., ["paidLeave", "unpaidLeave"]
  hoursCountedBy?: {
    nonexempt: string[];
    exemptFullTime: { assumedWeeklyHours: number; condition: string };
    exemptPartTime: string;
  };
  quarters?: {
    Q1: QuarterDefinition;
    Q2: QuarterDefinition;
    Q3: QuarterDefinition;
    Q4: QuarterDefinition;
  };
  // For tieredSeniority type
  tiers?: VacationTier[];
  notes?: {
    baseYearDefinition?: string;
    payoutRule?: string;
    terminationRule?: string;
  };
}

export interface HoursWorkedAccrualDetails {
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

export interface TieredSeniorityAccrualDetails {
  baseYears: number;
  currentTier: VacationTier;
  employeeType: 'fullTime' | 'partTime' | 'exempt';
  periodStart: Date;
  periodEnd: Date;
  hoursThreshold: number;
  estimatedHoursWorked?: number;
  isFullTimeQualified: boolean;
  notes?: {
    baseYearDefinition?: string;
    payoutRule?: string;
    terminationRule?: string;
  };
}

export interface AccrualResult {
  isEligible: boolean;
  eligibilityDate: Date | null;
  accruedHours: number;
  maxHours: number;
  quartersEarned: number;
  quarterDetails: QuarterAccrual[];
  nextAccrualDate: Date | null;
  message: string;
  // Type-specific fields
  accrualType?: 'quarterly' | 'hoursWorked' | 'tieredSeniority';
  hoursWorkedDetails?: HoursWorkedAccrualDetails;
  tieredSeniorityDetails?: TieredSeniorityAccrualDetails;
}

export interface QuarterAccrual {
  quarter: string;
  startDate: Date;
  hours: number;
  earned: boolean;
}

/**
 * Calculate the eligibility date based on hire date and wait period
 */
export function calculateEligibilityDate(
  hireDate: Date,
  waitPeriod: { years?: number; months?: number; days?: number }
): Date {
  const eligibilityDate = new Date(hireDate);

  if (waitPeriod.years) {
    eligibilityDate.setFullYear(eligibilityDate.getFullYear() + waitPeriod.years);
  }
  if (waitPeriod.months) {
    eligibilityDate.setMonth(eligibilityDate.getMonth() + waitPeriod.months);
  }
  if (waitPeriod.days) {
    eligibilityDate.setDate(eligibilityDate.getDate() + waitPeriod.days);
  }

  return eligibilityDate;
}

/**
 * Get all quarter start dates for a given year based on quarter definitions
 */
export function getQuarterStartDates(
  year: number,
  quarters: AccrualRule['quarters']
): { quarter: string; startDate: Date }[] {
  if (!quarters) return [];

  const results: { quarter: string; startDate: Date }[] = [];

  // Q1: Mar 1 - May 31
  results.push({
    quarter: 'Q1',
    startDate: new Date(year, quarters.Q1.startMonth - 1, quarters.Q1.startDay)
  });

  // Q2: Jun 1 - Aug 31
  results.push({
    quarter: 'Q2',
    startDate: new Date(year, quarters.Q2.startMonth - 1, quarters.Q2.startDay)
  });

  // Q3: Sep 1 - Nov 30
  results.push({
    quarter: 'Q3',
    startDate: new Date(year, quarters.Q3.startMonth - 1, quarters.Q3.startDay)
  });

  // Q4: Dec 1 - Feb 28/29 (spans year boundary)
  results.push({
    quarter: 'Q4',
    startDate: new Date(year, quarters.Q4.startMonth - 1, quarters.Q4.startDay)
  });

  return results;
}

/**
 * Calculate quarterly accrual for a specific year
 */
export function calculateQuarterlyAccrual(
  hireDate: Date,
  targetYear: number,
  asOfDate: Date,
  rule: AccrualRule
): AccrualResult {
  const waitPeriod = rule.eligibility?.waitPeriod || {};
  const eligibilityDate = calculateEligibilityDate(hireDate, waitPeriod);
  const isEligible = asOfDate >= eligibilityDate;

  const maxAnnual = rule.maxAnnual || 0;
  const hoursPerPeriod = rule.hoursPerPeriod || 0;

  if (!isEligible) {
    return {
      isEligible: false,
      eligibilityDate,
      accruedHours: 0,
      maxHours: maxAnnual,
      quartersEarned: 0,
      quarterDetails: [],
      nextAccrualDate: eligibilityDate,
      message: `Not yet eligible. Eligibility begins ${eligibilityDate.toLocaleDateString()}.`
    };
  }

  if (!rule.quarters) {
    return {
      isEligible: true,
      eligibilityDate,
      accruedHours: 0,
      maxHours: maxAnnual,
      quartersEarned: 0,
      quarterDetails: [],
      nextAccrualDate: null,
      message: 'No quarter definitions found.'
    };
  }

  // Get quarter start dates for the target year and previous year (for Q4 spanning)
  const quarterDates: { quarter: string; startDate: Date }[] = [];

  // Add Q4 from previous year (Dec of prev year)
  const prevYearQ4 = new Date(targetYear - 1, rule.quarters.Q4.startMonth - 1, rule.quarters.Q4.startDay);
  quarterDates.push({ quarter: 'Q4 (prev)', startDate: prevYearQ4 });

  // Add all quarters for target year
  quarterDates.push(...getQuarterStartDates(targetYear, rule.quarters));

  // Filter to quarters that:
  // 1. Have started (startDate <= asOfDate)
  // 2. Started after eligibility date
  // 3. Fall within the target year's benefit period
  const quarterDetails: QuarterAccrual[] = [];
  let quartersEarned = 0;
  let nextAccrualDate: Date | null = null;

  // Define the benefit year range (Mar 1 of target year to Feb 28/29 of next year)
  const benefitYearStart = new Date(targetYear, rule.quarters.Q1.startMonth - 1, rule.quarters.Q1.startDay);
  const benefitYearEnd = new Date(targetYear + 1, rule.quarters.Q4.endMonth - 1, rule.quarters.Q4.endDay);

  // Check each quarter
  for (const { quarter, startDate } of quarterDates) {
    // Skip Q4 from previous year if it's before the benefit year
    if (quarter === 'Q4 (prev)' && startDate < new Date(targetYear - 1, 11, 1)) {
      continue;
    }

    // For target year calculation, we want quarters that fall within our fiscal year
    // Fiscal year runs Mar 1 to Feb 28/29
    const isInBenefitYear = startDate >= benefitYearStart ||
      (quarter === 'Q4' && startDate.getMonth() === 11); // Dec of target year

    if (!isInBenefitYear && quarter !== 'Q4 (prev)') {
      continue;
    }

    const earned = startDate <= asOfDate && startDate >= eligibilityDate;

    if (earned && quartersEarned < Math.floor(maxAnnual / hoursPerPeriod)) {
      quartersEarned++;
      quarterDetails.push({
        quarter: quarter.replace(' (prev)', ''),
        startDate,
        hours: hoursPerPeriod,
        earned: true
      });
    } else if (!earned && startDate > asOfDate && !nextAccrualDate) {
      nextAccrualDate = startDate;
      quarterDetails.push({
        quarter: quarter.replace(' (prev)', ''),
        startDate,
        hours: hoursPerPeriod,
        earned: false
      });
    }
  }

  const accruedHours = Math.min(quartersEarned * hoursPerPeriod, maxAnnual);

  return {
    isEligible: true,
    eligibilityDate,
    accruedHours,
    maxHours: maxAnnual,
    quartersEarned,
    quarterDetails,
    nextAccrualDate,
    message: quartersEarned > 0
      ? `${quartersEarned} quarter(s) earned = ${accruedHours} hours`
      : 'Eligible but no quarters earned yet this year.',
    accrualType: 'quarterly'
  };
}

/**
 * Calculate hours-worked based accrual (e.g., PSL - Personal Sick Leave)
 *
 * This accrual type earns hours based on hours worked:
 * - 1 hour earned per X hours worked (e.g., 1 per 30)
 * - Max accrual cap per period (e.g., 80 hours)
 * - Max usage per period (e.g., 40 hours or 5 days, whichever greater)
 * - No accrual during paid/unpaid leave
 *
 * Since we don't have actual hours worked tracked in this system,
 * we estimate based on employee type (exempt vs non-exempt).
 */
export function calculateHoursWorkedAccrual(
  hireDate: Date,
  targetYear: number,
  asOfDate: Date,
  rule: AccrualRule,
  totalHoursWorked?: number // Optional - if provided, use actual hours; otherwise estimate
): AccrualResult {
  const waitPeriod = rule.eligibility?.waitPeriod || {};
  const eligibilityDate = calculateEligibilityDate(hireDate, waitPeriod);
  const isEligible = asOfDate >= eligibilityDate;

  const maxAccrual = rule.maxAccrual || 80;
  const maxUsage = rule.maxUsage || { hours: 40, days: 5, rule: 'whicheverGreater' };
  const accrualRate = rule.accrualRate || { earnHours: 1, perHoursWorked: 30 };

  // Calculate effective usage limit based on rule
  // "5 days or 40 hours, whichever is greater" - assuming 8-hour days
  const daysAsHours = maxUsage.days * 8;
  let effectiveUsageLimit: number;
  switch (maxUsage.rule) {
    case 'whicheverGreater':
      effectiveUsageLimit = Math.max(maxUsage.hours, daysAsHours);
      break;
    case 'whicheverLesser':
      effectiveUsageLimit = Math.min(maxUsage.hours, daysAsHours);
      break;
    default:
      effectiveUsageLimit = maxUsage.hours;
  }

  if (!isEligible) {
    return {
      isEligible: false,
      eligibilityDate,
      accruedHours: 0,
      maxHours: effectiveUsageLimit,
      quartersEarned: 0,
      quarterDetails: [],
      nextAccrualDate: eligibilityDate,
      message: `Eligible from first day of employment.`,
      accrualType: 'hoursWorked',
      hoursWorkedDetails: {
        totalHoursWorked: 0,
        accrualRate,
        maxAccrual,
        maxUsage,
        effectiveUsageLimit,
        accrualExclusions: rule.accrualExclusions || [],
        hoursCountedBy: rule.hoursCountedBy || {
          nonexempt: ['straightTime', 'overtime'],
          exemptFullTime: { assumedWeeklyHours: 40, condition: 'anyWorkPerformed' },
          exemptPartTime: 'regularSchedule'
        }
      }
    };
  }

  // Calculate hours worked since eligibility or start of year (whichever is later)
  // For 12-month period, use hire date anniversary; for calendar year, use Jan 1
  let periodStart: Date;
  if (rule.period === 'calendarYear') {
    periodStart = new Date(targetYear, 0, 1);
  } else {
    // 12-month period based on hire date
    const hireAnniversary = new Date(targetYear, hireDate.getMonth(), hireDate.getDate());
    if (hireAnniversary > asOfDate) {
      // Use previous year's anniversary
      hireAnniversary.setFullYear(targetYear - 1);
    }
    periodStart = hireAnniversary;
  }

  // If employee not yet eligible at period start, use eligibility date
  if (periodStart < eligibilityDate) {
    periodStart = eligibilityDate;
  }

  // Estimate hours worked if not provided
  // Assume full-time exempt: 40 hours/week
  let estimatedHoursWorked: number;
  if (totalHoursWorked !== undefined) {
    estimatedHoursWorked = totalHoursWorked;
  } else {
    // Calculate weeks between period start and as-of date
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSincePeriodStart = Math.max(0, (asOfDate.getTime() - periodStart.getTime()) / msPerWeek);
    // Assume 40 hours per week (full-time exempt default)
    estimatedHoursWorked = Math.floor(weeksSincePeriodStart * 40);
  }

  // Calculate accrued hours: (hoursWorked / perHoursWorked) * earnHours
  const rawAccrued = Math.floor(estimatedHoursWorked / accrualRate.perHoursWorked) * accrualRate.earnHours;
  const accruedHours = Math.min(rawAccrued, maxAccrual);

  return {
    isEligible: true,
    eligibilityDate,
    accruedHours,
    maxHours: effectiveUsageLimit,
    quartersEarned: 0,
    quarterDetails: [],
    nextAccrualDate: null,
    message: `Accruing ${accrualRate.earnHours}h per ${accrualRate.perHoursWorked}h worked. ${accruedHours}h accrued based on ~${estimatedHoursWorked}h worked.`,
    accrualType: 'hoursWorked',
    hoursWorkedDetails: {
      totalHoursWorked: estimatedHoursWorked,
      accrualRate,
      maxAccrual,
      maxUsage,
      effectiveUsageLimit,
      accrualExclusions: rule.accrualExclusions || [],
      hoursCountedBy: rule.hoursCountedBy || {
        nonexempt: ['straightTime', 'overtime'],
        exemptFullTime: { assumedWeeklyHours: 40, condition: 'anyWorkPerformed' },
        exemptPartTime: 'regularSchedule'
      }
    }
  };
}

/**
 * Calculate tiered seniority-based accrual (e.g., Vacation)
 *
 * This accrual type provides different vacation amounts based on:
 * - Years of service (base years)
 * - Full-time vs part-time status (1,200 hours threshold)
 * - Custom benefit year (June 1 - May 31)
 */
export function calculateTieredSeniorityAccrual(
  hireDate: Date,
  targetYear: number,
  asOfDate: Date,
  rule: AccrualRule,
  totalHoursWorked?: number,
  isExempt: boolean = false
): AccrualResult {
  // Get period configuration
  const periodConfig = typeof rule.period === 'object' ? rule.period : null;
  const periodStartMonth = periodConfig?.startMonth || 6; // Default June
  const periodStartDay = periodConfig?.startDay || 1;
  const periodEndMonth = periodConfig?.endMonth || 5; // Default May
  const periodEndDay = periodConfig?.endDay || 31;

  // Calculate period start and end for the target year
  // If we're before the period start in targetYear, use previous year's period
  let periodStart = new Date(targetYear, periodStartMonth - 1, periodStartDay);
  let periodEnd = new Date(targetYear + 1, periodEndMonth - 1, periodEndDay);

  // If as-of date is before this year's period start, use previous period
  if (asOfDate < periodStart) {
    periodStart = new Date(targetYear - 1, periodStartMonth - 1, periodStartDay);
    periodEnd = new Date(targetYear, periodEndMonth - 1, periodEndDay);
  }

  // Calculate base years (years of service as of period start)
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const baseYears = Math.floor((periodStart.getTime() - hireDate.getTime()) / msPerYear);

  // Determine eligibility
  let isEligible = true;
  let eligibilityDate: Date | null = null;

  if (isExempt && rule.eligibility?.exempt?.waitPeriod) {
    // Exempt employees have a wait period (e.g., 6 months)
    eligibilityDate = calculateEligibilityDate(hireDate, rule.eligibility.exempt.waitPeriod);
    isEligible = asOfDate >= eligibilityDate;
  } else {
    // Non-exempt employees are eligible from hire date but need to accrue hours
    eligibilityDate = hireDate;
    isEligible = true;
  }

  // Find the appropriate tier based on base years
  const tiers = rule.tiers || [];
  let currentTier = tiers[0];
  for (const tier of tiers) {
    if (baseYears >= tier.minBaseYears &&
        (tier.maxBaseYears === null || baseYears <= tier.maxBaseYears)) {
      currentTier = tier;
      break;
    }
  }

  if (!currentTier) {
    return {
      isEligible: false,
      eligibilityDate,
      accruedHours: 0,
      maxHours: 0,
      quartersEarned: 0,
      quarterDetails: [],
      nextAccrualDate: null,
      message: 'No applicable vacation tier found.',
      accrualType: 'tieredSeniority'
    };
  }

  // Estimate hours worked if not provided
  const hoursThreshold = rule.eligibility?.fullTime?.hoursThreshold || 1200;
  let estimatedHoursWorked: number;
  if (totalHoursWorked !== undefined) {
    estimatedHoursWorked = totalHoursWorked;
  } else {
    // Estimate based on time since period start (assume 40h/week)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSincePeriodStart = Math.max(0, (asOfDate.getTime() - periodStart.getTime()) / msPerWeek);
    estimatedHoursWorked = Math.floor(weeksSincePeriodStart * 40);
  }

  // Determine if full-time qualified (1,200+ hours)
  const isFullTimeQualified = estimatedHoursWorked >= hoursThreshold;

  // Determine employee type
  let employeeType: 'fullTime' | 'partTime' | 'exempt';
  if (isExempt) {
    employeeType = 'exempt';
  } else if (isFullTimeQualified) {
    employeeType = 'fullTime';
  } else {
    employeeType = 'partTime';
  }

  // Calculate accrued hours based on employee type
  let accruedHours: number;
  let maxHours: number;

  if (employeeType === 'exempt' || employeeType === 'fullTime') {
    // Full-time or exempt: get full allocation
    accruedHours = currentTier.fullTime.hours;
    maxHours = currentTier.fullTime.hours;
  } else {
    // Part-time: earn hours based on hours worked
    const earnRate = currentTier.partTime.earnHours;
    const perHoursWorked = currentTier.partTime.perHoursWorked;
    const tierMax = currentTier.partTime.maxHours;

    const rawAccrued = Math.floor(estimatedHoursWorked / perHoursWorked) * earnRate;
    accruedHours = Math.min(rawAccrued, tierMax);
    maxHours = tierMax;
  }

  // Build message
  let message: string;
  if (employeeType === 'fullTime') {
    message = `Full-time (${hoursThreshold}+ hours): ${currentTier.fullTime.weeks} week(s) = ${accruedHours}h vacation`;
  } else if (employeeType === 'exempt') {
    message = `Exempt employee: ${currentTier.fullTime.weeks} week(s) = ${accruedHours}h vacation`;
  } else {
    message = `Part-time: ${currentTier.partTime.earnHours}h per ${currentTier.partTime.perHoursWorked}h worked, up to ${maxHours}h. Currently ${accruedHours}h accrued.`;
  }

  return {
    isEligible,
    eligibilityDate,
    accruedHours,
    maxHours,
    quartersEarned: 0,
    quarterDetails: [],
    nextAccrualDate: null,
    message,
    accrualType: 'tieredSeniority',
    tieredSeniorityDetails: {
      baseYears: Math.max(0, baseYears),
      currentTier,
      employeeType,
      periodStart,
      periodEnd,
      hoursThreshold,
      estimatedHoursWorked,
      isFullTimeQualified,
      notes: rule.notes
    }
  };
}

/**
 * Main function to calculate accrual based on rule type
 */
export function calculateAccrual(
  hireDate: Date | string,
  targetYear: number,
  asOfDate: Date | string,
  rule: AccrualRule
): AccrualResult {
  const hireDateObj = typeof hireDate === 'string' ? new Date(hireDate) : hireDate;
  const asOfDateObj = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

  switch (rule.type) {
    case 'quarterly':
      return calculateQuarterlyAccrual(hireDateObj, targetYear, asOfDateObj, rule);
    case 'hoursWorked':
      return calculateHoursWorkedAccrual(hireDateObj, targetYear, asOfDateObj, rule);
    case 'tieredSeniority':
      return calculateTieredSeniorityAccrual(hireDateObj, targetYear, asOfDateObj, rule);
    default:
      return {
        isEligible: false,
        eligibilityDate: null,
        accruedHours: 0,
        maxHours: rule.maxAnnual || 0,
        quartersEarned: 0,
        quarterDetails: [],
        nextAccrualDate: null,
        message: `Unsupported accrual type: ${rule.type}`
      };
  }
}

/**
 * Load brand features and check for accrual rules
 * Returns a record of time code -> accrual rule mappings
 */
export async function loadAccrualRules(brandId: string): Promise<Record<string, AccrualRule> | null> {
  try {
    const response = await fetch(`/${brandId}/brand-features.json`);
    if (!response.ok) return null;

    const features = await response.json();
    if (features?.features?.accrualCalculations?.enabled && features?.features?.accrualCalculations?.rules) {
      return features.features.accrualCalculations.rules;
    }
    return null;
  } catch {
    return null;
  }
}
