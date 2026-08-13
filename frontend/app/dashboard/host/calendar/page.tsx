'use client';

import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

// Le calendrier de disponibilités est géré par chambre (ouverture/fermeture,
// blocages, tarifs par période) — ce hub mène à la liste des chambres de
// l'établissement choisi, où chaque chambre a son propre lien "Calendrier".
export default function HostCalendarHubPage() {
  return (
    <EstablishmentHubList
      title="Calendrier"
      description="Choisissez un établissement pour gérer les disponibilités et blocages de ses chambres"
      actionHref={(id) => `/dashboard/host/accommodations/${id}/rooms`}
      actionLabel="Gérer le calendrier"
    />
  );
}
