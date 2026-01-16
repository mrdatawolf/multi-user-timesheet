/**
 * Demo Mode Utility
 *
 * Manages demo mode state for the application.
 * When demo mode is enabled:
 * - Database is cleared and reseeded on startup
 * - Demo data is consistent for presentations
 * - Data does not persist after the application closes
 *
 * Demo mode is enabled by:
 * 1. Setting DEMO_MODE=true environment variable (primary method)
 * 2. The Electron app sets this when launching in standalone mode
 *
 * For unit tests:
 * - Tests can check isDemoMode() to conditionally run demo-specific tests
 * - Tests can use setDemoModeOverride() to force demo mode state
 */

// Internal state for testing overrides
let demoModeOverride: boolean | null = null;

/**
 * Check if the application is running in demo mode
 *
 * @returns true if demo mode is enabled
 */
export function isDemoMode(): boolean {
  // Allow tests to override
  if (demoModeOverride !== null) {
    return demoModeOverride;
  }

  // Check environment variable
  const envValue = process.env.DEMO_MODE;
  return envValue === 'true' || envValue === '1';
}

/**
 * Override demo mode state (for testing)
 *
 * @param value - true to force demo mode, false to disable, null to use environment
 */
export function setDemoModeOverride(value: boolean | null): void {
  demoModeOverride = value;
}

/**
 * Get demo mode status for logging
 *
 * @returns Human-readable demo mode status
 */
export function getDemoModeStatus(): string {
  if (isDemoMode()) {
    return 'DEMO MODE ENABLED - Database will be reset on each startup';
  }
  return 'Production mode - Database persists normally';
}

/**
 * Log demo mode banner if enabled
 */
export function logDemoModeBanner(): void {
  if (isDemoMode()) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                      DEMO MODE ACTIVE                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  - Database will be cleared and reseeded on startup        ║');
    console.log('║  - Changes will NOT persist after the application closes   ║');
    console.log('║  - Pre-loaded with sample data for demonstration           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
  }
}
