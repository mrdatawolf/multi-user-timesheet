/**
 * Theme Configuration System
 *
 * This file defines the structure for theme configurations.
 * Each theme is a configuration object that defines appearance and layout preferences.
 */

export type ThemeId = 'trinity' | 'default';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeConfig {
  /** Unique identifier for the theme */
  id: ThemeId;

  /** Display name shown to users */
  name: string;

  /** Brief description of the theme */
  description: string;

  /** Appearance settings */
  appearance: {
    /** Color palette for this theme */
    colors: ThemeColors;

    /** Optional CSS class to apply to the root element */
    cssClass?: string;
  };

  /** Layout preferences for different pages */
  layout: {
    /** Attendance page layout configuration */
    attendance: {
      /** Order of sections: 'balanceFirst' or 'recordFirst' */
      sectionOrder: 'balanceFirst' | 'recordFirst';

      /** Whether to show visual separators between months */
      showMonthSeparators: boolean;
    };
  };

  /** Optional custom styles or overrides */
  customization?: {
    /** Any additional settings for future expansion */
    [key: string]: any;
  };
}
