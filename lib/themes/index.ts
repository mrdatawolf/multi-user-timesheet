/**
 * Theme System
 *
 * Central registry for all application themes.
 * To add a new theme:
 * 1. Create a new file in lib/themes/ (e.g., 'ocean.ts')
 * 2. Define your theme configuration using ThemeConfig interface
 * 3. Import and add it to the THEMES array below
 * 4. Update ThemeId type in types.ts to include your theme id
 */

import { ThemeConfig, ThemeId } from './types';
import { trinityTheme } from './trinity';
import { defaultTheme } from './default';

/**
 * All available themes
 * Add new themes to this array to make them available throughout the app
 */
export const THEMES: ThemeConfig[] = [
  trinityTheme,
  defaultTheme,
];

/**
 * Get a theme configuration by ID
 * @param themeId - The theme identifier
 * @returns The theme configuration, or trinity theme as fallback
 */
export function getTheme(themeId: ThemeId): ThemeConfig {
  return THEMES.find(theme => theme.id === themeId) || trinityTheme;
}

/**
 * Get all available theme IDs
 * @returns Array of theme IDs
 */
export function getAvailableThemeIds(): ThemeId[] {
  return THEMES.map(theme => theme.id);
}

/**
 * Validate if a theme ID exists
 * @param themeId - The theme identifier to validate
 * @returns True if the theme exists
 */
export function isValidThemeId(themeId: string): themeId is ThemeId {
  return THEMES.some(theme => theme.id === themeId);
}

// Re-export types for convenience
export type { ThemeConfig, ThemeId } from './types';
