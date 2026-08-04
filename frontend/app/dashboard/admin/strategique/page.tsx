'use client';

import { TrendingUp } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminStrategiquePage() {
  return (
    <AdminComingSoon
      icon={TrendingUp}
      title="Tableau stratégique"
      description="Vue exécutive : cartographie, classements des établissements, prévisions et alertes stratégiques."
    />
  );
}
