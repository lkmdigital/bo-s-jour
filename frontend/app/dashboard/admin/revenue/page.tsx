'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Route déplacée vers /dashboard/admin/comptabilite (menu "Comptabilité")
export default function AdminRevenueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/comptabilite');
  }, [router]);
  return null;
}
