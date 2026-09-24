import { redirect } from 'next/navigation';

/**
 * Lien court utilisé par le bouton « Payer ma réservation » du modèle WhatsApp
 * `bosejour_demande_acceptee` : Meta exige que la variable d'une URL de bouton soit
 * à la fin de l'URL, alors que la page de paiement est /bookings/<jeton>/payment.
 */
export default async function PaiementRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/bookings/${encodeURIComponent(token)}/payment`);
}
