'use client';

import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

export default function HostPromotionsHubPage() {
  return (
    <EstablishmentHubList
      title="Promotions"
      description="Créez et suivez vos offres spéciales par établissement"
      actionHref={(id) => `/dashboard/host/accommodations/${id}/promotions`}
      actionLabel="Gérer les promotions"
    />
  );
}
