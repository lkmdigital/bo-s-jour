'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import HostSidebar from '@/components/dashboard/host/HostSidebar';
import HostTopbar from '@/components/dashboard/host/HostTopbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function HostDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host') {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <HostSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <HostTopbar />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
