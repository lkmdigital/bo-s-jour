import { redirect } from 'next/navigation';
import { cleanBookingRef } from '@/lib/bookingRef';

/**
 * Lien court utilisé par le bouton « Payer ma réservation » du modèle WhatsApp
 * `bosejour_demande_acceptee` : Meta exige que la variable d'une URL de bouton soit
 * à la fin de l'URL, alors que la page de paiement est /bookings/<jeton>/payment.
 */
export default async function PaiementRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Le bouton WhatsApp a pu envoyer « {{1}} » devant le jeton : on le retire.
  redirect(`/bookings/${encodeURIComponent(cleanBookingRef(token))}/payment`);
}
