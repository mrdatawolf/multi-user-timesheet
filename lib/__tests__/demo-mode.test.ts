/**
 * Unit tests for Demo Mode Utility
 *
 * These tests verify demo mode detection and behavior.
 * Demo mode is used to provide a consistent demo experience
 * with fresh data on each startup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDemoMode,
  setDemoModeOverride,
  getDemoModeStatus,
  logDemoModeBanner,
} from '../demo-mode';

describe('Demo Mode Utility', () => {
  // Store original env values
  let originalDemoMode: string | undefined;

  beforeEach(() => {
    // Save original environment
    originalDemoMode = process.env.DEMO_MODE;
    // Clear any test overrides
    setDemoModeOverride(null);
  });

  afterEach(() => {
    // Restore original environment
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
    // Clear test overrides
    setDemoModeOverride(null);
  });

  describe('isDemoMode', () => {
    it('should return false when DEMO_MODE is not set', () => {
      delete process.env.DEMO_MODE;
      expect(isDemoMode()).toBe(false);
    });

    it('should return true when DEMO_MODE is "true"', () => {
      process.env.DEMO_MODE = 'true';
      expect(isDemoMode()).toBe(true);
    });

    it('should return true when DEMO_MODE is "1"', () => {
      process.env.DEMO_MODE = '1';
      expect(isDemoMode()).toBe(true);
    });

    it('should return false when DEMO_MODE is "false"', () => {
      process.env.DEMO_MODE = 'false';
      expect(isDemoMode()).toBe(false);
    });

    it('should return false when DEMO_MODE is "0"', () => {
      process.env.DEMO_MODE = '0';
      expect(isDemoMode()).toBe(false);
    });

    it('should return false when DEMO_MODE is any other value', () => {
      process.env.DEMO_MODE = 'yes';
      expect(isDemoMode()).toBe(false);

      process.env.DEMO_MODE = 'enabled';
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('setDemoModeOverride', () => {
    it('should override environment variable when set to true', () => {
      process.env.DEMO_MODE = 'false';
      setDemoModeOverride(true);
      expect(isDemoMode()).toBe(true);
    });

    it('should override environment variable when set to false', () => {
      process.env.DEMO_MODE = 'true';
      setDemoModeOverride(false);
      expect(isDemoMode()).toBe(false);
    });

    it('should use environment variable when set to null', () => {
      process.env.DEMO_MODE = 'true';
      setDemoModeOverride(true);
      expect(isDemoMode()).toBe(true);

      setDemoModeOverride(null);
      expect(isDemoMode()).toBe(true); // Falls back to env
    });

    it('should allow tests to simulate demo mode', () => {
      // This is useful for unit tests that need to test demo-specific behavior
      delete process.env.DEMO_MODE;
      expect(isDemoMode()).toBe(false);

      setDemoModeOverride(true);
      expect(isDemoMode()).toBe(true);

      setDemoModeOverride(false);
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('getDemoModeStatus', () => {
    it('should return demo mode message when enabled', () => {
      setDemoModeOverride(true);
      const status = getDemoModeStatus();
      expect(status).toContain('DEMO MODE ENABLED');
      expect(status).toContain('reset on each startup');
    });

    it('should return production mode message when disabled', () => {
      setDemoModeOverride(false);
      const status = getDemoModeStatus();
      expect(status).toContain('Production mode');
      expect(status).toContain('persists normally');
    });
  });

  describe('logDemoModeBanner', () => {
    it('should not throw when called', () => {
      // Just verify it doesn't throw
      expect(() => {
        setDemoModeOverride(true);
        logDemoModeBanner();
      }).not.toThrow();

      expect(() => {
        setDemoModeOverride(false);
        logDemoModeBanner();
      }).not.toThrow();
    });
  });

  describe('Electron app integration scenarios', () => {
    it('should enable demo mode for standalone Electron app', () => {
      // Electron app sets DEMO_MODE=true by default
      process.env.DEMO_MODE = 'true';
      expect(isDemoMode()).toBe(true);
    });

    it('should allow disabling demo mode via environment', () => {
      // Users can set DEMO_MODE=false to disable
      process.env.DEMO_MODE = 'false';
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('Unit test scenarios', () => {
    it('should allow tests to run demo-specific assertions', () => {
      setDemoModeOverride(true);

      // Example: test that would only run in demo mode
      if (isDemoMode()) {
        expect(true).toBe(true); // Demo-specific test passed
      }
    });

    it('should allow tests to run production-specific assertions', () => {
      setDemoModeOverride(false);

      // Example: test that would only run in production mode
      if (!isDemoMode()) {
        expect(true).toBe(true); // Production-specific test passed
      }
    });
  });
});
