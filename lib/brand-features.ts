/**
 * Brand Features Configuration System
 *
 * This module manages brand-specific feature flags for the application.
 * Each brand can have different features enabled based on their needs.
 *
 * Feature configuration is loaded from public/<brand>/brand-features.json
 */

import { getCurrentBrandId } from './brand-config';

// Leave type configuration
export interface LeaveTypeConfig {
  enabled: boolean;
  timeCode?: string;  // Maps to actual time code in database (e.g., "FLH", "PSL", "V")
  label?: string;     // Display label for UI (e.g., "Floating Holiday", "Paid Sick Leave")
}

// Company holiday configuration
export interface CompanyHoliday {
  date: string;  // Format: YYYY-MM-DD
  name: string;
}

export interface CompanyHolidaysConfig {
  enabled: boolean;
  year?: number;
  dates?: CompanyHoliday[];
}

// Reports configuration
export interface LeaveBalanceSummaryConfig {
  enabled: boolean;
  warningThreshold?: number;   // Default 0.9 (90%)
  criticalThreshold?: number;  // Default 1.0 (100%)
}

export interface ReportsConfig {
  leaveBalanceSummary?: LeaveBalanceSummaryConfig;
}

// Color customization configuration
export interface ColorCustomizationConfig {
  enabled: boolean;
  allowTimeCodeColors?: boolean;  // Allow customizing time code colors
  allowStatusColors?: boolean;    // Allow customizing status (warning/critical) colors
}

// Status colors configuration
export interface StatusColorsConfig {
  warning?: string;   // Semantic color name (e.g., 'amber')
  critical?: string;  // Semantic color name (e.g., 'red')
  normal?: string;    // Semantic color name (e.g., 'gray')
}

// Brand features configuration structure
export interface BrandFeatures {
  brandId: string;
  features: {
    leaveManagement: {
      enabled: boolean;
      leaveTypes?: Record<string, LeaveTypeConfig>;
    };
    approvalWorkflows: { enabled: boolean };
    policyEnforcement: { enabled: boolean };
    accrualCalculations: { enabled: boolean };
    companyHolidays?: CompanyHolidaysConfig;
    reports?: ReportsConfig;
    colorCustomization?: ColorCustomizationConfig;
    statusColors?: StatusColorsConfig;
  };
}

// Default features when no brand-features.json is found
export const DEFAULT_FEATURES: BrandFeatures = {
  brandId: 'Default',
  features: {
    leaveManagement: { enabled: false },
    approvalWorkflows: { enabled: false },
    policyEnforcement: { enabled: false },
    accrualCalculations: { enabled: false },
  },
};

// Cache for loaded brand features
let cachedFeatures: BrandFeatures | null = null;
let cachedBrandId: string | null = null;

/**
 * Get the brand features configuration
 * Loads from public/<brand>/brand-features.json or returns defaults
 *
 * @returns Promise resolving to BrandFeatures
 */
export async function getBrandFeatures(): Promise<BrandFeatures> {
  const brandId = getCurrentBrandId();

  // Return cached if same brand
  if (cachedFeatures && cachedBrandId === brandId) {
    return cachedFeatures;
  }

  try {
    // In browser context, fetch from public folder
    if (typeof window !== 'undefined') {
      const response = await fetch(`/${brandId}/brand-features.json`);
      if (response.ok) {
        const features = await response.json();
        cachedFeatures = features;
        cachedBrandId = brandId;
        return features;
      }
    } else {
      // In server context, read from filesystem
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', brandId, 'brand-features.json');

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const features = JSON.parse(content);
        cachedFeatures = features;
        cachedBrandId = brandId;
        return features;
      } catch {
        // File doesn't exist, return defaults
      }
    }
  } catch (error) {
    console.warn(`Failed to load brand features for ${brandId}:`, error);
  }

  // Return defaults with current brand ID
  return {
    ...DEFAULT_FEATURES,
    brandId,
  };
}

/**
 * Synchronous version for server components
 * Uses cached value or defaults (call getBrandFeatures first to populate cache)
 */
export function getBrandFeaturesSync(): BrandFeatures {
  const brandId = getCurrentBrandId();

  if (cachedFeatures && cachedBrandId === brandId) {
    return cachedFeatures;
  }

  return {
    ...DEFAULT_FEATURES,
    brandId,
  };
}

/**
 * Check if a top-level feature is enabled
 *
 * @param features - The brand features configuration
 * @param feature - The feature to check ('leaveManagement', 'approvalWorkflows', etc.)
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(
  features: BrandFeatures,
  feature: keyof BrandFeatures['features']
): boolean {
  const featureConfig = features.features[feature];
  // Check if the feature config has an 'enabled' property (some configs like statusColors don't)
  if (featureConfig && typeof featureConfig === 'object' && 'enabled' in featureConfig) {
    return (featureConfig as { enabled: boolean }).enabled ?? false;
  }
  return false;
}

/**
 * Check if a specific leave type is enabled
 *
 * @param features - The brand features configuration
 * @param leaveType - The leave type to check ('vacation', 'sickLeave', etc.)
 * @returns boolean indicating if the leave type is enabled
 */
export function isLeaveTypeEnabled(features: BrandFeatures, leaveType: string): boolean {
  // First check if leave management is enabled
  if (!features.features.leaveManagement.enabled) {
    return false;
  }

  // Then check if the specific leave type is enabled
  const leaveTypes = features.features.leaveManagement.leaveTypes;
  if (!leaveTypes) {
    return false;
  }

  return leaveTypes[leaveType]?.enabled ?? false;
}

/**
 * Get all enabled leave types
 *
 * @param features - The brand features configuration
 * @returns Array of enabled leave type names
 */
export function getEnabledLeaveTypes(features: BrandFeatures): string[] {
  if (!features.features.leaveManagement.enabled) {
    return [];
  }

  const leaveTypes = features.features.leaveManagement.leaveTypes;
  if (!leaveTypes) {
    return [];
  }

  return Object.entries(leaveTypes)
    .filter(([, config]) => config.enabled)
    .map(([name]) => name);
}

/**
 * Clear the cached features (useful for testing or brand switching)
 */
export function clearFeaturesCache(): void {
  cachedFeatures = null;
  cachedBrandId = null;
}

/**
 * Get company holidays for a specific year
 *
 * @param features - The brand features configuration
 * @param year - The year to get holidays for
 * @returns Array of holiday dates (YYYY-MM-DD format) or empty array if disabled/no match
 */
export function getCompanyHolidayDates(features: BrandFeatures, year: number): Set<string> {
  const holidaysConfig = features.features.companyHolidays;

  if (!holidaysConfig?.enabled || !holidaysConfig.dates) {
    return new Set();
  }

  // Only return holidays for the matching year
  if (holidaysConfig.year && holidaysConfig.year !== year) {
    return new Set();
  }

  // Return dates that match the requested year
  const dates = holidaysConfig.dates
    .filter(h => h.date.startsWith(`${year}-`))
    .map(h => h.date);

  return new Set(dates);
}

/**
 * Get leave balance summary report configuration
 *
 * @param features - The brand features configuration
 * @returns Configuration with thresholds, or null if disabled
 */
export function getLeaveBalanceSummaryConfig(features: BrandFeatures): {
  enabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
} {
  const config = features.features.reports?.leaveBalanceSummary;

  return {
    enabled: config?.enabled ?? false,
    warningThreshold: config?.warningThreshold ?? 0.9,
    criticalThreshold: config?.criticalThreshold ?? 1.0,
  };
}

/**
 * Get color customization configuration
 *
 * @param features - The brand features configuration
 * @returns Configuration for color customization feature
 */
export function getColorCustomizationConfig(features: BrandFeatures): {
  enabled: boolean;
  allowTimeCodeColors: boolean;
  allowStatusColors: boolean;
} {
  const config = features.features.colorCustomization;

  return {
    enabled: config?.enabled ?? false,
    allowTimeCodeColors: config?.allowTimeCodeColors ?? false,
    allowStatusColors: config?.allowStatusColors ?? false,
  };
}

/**
 * Get status colors configuration
 *
 * @param features - The brand features configuration
 * @returns Status colors for warning/critical/normal states
 */
export function getStatusColorsConfig(features: BrandFeatures): {
  warning: string;
  critical: string;
  normal: string;
} {
  const config = features.features.statusColors;

  return {
    warning: config?.warning ?? 'amber',
    critical: config?.critical ?? 'red',
    normal: config?.normal ?? 'gray',
  };
}
