/**
 * Référence de réservation (jeton) débarrassée d'éventuels « {{1}} » : le bouton « Payer » du modèle WhatsApp envoyait des liens de la
 * forme /paiement/{{1}}<jeton>, que la page de paiement ne retrouvait pas (constaté en production le 2026-11-11). Décode aussi les
 * encodages en double (%257B…).
 */
export function cleanBookingRef(raw: string): string {
  let value = String(raw ?? '');
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.replace(/\{\{\s*\d+\s*\}\}/g, '').trim();
}
