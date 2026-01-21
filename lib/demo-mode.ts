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
 * 1. Brand's brand-features.json having DemoMode: true (highest priority)
 * 2. Setting DEMO_MODE=true environment variable (fallback)
 * 3. The Electron app sets this when launching in standalone mode
 *
 * For unit tests:
 * - Tests can check isDemoMode() to conditionally run demo-specific tests
 * - Tests can use setDemoModeOverride() to force demo mode state
 */

import * as fs from 'fs';
import * as path from 'path';

// Internal state for testing overrides
let demoModeOverride: boolean | null = null;

// Cache for brand demo mode setting (to avoid repeated file reads)
let brandDemoModeCache: boolean | null | undefined = undefined;

// Cache for runtime config (written by Electron)
let runtimeConfigCache: { demoMode: boolean; dataPath: string } | null | undefined = undefined;

/**
 * Read runtime config written by Electron
 * This is the most reliable way to get demo mode setting when running under Electron
 */
function getRuntimeConfig(): { demoMode: boolean; dataPath: string } | null {
  if (runtimeConfigCache !== undefined) {
    return runtimeConfigCache;
  }

  try {
    // Runtime config is written by Electron to the server's working directory
    const configPath = path.join(process.cwd(), 'runtime-config.json');
    console.log('[DEMO-MODE] Checking for runtime-config.json at:', configPath);

    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      console.log('[DEMO-MODE] Found runtime config:', JSON.stringify(config));
      runtimeConfigCache = config;
      return config;
    }

    console.log('[DEMO-MODE] No runtime-config.json found (not running under Electron)');
    runtimeConfigCache = null;
    return null;
  } catch (error) {
    console.log('[DEMO-MODE] Error reading runtime config:', error);
    runtimeConfigCache = null;
    return null;
  }
}

/**
 * Get the data path from runtime config (if available)
 */
export function getRuntimeDataPath(): string | null {
  const config = getRuntimeConfig();
  return config?.dataPath || null;
}

/**
 * Get the demo mode setting from the brand's brand-features.json
 *
 * @returns true if brand has DemoMode: true, false if explicitly false, null if not set
 */
function getBrandDemoMode(): boolean | null {
  console.log('[DEMO-MODE] getBrandDemoMode() called');
  console.log('[DEMO-MODE] brandDemoModeCache:', brandDemoModeCache);

  // Return cached value if already read
  if (brandDemoModeCache !== undefined) {
    console.log('[DEMO-MODE] Returning cached value:', brandDemoModeCache);
    return brandDemoModeCache;
  }

  try {
    // Find the project root by looking for package.json
    let currentDir = __dirname;
    let rootDir = currentDir;
    console.log('[DEMO-MODE] Starting __dirname:', __dirname);

    // Walk up to find the project root (where package.json is)
    for (let i = 0; i < 10; i++) {
      const pkgPath = path.join(currentDir, 'package.json');
      console.log('[DEMO-MODE] Checking for package.json at:', pkgPath, 'exists:', fs.existsSync(pkgPath));
      if (fs.existsSync(pkgPath)) {
        rootDir = currentDir;
        break;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    console.log('[DEMO-MODE] Found rootDir:', rootDir);

    // Read brand selection
    const brandSelectionPath = path.join(rootDir, 'lib', 'brand-selection.json');
    console.log('[DEMO-MODE] brandSelectionPath:', brandSelectionPath, 'exists:', fs.existsSync(brandSelectionPath));
    if (!fs.existsSync(brandSelectionPath)) {
      console.log('[DEMO-MODE] brand-selection.json not found, returning null');
      brandDemoModeCache = null;
      return null;
    }

    const brandSelection = JSON.parse(fs.readFileSync(brandSelectionPath, 'utf8'));
    console.log('[DEMO-MODE] brandSelection:', JSON.stringify(brandSelection));
    if (!brandSelection.brand) {
      console.log('[DEMO-MODE] No brand in selection, returning null');
      brandDemoModeCache = null;
      return null;
    }

    // Read brand features
    const brandFeaturesPath = path.join(rootDir, 'public', brandSelection.brand, 'brand-features.json');
    console.log('[DEMO-MODE] brandFeaturesPath:', brandFeaturesPath, 'exists:', fs.existsSync(brandFeaturesPath));
    if (!fs.existsSync(brandFeaturesPath)) {
      console.log('[DEMO-MODE] brand-features.json not found, returning null');
      brandDemoModeCache = null;
      return null;
    }

    const brandFeatures = JSON.parse(fs.readFileSync(brandFeaturesPath, 'utf8'));
    console.log('[DEMO-MODE] brandFeatures.DemoMode:', brandFeatures.DemoMode, 'type:', typeof brandFeatures.DemoMode);

    // Check if DemoMode is explicitly set
    if (typeof brandFeatures.DemoMode === 'boolean') {
      console.log('[DEMO-MODE] Found DemoMode in brand config:', brandFeatures.DemoMode);
      brandDemoModeCache = brandFeatures.DemoMode;
      return brandFeatures.DemoMode;
    }

    console.log('[DEMO-MODE] DemoMode not set in brand config, returning null');
    brandDemoModeCache = null;
    return null;
  } catch (error) {
    // If any error occurs, fall back to null (use env var)
    console.log('[DEMO-MODE] Error reading brand config:', error);
    brandDemoModeCache = null;
    return null;
  }
}

/**
 * Clear the brand demo mode cache (for testing)
 */
export function clearBrandDemoModeCache(): void {
  brandDemoModeCache = undefined;
  runtimeConfigCache = undefined;
}

/**
 * Check if the application is running in demo mode
 *
 * @returns true if demo mode is enabled
 */
export function isDemoMode(): boolean {
  console.log('[DEMO-MODE] isDemoMode() called');
  console.log('[DEMO-MODE] demoModeOverride:', demoModeOverride);

  // Allow tests to override
  if (demoModeOverride !== null) {
    console.log('[DEMO-MODE] Using override:', demoModeOverride);
    return demoModeOverride;
  }

  // Check runtime config first (written by Electron, highest priority)
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig !== null) {
    console.log('[DEMO-MODE] Using runtime config:', runtimeConfig.demoMode);
    return runtimeConfig.demoMode;
  }

  // Check brand config second
  const brandDemoMode = getBrandDemoMode();
  console.log('[DEMO-MODE] getBrandDemoMode() returned:', brandDemoMode);

  if (brandDemoMode !== null) {
    console.log('[DEMO-MODE] Using brand config:', brandDemoMode);
    return brandDemoMode;
  }

  // Fall back to environment variable
  const envValue = process.env.DEMO_MODE;
  console.log('[DEMO-MODE] DEMO_MODE env var:', envValue);
  const result = envValue === 'true' || envValue === '1';
  console.log('[DEMO-MODE] Final result:', result);
  return result;
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
