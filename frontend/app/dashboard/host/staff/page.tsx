'use client';

import { UserCog } from 'lucide-react';
import ComingSoon from '@/components/dashboard/host/ComingSoon';

export default function HostStaffPage() {
  return (
    <ComingSoon
      icon={UserCog}
      title="Personnel"
      description="La gestion des collaborateurs (réceptionniste, comptabilité, commercial, housekeeping, maintenance) arrive prochainement."
    />
  );
}
