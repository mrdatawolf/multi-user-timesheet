'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, lastVisitedPageKey } from '@/lib/auth-context';
import { PageLoading } from '@/components/page-loading';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const lastPage = localStorage.getItem(lastVisitedPageKey(user.username));
      if (lastPage && lastPage !== '/') {
        const isAdminOrMaster = user?.group?.is_master === 1 || user?.role_id === 1;
        // Pages that require elevated access
        const adminOnlyPages = ['/users'];
        const needsAdmin = adminOnlyPages.some(p => lastPage.startsWith(p));
        if (needsAdmin && !isAdminOrMaster) {
          localStorage.removeItem(lastVisitedPageKey(user.username));
          router.replace('/hours');
          return;
        }
        router.replace(lastPage);
        return;
      }
      router.replace('/dashboard');
    } else if (!authLoading) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router, user]);

  return (
    <div className="min-h-screen p-3">
      <PageLoading />
    </div>
  );
}
