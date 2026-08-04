'use client';

import { ShieldCheck } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminConformitePage() {
  return (
    <AdminComingSoon
      icon={ShieldCheck}
      title="Conformité"
      description="Suivi des documents obligatoires et des relances automatiques (30/60/90/120 jours)."
    />
  );
}
