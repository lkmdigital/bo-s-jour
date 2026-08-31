'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { differenceInDays } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

interface BookingFormProps {
  accommodationId: number;
  pricePerNight: number;
}

interface BookingFormData {
  check_in: Date;
  check_out: Date;
  guests: number;
  special_requests?: string;
  // Champs utilisateur (si non connecté)
  name?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
}

const ID_TYPES = [
  { value: 'CNI', label: 'CNI (Carte Nationale d\'Identité)' },
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Permis', label: 'Permis de conduire' },
];

const COUNTRIES = [
  'Côte d\'Ivoire',
  'Burkina Faso',
  'Mali',
  'Sénégal',
  'Guinée',
  'Ghana',
  'Nigeria',
  'Bénin',
  'Togo',
  'Niger',
  'Autre',
];

export default function BookingForm({ accommodationId, pricePerNight }: BookingFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: {
      guests: 1,
    },
  });

  const checkIn = watch('check_in');
  const checkOut = watch('check_out');
  const guests = watch('guests') || 1;
  const idType = watch('id_type');

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const totalPrice = nights > 0 ? nights * pricePerNight : 0;

  const onSubmit = async (data: BookingFormData) => {
    setLoading(true);
    setError(null);

    try {
      const bookingData: any = {
        accommodation_id: accommodationId,
        check_in: data.check_in.toISOString().split('T')[0],
        check_out: data.check_out.toISOString().split('T')[0],
        guests: data.guests,
        special_requests: data.special_requests,
      };

      // Si l'utilisateur n'est pas connecté, ajouter les informations utilisateur
      if (!isAuthenticated) {
        bookingData.name = data.name;
        bookingData.email = data.email;
        bookingData.phone = data.phone;
        bookingData.nationality = data.nationality;
        bookingData.id_type = data.id_type;
        bookingData.id_number = data.id_number;
      }

      const response = await api.post('/bookings', bookingData);

      router.push(`/bookings/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
      {/* Informations utilisateur (si non connecté) */}
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Vos informations
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
            Remplissez vos informations pour finaliser votre réservation. Un compte sera créé automatiquement.
          </p>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Nom et prénoms <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: !isAuthenticated ? 'Nom et prénoms requis' : false })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="Ex: KOUASSI Jean"
              />
              {errors.name && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email', { 
                  required: !isAuthenticated ? 'Email requis' : false,
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email invalide'
                  }
                })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Numéro de téléphone / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phone', { required: !isAuthenticated ? 'Numéro de téléphone requis' : false })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="Ex: +225 07 12 34 56 78"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Nationalité <span className="text-red-500">*</span>
              </label>
              <select
                {...register('nationality', { required: !isAuthenticated ? 'Nationalité requise' : false })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Sélectionner une nationalité</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.nationality && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.nationality.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Type de pièce d'identité <span className="text-red-500">*</span>
              </label>
              <select
                {...register('id_type', { required: !isAuthenticated ? 'Type de pièce requis' : false })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Sélectionner un type de pièce</option>
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.id_type && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.id_type.message}</p>
              )}
            </div>

            {idType && (
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                  Numéro de la pièce d'identité <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('id_number', { required: !isAuthenticated && idType ? 'Numéro de pièce requis' : false })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ex: 123456789"
                />
                {errors.id_number && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.id_number.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Date d'arrivée</label>
        <DatePicker
          selected={checkIn}
          onChange={(date: Date | null) => setValue('check_in', date as Date)}
          minDate={new Date()}
          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          placeholderText="Sélectionner une date"
        />
        {errors.check_in && (
          <p className="text-red-500 text-xs sm:text-sm mt-1">Date d'arrivée requise</p>
        )}
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Date de départ</label>
        <DatePicker
          selected={checkOut}
          onChange={(date: Date | null) => setValue('check_out', date as Date)}
          minDate={checkIn || new Date()}
          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          placeholderText="Sélectionner une date"
        />
        {errors.check_out && (
          <p className="text-red-500 text-xs sm:text-sm mt-1">Date de départ requise</p>
        )}
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Nombre de voyageurs</label>
        <input
          type="number"
          {...register('guests', { required: true, min: 1 })}
          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          min="1"
        />
        {errors.guests && (
          <p className="text-red-500 text-xs sm:text-sm mt-1">Nombre de voyageurs requis</p>
        )}
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Demandes spéciales (optionnel)</label>
        <textarea
          {...register('special_requests')}
          rows={3}
          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
          placeholder="Avez-vous des demandes particulières ?"
        />
      </div>

      {nights > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm break-words">
            <span className="pr-2">{formatPrice(pricePerNight)} FCFA × {nights} nuit{nights > 1 ? 's' : ''}</span>
            <span className="whitespace-nowrap">{formatPrice(totalPrice)} FCFA</span>
          </div>
          <div className="flex justify-between font-bold text-sm sm:text-lg pt-2 border-t border-gray-200 dark:border-gray-700 break-words">
            <span>Total</span>
            <span className="text-primary whitespace-nowrap">{formatPrice(totalPrice)} FCFA</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm break-words">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !checkIn || !checkOut}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2 sm:py-2.5"
      >
        {loading ? 'Réservation en cours...' : 'Réserver maintenant'}
      </button>
    </form>
  );
}

