'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  group_id: number;
  is_superuser?: number;
  group: {
    id: number;
    name: string;
    description: string;
    is_master: number;
    can_view_all: number;
    can_edit_all: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isMaster: boolean;
  canViewAll: boolean;
  canEditAll: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load auth state from localStorage on mount
  useEffect(() => {
    console.log('[Auth] Initializing auth context...');

    // Failsafe: ensure loading state doesn't persist forever
    const timeout = setTimeout(() => {
      console.warn('[Auth] Timeout reached - forcing loading to false');
      setIsLoading(false);
    }, 3000);

    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      console.log('[Auth] Stored auth data:', {
        hasToken: !!storedToken,
        hasUser: !!storedUser
      });

      if (storedToken && storedUser) {
        console.log('[Auth] Found stored credentials, verifying token...');
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Verify token is still valid
        verifyToken(storedToken).finally(() => {
          console.log('[Auth] Token verification complete');
          clearTimeout(timeout);
        });
      } else {
        console.log('[Auth] No stored credentials, setting loading to false');
        setIsLoading(false);
        clearTimeout(timeout);
      }
    } catch (error) {
      // Invalid stored data, clear it
      console.error('[Auth] Failed to parse stored auth data:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setIsLoading(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, []);

  const verifyToken = async (authToken: string) => {
    console.log('[Auth] Starting token verification...');
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[Auth] Fetch timeout - aborting request');
        controller.abort();
      }, 3000);

      console.log('[Auth] Fetching /api/auth/verify...');
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[Auth] Verify response status:', response.status);

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      console.log('[Auth] Token verified successfully');
      setUser(data.user);
      setToken(authToken);
    } catch (error) {
      // Token is invalid or request timed out, clear auth state
      console.error('[Auth] Token verification error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
    } finally {
      console.log('[Auth] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isMaster: user?.group?.is_master === 1,
    canViewAll: user?.group?.can_view_all === 1 || user?.group?.is_master === 1,
    canEditAll: user?.group?.can_edit_all === 1 || user?.group?.is_master === 1,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
