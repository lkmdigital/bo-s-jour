'use client';

import { History } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminJournalActivitePage() {
  return (
    <AdminComingSoon
      icon={History}
      title="Journal d'activité"
      description="Traçabilité exhaustive de toutes les actions effectuées sur la plateforme."
    />
  );
}
