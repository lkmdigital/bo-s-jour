'use client';

import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

export default function HostStaffHubPage() {
  return (
    <EstablishmentHubList
      title="Personnel"
      description="Choisissez un établissement pour gérer son équipe"
      actionHref={(id) => `/dashboard/host/accommodations/${id}/staff`}
      actionLabel="Gérer le personnel"
    />
  );
}
