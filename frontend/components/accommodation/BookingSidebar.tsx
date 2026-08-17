'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Lock, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import DateSelector from '@/components/booking/DateSelector';

export interface PaymentOptionItem {
  label: string;
  amount: number;
  original_amount?: number;
  discount_percent?: number;
  description?: string;
  percent_of_total?: number;
  balance_at_hotel?: number;
}

export interface PaymentOptionsData {
  full_only: boolean;
  reason: string | null;
  options: {
    full: PaymentOptionItem;
    guarantee?: PaymentOptionItem;
  };
}

export interface PriceQuote {
  base_price_per_night: number;
  effective_price_per_night: number;
  nights: number;
  total: number;
  rate_type: string;
  cancellation_policy_hours: number;
  payment_options?: PaymentOptionsData;
}

interface BookingSidebarProps {
  accommodationId: number;
  priceRangeMin: number;
  priceRangeMax: number;
  selectedDates: { checkIn: Date | null; checkOut: Date | null; guests: number };
  onDatesSelected: (checkIn: Date, checkOut: Date, guests: number) => void;
  priceQuote: PriceQuote | null;
  loadingQuote: boolean;
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BookingSidebar({
  accommodationId,
  priceRangeMin,
  priceRangeMax,
  selectedDates,
  onDatesSelected,
  priceQuote,
  loadingQuote,
}: BookingSidebarProps) {
  const [editingDates, setEditingDates] = useState(false);
  const hasDates = !!(selectedDates.checkIn && selectedDates.checkOut);
  const paymentOptions = hasDates ? priceQuote?.payment_options : undefined;
  const guaranteeOpt = paymentOptions?.options?.guarantee;
  const fullOpt = paymentOptions?.options?.full;

  const bookingHref = (() => {
    const params = new URLSearchParams();
    params.set('accommodation', String(accommodationId));
    if (selectedDates.checkIn) params.set('check_in', selectedDates.checkIn.toISOString().split('T')[0]);
    if (selectedDates.checkOut) params.set('check_out', selectedDates.checkOut.toISOString().split('T')[0]);
    if (selectedDates.guests) params.set('guests', String(selectedDates.guests));
    return `/bookings/new?${params.toString()}`;
  })();

  const handleDates = (checkIn: Date, checkOut: Date, guests: number) => {
    onDatesSelected(checkIn, checkOut, guests);
    setEditingDates(false);
  };

  return (
    <div className="lg:sticky lg:top-32 space-y-3">
      <div className="card !p-0 overflow-hidden">
        {editingDates ? (
          <div className="p-4">
            <DateSelector
              onDatesSelected={handleDates}
              initialCheckIn={selectedDates.checkIn || undefined}
              initialCheckOut={selectedDates.checkOut || undefined}
              initialGuests={selectedDates.guests}
            />
            <button
              type="button"
              onClick={() => setEditingDates(false)}
              className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDates(true)}
            className="w-full grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Enregistrement
              </p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">{formatDate(selectedDates.checkIn)}</p>
            </div>
            <div className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Départ
              </p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">{formatDate(selectedDates.checkOut)}</p>
            </div>
          </button>
        )}

        {!editingDates && (
          <button
            type="button"
            onClick={() => setEditingDates(true)}
            className="w-full p-3 border-b border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <p className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Voyageurs
            </p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
              {selectedDates.guests} voyageur{selectedDates.guests > 1 ? 's' : ''}
            </p>
          </button>
        )}

        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tarifs :</p>
            {hasDates && priceQuote ? (
              <p className="font-bold text-gray-900 dark:text-white">
                {formatPrice(priceQuote.total)} FCFA{' '}
                <span className="font-normal text-sm text-gray-500 dark:text-gray-400">
                  · {priceQuote.nights} nuit{priceQuote.nights > 1 ? 's' : ''}
                </span>
              </p>
            ) : (
              <p className="font-bold text-gray-900 dark:text-white">
                De {formatPrice(priceRangeMin)} à {formatPrice(priceRangeMax)} FCFA{' '}
                <span className="font-normal text-sm text-gray-500 dark:text-gray-400">/ nuit</span>
              </p>
            )}
          </div>

          {hasDates && loadingQuote && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Calcul du tarif...</p>
          )}

          {hasDates && paymentOptions && (fullOpt || guaranteeOpt) && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-1">
              {guaranteeOpt ? (
                <>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <Lock className="w-3 h-3 text-primary flex-shrink-0" /> En ligne : {formatPrice(guaranteeOpt.amount)} FCFA
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    1ère nuitée garantie — solde {formatPrice(guaranteeOpt.balance_at_hotel)} FCFA à l&apos;arrivée.
                  </p>
                </>
              ) : fullOpt ? (
                <>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <Lock className="w-3 h-3 text-primary flex-shrink-0" /> En ligne : {formatPrice(fullOpt.amount)} FCFA
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    Paiement intégral requis{paymentOptions.reason ? ` (${paymentOptions.reason})` : ''}.
                  </p>
                </>
              ) : null}
            </div>
          )}

          <Link
            href={bookingHref}
            aria-disabled={!hasDates}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!hasDates ? 'opacity-50 pointer-events-none' : ''}`}
          >
            Réserver
          </Link>
          {!hasDates && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">Sélectionnez vos dates pour réserver</p>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        Paiement sécurisé — remboursement 24h si l&apos;établissement refuse
      </p>
    </div>
  );
}
