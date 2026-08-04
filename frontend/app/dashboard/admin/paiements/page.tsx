'use client';

import { CreditCard } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminPaiementsPage() {
  return (
    <AdminComingSoon
      icon={CreditCard}
      title="Paiements"
      description="Historique des transactions, moyens de paiement et remboursements."
    />
  );
}
