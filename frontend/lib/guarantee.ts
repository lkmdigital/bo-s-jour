/**
 * Garantie de réservation — types et libellés partagés par tout le parcours
 * (paramétrage établissement → fiche publique → récapitulatif → paiement → confirmation).
 *
 * Décisions BoSéjour du 2026-10-08 : le terme est « Garantie » (jamais « Acompte »),
 * et son montant suit le paramétrage de l'établissement. Les montants et les libellés
 * viennent TOUJOURS de l'API (PaymentOptionsService) : rien n'est recalculé ici, pour
 * qu'un écran ne puisse pas annoncer autre chose que ce qui sera prélevé.
 */

export type GuaranteeType = 'first_night' | 'percentage' | 'fixed';

/** Champ `guarantee` renvoyé avec chaque établissement. */
export interface GuaranteeConfig {
  enabled: boolean;
  type: GuaranteeType;
  percentage: number | null;
  fixed_amount: number | null;
  /** « Garantie de réservation », ou « Paiement intégral » si l'établissement n'en propose pas */
  label: string;
  /** « 1re nuit », « 30 % du séjour », « 50 000 FCFA » */
  summary: string | null;
  description?: string;
}

export interface PaymentOptionFull {
  label: string;
  amount: number;
  original_amount: number;
  discount_percent: number;
  description: string;
}

export interface PaymentOptionGuarantee {
  label: string;
  amount: number;
  type?: GuaranteeType;
  summary?: string;
  percent_of_total?: number;
  description: string;
  balance_at_hotel: number;
}

/** `payment_options` renvoyé par l'aperçu de prix et par la réservation. */
export interface PaymentOptions {
  full_only: boolean;
  reason?: string | null;
  options: {
    full: PaymentOptionFull;
    guarantee?: PaymentOptionGuarantee;
  };
  guarantee_config?: Partial<GuaranteeConfig>;
}

export const FULL_PAYMENT_LABEL = 'Paiement intégral';
export const GUARANTEE_LABEL = 'Garantie de réservation';

/** Libellé d'un paiement selon sa nature (reçus, historiques, tableaux de bord). */
export const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  full: FULL_PAYMENT_LABEL,
  guarantee: GUARANTEE_LABEL,
  // « deposit » : ancienne valeur technique, même notion pour l'utilisateur
  deposit: GUARANTEE_LABEL,
  balance: 'Solde',
};

// ─── Paramétrage côté établissement ───────────────────────────────────────

/** Choix proposé à l'hébergeur : pas de garantie (paiement intégral), ou un des trois types. */
export type GuaranteeMode = 'none' | GuaranteeType;

export interface GuaranteeFormState {
  mode: GuaranteeMode;
  percentage: string;
  fixedAmount: string;
}

export const DEFAULT_GUARANTEE_FORM: GuaranteeFormState = { mode: 'first_night', percentage: '', fixedAmount: '' };

/** État du formulaire à partir d'un établissement existant. */
export function guaranteeFormFromAccommodation(acc: {
  deposit_required?: boolean | null;
  deposit_amount?: GuaranteeType | null;
  deposit_percentage?: number | string | null;
  deposit_fixed_amount?: number | string | null;
}): GuaranteeFormState {
  const number = (v: number | string | null | undefined) => (v == null || v === '' ? '' : String(Number(v)));
  return {
    mode: acc.deposit_required === false ? 'none' : acc.deposit_amount || 'first_night',
    percentage: number(acc.deposit_percentage),
    fixedAmount: number(acc.deposit_fixed_amount),
  };
}

/** Message d'erreur si la garantie est incomplète, sinon null. */
export function validateGuaranteeForm(state: GuaranteeFormState): string | null {
  if (state.mode === 'percentage') {
    const p = Number(state.percentage);
    if (!state.percentage || !Number.isFinite(p) || p < 1 || p > 99) {
      return 'Garantie : indiquez un pourcentage entre 1 et 99.';
    }
  }
  if (state.mode === 'fixed') {
    const a = Number(state.fixedAmount);
    if (!state.fixedAmount || !Number.isFinite(a) || a < 1) {
      return 'Garantie : indiquez le montant fixe en FCFA.';
    }
  }
  return null;
}

/** Champs envoyés à l'API (une seule valeur à la fois, les autres sont effacées). */
export function guaranteeFormToPayload(state: GuaranteeFormState) {
  const type: GuaranteeType = state.mode === 'none' ? 'first_night' : state.mode;
  return {
    deposit_required: state.mode !== 'none',
    deposit_amount: type,
    deposit_percentage: state.mode === 'percentage' ? Number(state.percentage) : null,
    deposit_fixed_amount: state.mode === 'fixed' ? Number(state.fixedAmount) : null,
  };
}
