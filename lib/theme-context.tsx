'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeId, getTheme, isValidThemeId } from '@/lib/themes';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('trinity');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('app_theme');
    if (stored && isValidThemeId(stored)) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      // Apply default theme on first load
      applyTheme('trinity');
    }
  }, []);

  const applyTheme = (themeId: ThemeId) => {
    const root = document.documentElement;
    const themeConfig = getTheme(themeId);
    const colors = themeConfig.appearance.colors;

    // Apply colors directly to CSS variables
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--card-foreground', colors.cardForeground);
    root.style.setProperty('--popover', colors.popover);
    root.style.setProperty('--popover-foreground', colors.popoverForeground);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', colors.mutedForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--destructive', colors.destructive);
    root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.input);
    root.style.setProperty('--ring', colors.ring);

    // Apply optional custom CSS class
    if (themeConfig.appearance.cssClass) {
      // Remove all theme-specific classes first
      root.classList.forEach(className => {
        if (className.startsWith('theme-')) {
          root.classList.remove(className);
        }
      });
      root.classList.add(themeConfig.appearance.cssClass);
    }
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
    applyTheme(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values for SSR/SSG
    return {
      theme: 'trinity' as ThemeId,
      setTheme: () => {},
    };
  }
  return context;
}
