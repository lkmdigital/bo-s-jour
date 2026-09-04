'use client';

import { Sparkles } from 'lucide-react';

export interface LongStayTier {
  min_nights: number;
  max_nights: number | null;
  discount_percent: number;
  enabled: boolean;
}

/**
 * Paliers par défaut proposés à l'hôte — retour client 2026-09-02 (Partie 3) :
 * 3-5 nuits 5%, 6-10 nuits 10%, 11+ nuits 15% (ce dernier facultatif, décoché
 * par défaut même quand la fonctionnalité globale est activée).
 */
export const DEFAULT_LONG_STAY_TIERS: LongStayTier[] = [
  { min_nights: 3, max_nights: 5, discount_percent: 5, enabled: true },
  { min_nights: 6, max_nights: 10, discount_percent: 10, enabled: true },
  { min_nights: 11, max_nights: null, discount_percent: 15, enabled: false },
];

function tierLabel(tier: LongStayTier): string {
  return tier.max_nights ? `${tier.min_nights} à ${tier.max_nights} nuitées` : `Plus de ${tier.min_nights} nuitées`;
}

interface Props {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tiers: LongStayTier[];
  onTiersChange: (tiers: LongStayTier[]) => void;
}

/**
 * Remises automatiques long séjour — 3 paliers fixes, chacun activable
 * indépendamment avec un pourcentage modifiable. Partagé entre l'inscription
 * (AccommodationCreationWizard) et la page d'édition, pour un comportement
 * identique aux deux endroits (retour client 2026-09-02, Partie 3).
 */
export default function LongStayDiscountTiers({ enabled, onEnabledChange, tiers, onTiersChange }: Props) {
  const updateTier = (index: number, patch: Partial<LongStayTier>) => {
    onTiersChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
      {!enabled && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Boostez vos réservations avec les Remises Long Séjour
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Les voyageurs réservent 3 fois plus lorsqu&apos;une réduction s&apos;applique sur les séjours de plusieurs jours.
            Souhaitez-vous activer la remise automatique BoSéjour pour augmenter votre taux d&apos;occupation ?
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded"
        />
        <span className="font-medium">Activer les remises automatiques pour longs séjours</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">Recommandé</span>
      </label>

      {enabled && (
        <div className="pl-6 space-y-2">
          <p className="text-xs text-gray-500 mb-2">
            Vous gardez la main : modifiez les pourcentages ou désactivez chaque palier à tout moment.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-1.5 pr-3 font-medium">Tranche de séjour</th>
                  <th className="py-1.5 pr-3 font-medium">Remise conseillée</th>
                  <th className="py-1.5 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{tierLabel(tier)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tier.discount_percent}
                          disabled={!tier.enabled}
                          onChange={(e) => updateTier(i, { discount_percent: Number(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(e) => updateTier(i, { enabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{tier.enabled ? 'Activée' : 'Inactive'}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
