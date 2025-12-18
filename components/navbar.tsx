"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';

const NAV_ITEMS = [
  { href: '/attendance', label: 'Attendance', enabled: true },
  { href: '/dashboard', label: 'Dashboard', enabled: config.features.enableDashboard },
  { href: '/reports', label: 'Reports', enabled: config.features.enableReports },
];

export function Navbar() {
  const pathname = usePathname();
  const enabledItems = NAV_ITEMS.filter(item => item.enabled);

  return (
    <nav className="border-b">
      <div className="max-w-full mx-auto px-3">
        <div className="flex items-center justify-between h-12">
          <Link href="/attendance" className="font-bold text-lg">
            Multi-User Attendance
          </Link>
          <div className="flex items-center space-x-4">
            {enabledItems.map(item => (
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
          </div>
        </div>
      </div>
    </nav>
  );
}
