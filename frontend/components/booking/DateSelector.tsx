'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import BookingStyleDateRange from './BookingStyleDateRange';

interface DateSelectorProps {
  onDatesSelected: (checkIn: Date, checkOut: Date, guests: number) => void;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  minDate?: Date;
  /** Dates indisponibles (YYYY-MM-DD) pour griser dans le calendrier */
  disabledDates?: string[];
  /**
   * Empile toujours Dates / Voyageurs / Bouton verticalement, quelle que soit la largeur
   * du viewport — nécessaire quand ce composant est intégré dans une colonne étroite (ex.
   * la barre latérale de réservation, ~380px) : le seuil `md:` de Tailwind se base sur la
   * largeur du VIEWPORT, pas sur celle du conteneur, donc la mise en ligne horizontale se
   * déclenchait quand même sur desktop et écrasait le sélecteur de dates (texte tronqué
   * lettre par lettre, boutons superposés).
   */
  compact?: boolean;
}

export default function DateSelector({
  onDatesSelected,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  minDate = new Date(),
  disabledDates = [],
  compact = false,
}: DateSelectorProps) {
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn || null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut || null);
  const [guests, setGuests] = useState(initialGuests);
  const [errors, setErrors] = useState<{ checkIn?: string; checkOut?: string }>({});

  const handleDatesChange = (newCheckIn: Date | null, newCheckOut: Date | null) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setErrors({});
  };

  const handleSearch = () => {
    const newErrors: { checkIn?: string; checkOut?: string } = {};

    if (!checkIn) {
      newErrors.checkIn = 'Veuillez sélectionner une date d\'arrivée';
    }

    if (!checkOut) {
      newErrors.checkOut = 'Veuillez sélectionner une date de départ';
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      newErrors.checkOut = 'La date de départ doit être après la date d\'arrivée';
    }

    if (guests < 1) {
      setErrors({ ...newErrors });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (checkIn && checkOut) {
      onDatesSelected(checkIn, checkOut, guests);
    }
  };

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  return (
    <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Sélectionnez vos dates</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Choisissez vos dates pour voir les chambres disponibles
        </p>
      </div>

      {/* Barre type Booking : Dates | Voyageurs | Bouton */}
      <div className={`flex flex-col gap-4 ${compact ? '' : 'md:flex-row md:items-end'}`}>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Dates du séjour
          </label>
          <BookingStyleDateRange
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={handleDatesChange}
            minDate={minDate}
            minNights={1}
            disabledDates={disabledDates}
            placeholderArrival="Ajouter des dates"
            placeholderDeparture="Ajouter des dates"
            className={errors.checkIn || errors.checkOut ? 'border-red-500' : ''}
          />
          {(errors.checkIn || errors.checkOut) && (
            <p className="text-red-500 text-xs mt-1">
              {errors.checkIn || errors.checkOut}
            </p>
          )}
        </div>

        <div className={`shrink-0 ${compact ? '' : 'md:w-32'}`}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <Users className="w-4 h-4 inline mr-1" />
            Voyageurs
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={guests}
            onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleSearch}
            className={`btn-primary px-6 py-3 flex items-center justify-center gap-2 rounded-xl ${compact ? 'w-full' : 'w-full md:w-auto'}`}
          >
            Voir les chambres
          </button>
        </div>
      </div>

      {nights > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{nights}</span> nuit{nights > 1 ? 's' : ''} sélectionnée{nights > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
