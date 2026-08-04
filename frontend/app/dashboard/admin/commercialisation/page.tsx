'use client';

import { Megaphone } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminCommercialisationPage() {
  return (
    <AdminComingSoon
      icon={Megaphone}
      title="Commercialisation"
      description="Campagnes marketing, segmentation et ciblage des utilisateurs."
    />
  );
}
