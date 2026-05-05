'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { ConfirmProvider } from '@/components/common/ConfirmContext';
import ThemeBanner from '@/components/common/ThemeBanner';
import MaintenancePage from '@/components/common/MaintenancePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { checkAuth } = useAuthStore();
  const { theme: currentTheme } = useThemeStore();
  const { fetchSettings, maintenanceEnabled, maintenanceMessage, eventTheme, loaded } =
    useAppSettingsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    checkAuth().catch(() => {});
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark / light mode
  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme]);

  // Maintenance : bloquer les non-admins (laisser passer les admins pour qu'ils puissent désactiver)
  const isAdmin = user?.role === 'admin';
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;
  if (loaded && maintenanceEnabled && !isAdmin && !isAuthRoute) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <ThemeBanner theme={eventTheme} />
        {children}
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
