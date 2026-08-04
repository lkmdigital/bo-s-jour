'use client';

import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

export default function HostRoomsHubPage() {
  return (
    <EstablishmentHubList
      title="Chambres et tarifs"
      description="Choisissez un établissement pour gérer ses chambres, équipements et tarifs"
      actionHref={(id) => `/dashboard/host/accommodations/${id}/rooms`}
      actionLabel="Gérer les chambres"
    />
  );
}
