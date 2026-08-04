'use client';

import { Gift } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminPromotionsPage() {
  return (
    <AdminComingSoon
      icon={Gift}
      title="Promotions"
      description="Campagnes promotionnelles Bosejour et validation des offres créées par les établissements."
    />
  );
}
