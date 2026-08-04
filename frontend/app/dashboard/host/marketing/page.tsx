'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// "Commercialisation" s'appuie pour l'instant sur les promotions par établissement.
export default function HostMarketingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/host/promotions');
  }, [router]);

  return (
    <div className="py-16">
      <LoadingSpinner />
    </div>
  );
}
