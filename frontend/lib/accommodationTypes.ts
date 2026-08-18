/**
 * Catégorisation des établissements — source unique partagée par la bannière de
 * recherche, les filtres, le configurateur de création et les formulaires
 * d'édition. Miroir de Accommodation::SUBTYPES côté backend (app/Models/Accommodation.php).
 *
 * Rapport de vérification du parcours voyageur, point 5 & 6 :
 * - Famille "Hôtel" : sous-catégories Hôtel (standard) / Appart-Hôtel / Motel / Auberge.
 * - Famille "Écolodge" et "Maison d'hôtes" : pas de sous-catégorie.
 * - Famille "Résidence" (valeur DB historique : apartment) : sous-catégories
 *   Résidence Meublée / Résidence luxueuse.
 * - Type "Autre" avec zone de texte libre (accommodation_type_other_label).
 */

export type AccommodationType = 'hotel' | 'lodge' | 'guesthouse' | 'apartment' | 'other';

export const ACCOMMODATION_TYPES: Array<{ value: AccommodationType; label: string }> = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'lodge', label: 'Écolodge' },
  { value: 'guesthouse', label: "Maison d'hôtes" },
  { value: 'apartment', label: 'Résidence' },
  { value: 'other', label: 'Autre' },
];

export const ACCOMMODATION_SUBTYPES: Partial<Record<AccommodationType, Array<{ value: string; label: string }>>> = {
  hotel: [
    { value: '', label: 'Hôtel (standard)' },
    { value: 'apart_hotel', label: 'Appart-Hôtel' },
    { value: 'motel', label: 'Motel' },
    { value: 'auberge', label: 'Auberge' },
  ],
  apartment: [
    { value: '', label: 'Résidence (standard)' },
    { value: 'furnished', label: 'Résidence Meublée' },
    { value: 'luxury', label: 'Résidence luxueuse' },
  ],
};

export function accommodationTypeLabel(type?: string | null): string {
  return ACCOMMODATION_TYPES.find((t) => t.value === type)?.label ?? type ?? '';
}

export function accommodationSubtypeLabel(type?: string | null, subtype?: string | null): string | null {
  if (!type || !subtype) return null;
  return ACCOMMODATION_SUBTYPES[type as AccommodationType]?.find((s) => s.value === subtype)?.label ?? null;
}
