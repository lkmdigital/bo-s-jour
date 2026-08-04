'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Le calendrier détaillé reste géré par la page /bookings existante (vue calendrier/liste).
export default function HostCalendarRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/host/bookings');
  }, [router]);

  return (
    <div className="py-16">
      <LoadingSpinner />
    </div>
  );
}
