'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isController, isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import AccommodationCreationWizard from '@/components/accommodations/AccommodationCreationWizard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface HostOption {
  id: number;
  name: string;
  email: string;
  establishment_name?: string;
}

export default function AdminNewAccommodationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isController(user)) {
        router.push('/dashboard/admin/inspections');
        return;
      }
      if (!isAdmin(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      fetchHosts();
    }
  }, [isAuthenticated, user]);

  const fetchHosts = async () => {
    try {
      const response = await api.get('/admin/users/hosts');
      setHosts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      setHosts([]);
    } finally {
      setLoadingHosts(false);
    }
  };

  if (isLoading || loadingHosts) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  return (
    <AccommodationCreationWizard
      mode="admin"
      hosts={hosts}
      backHref="/dashboard/admin/accommodations"
      cancelHref="/dashboard/admin/accommodations"
      successRedirectHref="/dashboard/admin/accommodations"
      title="Créer un établissement"
      subtitle="Ajoutez un établissement au nom d'un hôte. Toutes les informations seront soumises à validation."
    />
  );
}

