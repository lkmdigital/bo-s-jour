'use client';

import { Map } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminBaseTouristiquePage() {
  return (
    <AdminComingSoon
      icon={Map}
      title="Base touristique"
      description="Cartographie interactive et statistiques nationales du tourisme en Côte d'Ivoire."
    />
  );
}
