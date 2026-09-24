'use client';

import { useEffect, useRef, useState } from 'react';
import GuestsPicker from '@/components/common/GuestsPicker';
import { differenceInDays } from 'date-fns';
import BookingStyleDateRange from './BookingStyleDateRange';

interface DateSelectorProps {
  onDatesSelected: (checkIn: Date, checkOut: Date, guests: number, children: number) => void;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  /** Total voyageurs (adultes + enfants). */
  initialGuests?: number;
  initialChildren?: number;
  minDate?: Date;
  /** Dates indisponibles (YYYY-MM-DD) pour griser dans le calendrier */
  disabledDates?: string[];
}

// Largeur minimale (px) en dessous de laquelle Dates + Voyageurs + Bouton ne tiennent
// plus confortablement sur une ligne (mesuré : ~632px dans le tunnel de réservation
// pleine largeur, ~280px dans la barre latérale de la fiche établissement).
const ROW_MIN_WIDTH = 600;

export default function DateSelector({
  onDatesSelected,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  initialChildren = 0,
  minDate = new Date(),
  disabledDates = [],
}: DateSelectorProps) {
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn || null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut || null);
  const [children, setChildren] = useState(Math.min(initialChildren, Math.max(0, initialGuests - 1)));
  const [adults, setAdults] = useState(initialGuests - Math.min(initialChildren, Math.max(0, initialGuests - 1)));
  const guests = adults + children;
  const [errors, setErrors] = useState<{ checkIn?: string; checkOut?: string }>({});

  // Mise en ligne horizontale déclenchée par la largeur RÉELLE du conteneur (via
  // ResizeObserver), pas par un seuil `md:` de Tailwind basé sur le viewport : ce
  // composant est utilisé aussi bien en pleine largeur (tunnel de réservation) que dans
  // une colonne étroite (barre latérale de la fiche établissement), et un seuil basé sur
  // le viewport écrasait le sélecteur dans ce second cas (texte tronqué, éléments
  // superposés) même sur un grand écran.
  const rowRef = useRef<HTMLDivElement>(null);
  const [isRowLayout, setIsRowLayout] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsRowLayout(width >= ROW_MIN_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      onDatesSelected(checkIn, checkOut, guests, children);
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
      <div ref={rowRef} className={`flex gap-4 ${isRowLayout ? 'flex-row items-end' : 'flex-col'}`}>
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

        <div className={`shrink-0 ${isRowLayout ? 'w-52' : ''}`}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Voyageurs
          </label>
          <GuestsPicker adults={adults} children={children} onChange={(a, c) => { setAdults(a); setChildren(c); }} />
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleSearch}
            className={`btn-primary px-6 py-3 flex items-center justify-center gap-2 rounded-xl ${isRowLayout ? 'w-auto' : 'w-full'}`}
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
