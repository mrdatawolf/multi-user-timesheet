/**
 * Application Configuration
 *
 * Feature flags and settings for the timesheet application
 */

export const config = {
  /**
   * Feature Flags
   */
  features: {
    // Enable/disable the dashboard page
    enableDashboard: true,

    // Enable/disable the reports page
    enableReports: true,
  },

  /**
   * Application Settings
   */
  app: {
    name: 'Multi-User Timesheet',
    version: '1.0.0',
  },
} as const;

export default config;
