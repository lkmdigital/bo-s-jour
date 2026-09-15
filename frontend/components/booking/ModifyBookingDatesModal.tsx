'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import BookingStyleDateRange from './BookingStyleDateRange';
import api from '@/lib/api';
import { toDateInputValue } from '@/lib/utils';

interface ModifyBookingDatesModalProps {
  open: boolean;
  bookingId: number;
  currentCheckIn: string;
  currentCheckOut: string;
  onClose: () => void;
  onUpdated: () => void;
}

// Retour client 2026-09-15 : "modifier la date sur une reservation (via le
// tunel de reservation aussi)" — réutilise le même calendrier
// (BookingStyleDateRange) que le tunnel de réservation/la fiche
// établissement, plutôt qu'un simple champ de saisie. La modification des
// nuitées n'est pas un champ séparé : elle découle des dates (voir
// Booking — aucune colonne "nights", toujours calculée), donc changer les
// dates ici change aussi le nombre de nuits.
export default function ModifyBookingDatesModal({
  open,
  bookingId,
  currentCheckIn,
  currentCheckOut,
  onClose,
  onUpdated,
}: ModifyBookingDatesModalProps) {
  const [checkIn, setCheckIn] = useState<Date | null>(new Date(currentCheckIn));
  const [checkOut, setCheckOut] = useState<Date | null>(new Date(currentCheckOut));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const hasChanged =
    !!checkIn && !!checkOut &&
    (toDateInputValue(checkIn) !== currentCheckIn.slice(0, 10) || toDateInputValue(checkOut) !== currentCheckOut.slice(0, 10));

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!checkIn || !checkOut || !hasChanged) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/bookings/${bookingId}`, {
        check_in: toDateInputValue(checkIn),
        check_out: toDateInputValue(checkOut),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la modification des dates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" /> Modifier les dates
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <BookingStyleDateRange
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); setError(null); }}
          minDate={new Date()}
          minNights={1}
          placeholderArrival="Nouvelle arrivée"
          placeholderDeparture="Nouveau départ"
        />

        {nights > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            <span className="font-semibold">{nights}</span> nuit{nights > 1 ? 's' : ''}
            {hasChanged && ' — le montant total sera ajusté en conséquence.'}
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Modification gratuite possible jusqu&apos;à 48h avant l&apos;arrivée, sous réserve de disponibilité pour les
          nouvelles dates.
        </p>

        <div className="flex gap-2 mt-5 justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="btn-secondary text-sm">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !hasChanged}
            className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Enregistrement...' : 'Confirmer les nouvelles dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
