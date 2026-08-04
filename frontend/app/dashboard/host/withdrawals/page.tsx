'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Cette page a été fusionnée dans /dashboard/host/finances (onglet "Demandes de retrait").
export default function HostWithdrawalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/host/finances?tab=retraits');
  }, [router]);

  return (
    <div className="py-16">
      <LoadingSpinner />
    </div>
  );
}
