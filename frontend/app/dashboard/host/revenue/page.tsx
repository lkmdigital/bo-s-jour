'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Cette page a été fusionnée dans /dashboard/host/finances (onglet "Revenus").
export default function HostRevenueRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/host/finances?tab=revenus');
  }, [router]);

  return (
    <div className="py-16">
      <LoadingSpinner />
    </div>
  );
}
