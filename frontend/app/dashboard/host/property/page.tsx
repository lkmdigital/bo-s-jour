'use client';

import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

export default function HostPropertyPage() {
  return (
    <EstablishmentHubList
      title="Mon établissement"
      description="Gérez les informations, photos et politiques de vos établissements"
      actionHref={(id) => `/dashboard/host/accommodations/${id}/edit`}
      actionLabel="Modifier l'établissement"
    />
  );
}
