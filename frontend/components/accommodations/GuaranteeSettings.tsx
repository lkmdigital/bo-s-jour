'use client';

import { formatPrice } from '@/lib/utils';
import type { GuaranteeFormState, GuaranteeMode } from '@/lib/guarantee';

/**
 * Réglage de la « Garantie de réservation » par l'établissement (création et modification).
 * Ce choix alimente ensuite la fiche publique, le récapitulatif, la page de paiement et la
 * confirmation : le voyageur voit et paie exactement ce qui est réglé ici.
 */

const MODES: Array<{ key: GuaranteeMode; label: string; desc: string }> = [
  { key: 'first_night', label: '1re nuit', desc: 'Le voyageur règle la première nuit en ligne.' },
  { key: 'percentage', label: 'Pourcentage', desc: 'Un pourcentage du montant du séjour.' },
  { key: 'fixed', label: 'Montant fixe', desc: 'Le même montant pour chaque réservation.' },
  { key: 'none', label: 'Aucune garantie', desc: 'Paiement intégral en ligne uniquement.' },
];

const EXAMPLE_NIGHTS = 3;

interface Props {
  value: GuaranteeFormState;
  onChange: (next: GuaranteeFormState) => void;
  /** Prix par nuit de l'établissement, pour illustrer le montant (facultatif) */
  pricePerNight?: number | null;
  error?: string | null;
}

export default function GuaranteeSettings({ value, onChange, pricePerNight, error }: Props) {
  const price = Number(pricePerNight) > 0 ? Number(pricePerNight) : null;
  const total = price ? price * EXAMPLE_NIGHTS : null;

  // Aperçu indicatif uniquement : le montant réel est toujours calculé par le serveur.
  let example: number | null = null;
  if (total && price) {
    if (value.mode === 'first_night') example = price;
    if (value.mode === 'percentage' && Number(value.percentage) > 0) example = Math.round((total * Number(value.percentage)) / 100);
    if (value.mode === 'fixed' && Number(value.fixedAmount) > 0) example = Math.round(Number(value.fixedAmount));
  }
  const exampleCoversStay = example != null && total != null && example >= total;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Montant que le voyageur peut régler en ligne pour garantir sa réservation. Le solde vous est réglé directement, à
        l&apos;arrivée. Le voyageur garde toujours la possibilité de payer la totalité en ligne.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="radiogroup" aria-label="Garantie de réservation">
        {MODES.map((m) => {
          const selected = value.mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...value, mode: m.key })}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                selected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
              }`}
            >
              <p className="font-semibold text-gray-900 dark:text-white">{m.label}</p>
              <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {value.mode === 'percentage' && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="guarantee-percentage" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
            Pourcentage du séjour
          </label>
          <div className="relative">
            <input
              id="guarantee-percentage"
              type="number"
              inputMode="decimal"
              min={1}
              max={99}
              step={1}
              value={value.percentage}
              onChange={(e) => onChange({ ...value, percentage: e.target.value })}
              placeholder="30"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Entre 1 et 99 %.</p>
        </div>
      )}

      {value.mode === 'fixed' && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="guarantee-fixed" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
            Montant de la garantie
          </label>
          <div className="relative">
            <input
              id="guarantee-fixed"
              type="number"
              inputMode="numeric"
              min={1}
              step={500}
              value={value.fixedAmount}
              onChange={(e) => onChange({ ...value, fixedAmount: e.target.value })}
              placeholder="20000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">FCFA</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2" role="alert">{error}</p>}

      {value.mode !== 'none' && example != null && total != null && !exampleCoversStay && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 rounded-lg bg-gray-50 dark:bg-gray-900/30 p-3">
          Exemple pour {EXAMPLE_NIGHTS} nuits à {formatPrice(price!)} FCFA : le voyageur règle{' '}
          <strong>{formatPrice(example)} FCFA</strong> en ligne et <strong>{formatPrice(total - example)} FCFA</strong> à
          l&apos;arrivée.
        </p>
      )}
      {value.mode !== 'none' && exampleCoversStay && (
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
          Pour un séjour de {EXAMPLE_NIGHTS} nuits, cette garantie atteint le total du séjour : seul le paiement intégral
          sera alors proposé au voyageur.
        </p>
      )}

      <p className="text-xs text-gray-500 mt-3">
        La garantie n&apos;est pas proposée (paiement intégral demandé) si l&apos;arrivée a lieu dans moins de 48 h, si le
        séjour dure 7 nuits ou plus, ou si votre politique d&apos;annulation est « Stricte ». Le remboursement suit la
        politique d&apos;annulation que vous avez choisie.
      </p>
    </div>
  );
}
