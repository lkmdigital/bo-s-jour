'use client';

import { Wallet } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminComptabilitePage() {
  return (
    <AdminComingSoon
      icon={Wallet}
      title="Comptabilité"
      description="Gestion des commissions et des reversements aux établissements."
    />
  );
}
