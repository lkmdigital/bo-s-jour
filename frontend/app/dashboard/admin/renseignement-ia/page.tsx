'use client';

import { BrainCircuit } from 'lucide-react';
import AdminComingSoon from '@/components/dashboard/admin/AdminComingSoon';

export default function AdminRenseignementIaPage() {
  return (
    <AdminComingSoon
      icon={BrainCircuit}
      title="Renseignement IA"
      description="Assistant administrateur, détection de fraude, suggestions tarifaires et prévisions."
    />
  );
}
