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

export interface AccrualRule {
  type: 'quarterly' | 'monthly' | 'annual';
  hoursPerPeriod: number;
  maxAnnual: number;
  eligibility: {
    waitPeriod: {
      years?: number;
      months?: number;
      days?: number;
    };
  };
  quarters?: {
    Q1: QuarterDefinition;
    Q2: QuarterDefinition;
    Q3: QuarterDefinition;
    Q4: QuarterDefinition;
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
  const eligibilityDate = calculateEligibilityDate(hireDate, rule.eligibility.waitPeriod);
  const isEligible = asOfDate >= eligibilityDate;

  if (!isEligible) {
    return {
      isEligible: false,
      eligibilityDate,
      accruedHours: 0,
      maxHours: rule.maxAnnual,
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
      maxHours: rule.maxAnnual,
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

    if (earned && quartersEarned < Math.floor(rule.maxAnnual / rule.hoursPerPeriod)) {
      quartersEarned++;
      quarterDetails.push({
        quarter: quarter.replace(' (prev)', ''),
        startDate,
        hours: rule.hoursPerPeriod,
        earned: true
      });
    } else if (!earned && startDate > asOfDate && !nextAccrualDate) {
      nextAccrualDate = startDate;
      quarterDetails.push({
        quarter: quarter.replace(' (prev)', ''),
        startDate,
        hours: rule.hoursPerPeriod,
        earned: false
      });
    }
  }

  const accruedHours = Math.min(quartersEarned * rule.hoursPerPeriod, rule.maxAnnual);

  return {
    isEligible: true,
    eligibilityDate,
    accruedHours,
    maxHours: rule.maxAnnual,
    quartersEarned,
    quarterDetails,
    nextAccrualDate,
    message: quartersEarned > 0
      ? `${quartersEarned} quarter(s) earned = ${accruedHours} hours`
      : 'Eligible but no quarters earned yet this year.'
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
    default:
      return {
        isEligible: false,
        eligibilityDate: null,
        accruedHours: 0,
        maxHours: rule.maxAnnual,
        quartersEarned: 0,
        quarterDetails: [],
        nextAccrualDate: null,
        message: `Unsupported accrual type: ${rule.type}`
      };
  }
}

/**
 * Load brand features and check for accrual rules
 */
export async function loadAccrualRules(brandId: string): Promise<{ FH?: AccrualRule } | null> {
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
