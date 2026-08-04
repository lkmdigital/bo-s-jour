'use client';

import { Scale } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminJuridiquePage() {
  return (
    <AdminComingSoon
      icon={Scale}
      title="Juridique"
      description="Gestion des documents légaux (CGU, politique de confidentialité, conditions) et de leurs versions."
    />
  );
}
