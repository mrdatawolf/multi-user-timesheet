"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { getTheme } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Shield } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/attendance', label: 'Attendance', enabled: true, superuserOnly: false },
  { href: '/employees', label: 'Employees', enabled: true, superuserOnly: false },
  { href: '/users', label: 'Users', enabled: true, superuserOnly: true },
  { href: '/dashboard', label: 'Dashboard', enabled: config.features.enableDashboard, superuserOnly: false },
  { href: '/reports', label: 'Reports', enabled: config.features.enableReports, superuserOnly: false },
  { href: '/settings', label: 'Settings', enabled: true, superuserOnly: false },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme: themeId } = useTheme();
  const themeConfig = getTheme(themeId);
  const enabledItems = NAV_ITEMS.filter(item => {
    if (!item.enabled) return false;
    if (item.superuserOnly && (!user || !user.is_superuser)) return false;
    return true;
  });

  const logoSrc = themeConfig.branding.logo || '/default.png';
  const logoAlt = themeConfig.branding.logoAlt || 'Logo';
  const appTitle = themeConfig.branding.appTitle;

  return (
    <nav className="border-b">
      <div className="max-w-full mx-auto px-3">
        <div className="flex items-center justify-between h-12">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-bold text-lg hidden sm:inline">{appTitle}</span>
          </Link>
          <div className="flex items-center space-x-4">
            {isAuthenticated && enabledItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}

            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">{user.full_name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>{user.group.name}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/login">
                    <Button variant="default" size="sm">
                      Sign In
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
