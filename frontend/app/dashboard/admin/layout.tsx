'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController } from '@/lib/userUtils';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Le portail de connexion admin s'affiche seul (sans sidebar ni garde)
  const isLoginRoute = pathname === '/dashboard/admin/login';
  const allowed = isAdminOrController(user);

  useEffect(() => {
    if (isLoginRoute) return;
    if (!isLoading && (!isAuthenticated || !allowed)) {
      router.push('/dashboard/admin/login');
    }
  }, [isAuthenticated, isLoading, allowed, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || !allowed) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-4 lg:p-8">{children}</main>
    </div>
  );
}
