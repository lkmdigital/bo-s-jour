'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { CheckCircle, Calendar, Sparkles, Home, List, FileText, KeyRound, UserPlus } from 'lucide-react';

interface SuccessBooking {
  confirmation_code?: string;
  accommodation?: { name: string };
  user?: { email?: string; name?: string; is_guest?: boolean };
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearSearchSession } = useSearchStore();
  const { isAuthenticated } = useAuthStore();
  const bookingId = searchParams.get('id');
  const [booking, setBooking] = useState<SuccessBooking | null>(null);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  // Demande permission push 3s après la confirmation de paiement
  useNotificationPermission(bookingLoaded, 3000);

  useEffect(() => {
    if (!bookingId) {
      router.push('/bookings');
      return;
    }
    clearSearchSession();
    api.get(`/bookings/${bookingId}`)
      .then((r) => { setBooking(r.data); setBookingLoaded(true); })
      .catch(() => setBooking(null));
  }, [bookingId, router, clearSearchSession]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          {/* Animation de succès */}
          <div className="mb-8 relative">
            <div className="w-32 h-32 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-scale-in">
              <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400" />
            </div>
            <div className="absolute top-0 right-0">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
            <div className="absolute bottom-0 left-0">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse delay-300" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 text-green-600 dark:text-green-400">
            🎉 Réservation confirmée !
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Félicitations ! Votre réservation a été enregistrée avec succès.
          </p>

          {/* Code réservation à présenter au gérant */}
          {booking?.confirmation_code && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 mb-6">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4" />
                Code à présenter à votre arrivée
              </p>
              <p className="text-3xl font-mono font-bold tracking-widest text-amber-900 dark:text-amber-100">
                {booking.confirmation_code}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-3">
                Remettez ce code au gérant de {booking.accommodation?.name ?? 'l\'établissement'} pour marquer le début de votre séjour.
              </p>
            </div>
          )}

          {/* Carte de confirmation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-green-200 dark:border-green-800">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Réservation #{bookingId}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Vous recevrez un message sur la plateforme avec le code de réservation. Consultez aussi le détail de votre réservation pour le retrouver.
                </p>
              </div>
            </div>
          </div>

          {/* Créer son espace (invité non connecté) */}
          {!isAuthenticated && booking?.user?.is_guest && booking.user.email && (
            <div className="max-w-2xl mx-auto mb-8 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Activez votre espace bo séjour
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Créez un mot de passe pour retrouver cette réservation et toutes les suivantes, gérer vos avoirs et recevoir des offres.
                </p>
              </div>
              <Link
                href={`/auth/activate?email=${encodeURIComponent(booking.user.email)}${booking.user.name ? `&name=${encodeURIComponent(booking.user.name)}` : ''}`}
                className="btn-primary whitespace-nowrap"
              >
                Créer mon espace
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {bookingId && (
              <Link
                href={`/bookings/${bookingId}?payment=success#receipt`}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Voir mon reçu
              </Link>
            )}
            <Link
              href="/bookings"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <List className="w-5 h-5" />
              Voir mes réservations
            </Link>
            
            <Link
              href="/"
              className="btn-outline inline-flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Link>
          </div>


          {/* Fun message */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ✨ <em>Bon voyage ! Nous avons hâte de vous accueillir en Côte d'Ivoire.</em>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </main>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}

