'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Route déplacée vers /dashboard/admin/paiements (onglet "Demandes de retrait")
export default function AdminWithdrawalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/paiements');
  }, [router]);
  return null;
}
