'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

/** Coquille commune aux sous-pages de Paramètres : garde d'authentification admin + en-tête. */
export default function SettingsPageShell({ icon: Icon, title, description, children }: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/dashboard/admin/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Paramètres
        </Link>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Icon className="w-6 h-6 text-primary" />
          {title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>

        {children}
      </main>
    </div>
  );
}
