'use client';

import { Award } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminProgrammePage() {
  return (
    <AdminComingSoon
      icon={Award}
      title="Membre du programme"
      description="Gestion du programme de fidélité (Bronze, Argent, Or, Platine) et de ses niveaux."
    />
  );
}
