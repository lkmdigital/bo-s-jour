'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import Header from '@/components/common/Header';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { 
  Calendar, 
  Users, 
  MapPin, 
  Bed, 
  Bath, 
  Star, 
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  FileText,
  CreditCard,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import ReviewForm from '@/components/review/ReviewForm';
import PaymentReceipt from '@/components/payment/PaymentReceipt';
import BookingMessageThread from '@/components/booking/BookingMessageThread';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingDetail {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  confirmation_code?: string | null;
  booking_number?: string | null;
  checked_in_at?: string | null;
  special_requests?: string;
  created_at: string;
  accommodation: {
    id: number;
    name: string;
    type: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    price_per_night: number;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
    rating: number;
    total_reviews: number;
    images: Array<{ url: string; is_primary: boolean }>;
  };
  room?: {
    id: number;
    name: string;
    type: string;
    capacity: number;
    price_per_night: number;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  loyalty?: {
    total_confirmed_bookings: number;
    is_best_customer: boolean;
    recommended_discount_percent: number;
  };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const confirmAction = useConfirm();
  const { showError } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Vérifier si on vient d'un paiement réussi
    const paymentSuccess = searchParams?.get('payment') === 'success';
    if (paymentSuccess) {
      setShowReceipt(true);
      // Scroll vers le reçu après chargement
      setTimeout(() => {
        document.getElementById('receipt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }

    // Rediriger les hôtes qui accèdent directement à /bookings/[id] depuis une source externe
    // vers leur page de réservations si nécessaire
    if (!isLoading && isAuthenticated && user?.role === 'host') {
      // On laisse passer pour charger la réservation, mais on vérifiera après si c'est bien leur réservation
    }

    if (isAuthenticated) {
      fetchBooking();
    }
  }, [params.id, isAuthenticated, isLoading, user, router, searchParams]);

  const fetchBooking = async () => {
    try {
      setError(null);
      const response = await api.get(`/bookings/${params.id}`);
      const bookingData = response.data;
      
      // Vérifier que l'hôte peut bien voir cette réservation
      if (user?.role === 'host') {
        // Si l'hôte essaie d'accéder à une réservation qui n'est pas pour son hébergement,
        // le backend retournera 403, donc on ne devrait pas arriver ici
        // Mais on peut ajouter une vérification supplémentaire côté frontend si nécessaire
      }
      
      setBooking(bookingData);
      
      // Vérifier si l'utilisateur a déjà laissé un avis
      if (user?.role === 'user' && bookingData.accommodation?.id) {
        try {
          const reviewsResponse = await api.get(`/accommodations/${bookingData.accommodation.id}/reviews`);
          const userReview = reviewsResponse.data.data?.find((r: any) => r.user_id === user.id);
          setHasReview(!!userReview);
        } catch (err) {
          // Ignorer l'erreur si les avis ne peuvent pas être chargés
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Erreur lors du chargement de la réservation';
      
      // Si erreur 403 (Forbidden), rediriger vers la bonne page
      if (err.response?.status === 403) {
        if (user?.role === 'host') {
          router.push('/dashboard/host/bookings');
        } else {
          router.push('/bookings');
        }
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirmAction({
      title: 'Annuler la réservation',
      message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
      confirmLabel: 'Oui, annuler',
      cancelLabel: 'Non',
      variant: 'danger',
    });
    if (!ok) return;

    setCancelling(true);
    try {
      await api.put(`/bookings/${params.id}`, {
        status: 'cancelled'
      });
      await fetchBooking(); // Rafraîchir les données
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          'Erreur lors de l\'annulation';
      showError(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const handleStatusChange = async (newStatus: 'confirmed' | 'cancelled') => {
    if (newStatus === 'confirmed') {
      const ok = await confirmAction({
        title: 'Confirmer la réservation',
        message: 'Confirmer cette réservation ?',
        confirmLabel: 'Confirmer',
        cancelLabel: 'Annuler',
      });
      if (!ok) return;
    }
    if (newStatus === 'cancelled') {
      const ok = await confirmAction({
        title: 'Refuser la réservation',
        message: 'Refuser cette réservation ?',
        confirmLabel: 'Refuser',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
    }

    setUpdating(true);
    try {
      await api.put(`/bookings/${params.id}`, {
        status: newStatus
      });
      await fetchBooking(); // Rafraîchir les données
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          'Erreur lors de la mise à jour';
      showError(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement des détails de la réservation..." size="lg" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay 
            error={error || 'Réservation non trouvée'} 
            onRetry={fetchBooking}
            type="error"
          />
          <div className="text-center mt-8">
            <Link href={user?.role === 'host' ? '/dashboard/host/bookings' : '/bookings'} className="btn-primary">
              Retour aux réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
  const primaryImage = booking.accommodation.images?.find(img => img.is_primary)?.url || 
                       booking.accommodation.images?.[0]?.url || 
                       'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

  // S'assurer que user est chargé avant de déterminer le rôle
  const isHost = !isLoading && user?.role === 'host';
  const isUser = !isLoading && user?.role === 'user';
  const statusConfig = {
    pending: {
      label: 'En attente',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: Clock,
      description: isHost ? 'Réservation en attente de confirmation' : 'Votre réservation est en attente de confirmation',
    },
    confirmed: {
      label: 'Confirmée',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: CheckCircle,
      description: isHost ? 'Réservation confirmée' : 'Votre réservation est confirmée !',
    },
    cancelled: {
      label: 'Annulée',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      icon: XCircle,
      description: isHost ? 'Réservation annulée' : 'Cette réservation a été annulée',
    },
  };

  const status = statusConfig[booking.status as keyof typeof statusConfig];
  const StatusIcon = status?.icon || Clock;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const isPast = new Date(booking.check_out) < new Date();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <Link 
            href={user?.role === 'host' ? '/dashboard/host/bookings' : '/bookings'} 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réservations
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {isHost ? 'Détails de la réservation client' : 'Détails de la réservation'}
              </h1>
              {booking.booking_number && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">N° {booking.booking_number}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{status.description}</p>
        </div>

        {/* Code à présenter au gérant (voyageur, réservation confirmée et payée) */}
        {!isHost && booking.confirmation_code && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Code à présenter à votre arrivée
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest text-amber-900 dark:text-amber-100">
              {booking.confirmation_code}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              Remettez ce code au gérant de {booking.accommodation.name} pour marquer le début de votre séjour.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte d'hébergement */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{booking.accommodation.name}</h2>
                <Link 
                  href={`/accommodations/${booking.accommodation.id}`}
                  className="text-primary hover:underline text-sm"
                >
                  Voir l'hébergement
                </Link>
              </div>

              <div className="relative h-64 rounded-lg overflow-hidden mb-4">
                <Image
                  src={primaryImage}
                  alt={booking.accommodation.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-gray-600 dark:text-gray-400">{booking.accommodation.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-gray-600 dark:text-gray-400">{booking.accommodation.max_guests} max</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-primary" />
                  <span className="text-gray-600 dark:text-gray-400">{booking.accommodation.bedrooms} chambres</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-4 h-4 text-primary" />
                  <span className="text-gray-600 dark:text-gray-400">{booking.accommodation.bathrooms} salles de bain</span>
                </div>
              </div>

              {booking.accommodation.rating > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <Star className="w-5 h-5 fill-accent text-accent" />
                  <span className="font-semibold">{booking.accommodation.rating}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ({booking.accommodation.total_reviews} avis)
                  </span>
                </div>
              )}
            </div>

            {/* Informations de réservation */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Informations de réservation</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Dates de séjour</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {format(new Date(booking.check_in), 'EEEE d MMMM yyyy', { locale: fr })} - {' '}
                      {format(new Date(booking.check_out), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {nights} nuit{nights > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Nombre de voyageurs</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {booking.guests} {booking.guests > 1 ? 'voyageurs' : 'voyageur'}
                    </p>
                  </div>
                </div>

                {booking.room && (
                  <div className="flex items-start gap-3">
                    <Bed className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="font-semibold">Chambre réservée</p>
                      <p className="text-gray-600 dark:text-gray-400">{booking.room.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Type: {booking.room.type} • Capacité: {booking.room.capacity}
                      </p>
                    </div>
                  </div>
                )}

                {booking.special_requests && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="font-semibold">Demandes spéciales</p>
                      <p className="text-gray-600 dark:text-gray-400">{booking.special_requests}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Réservation créée le {format(new Date(booking.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            {/* Fil de messages (voyageur ou hôte) */}
            {user?.id && (
              <BookingMessageThread
                bookingId={booking.id}
                currentUserId={user.id}
                accommodationName={booking.accommodation.name}
                isHost={!!isHost}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Récapitulatif de prix */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {booking.room 
                      ? `${formatPrice(booking.room.price_per_night)} FCFA × ${nights} nuit${nights > 1 ? 's' : ''}`
                      : `${formatPrice(booking.accommodation.price_per_night)} FCFA × ${nights} nuit${nights > 1 ? 's' : ''}`
                    }
                  </span>
                  <span className="font-medium">
                    {formatPrice((booking.room?.price_per_night || booking.accommodation.price_per_night) * nights)} FCFA
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(booking.total_price)} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isLoading && isHost ? (
              // Actions pour l'hôte uniquement
              booking.status === 'pending' && !isPast ? (
                <div className="card">
                  <h3 className="text-xl font-bold mb-4">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleStatusChange('confirmed')}
                      disabled={updating}
                      className="w-full btn-primary disabled:opacity-50"
                    >
                      {updating ? 'Traitement...' : 'Confirmer la réservation'}
                    </button>
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      disabled={updating}
                      className="w-full btn-outline text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {updating ? 'Traitement...' : 'Refuser la réservation'}
                    </button>
                  </div>
                </div>
              ) : booking.status === 'confirmed' && !isPast ? (
                <div className="card">
                  <h3 className="text-xl font-bold mb-4">Actions</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Cette réservation est confirmée. Vous pouvez contacter le client si nécessaire.
                  </p>
                </div>
              ) : null
            ) : !isLoading && isUser ? (
              // Actions pour le client uniquement
              <>
                {/* Statut de paiement */}
                {booking.payment_status && (
                  <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      Statut de paiement
                      {booking.payment_status === 'paid' && (
                        <Link
                          href="#receipt"
                          className="ml-auto p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Voir le reçu de paiement"
                        >
                          <FileText className="w-5 h-5" />
                        </Link>
                      )}
                    </h3>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg ${
                        booking.payment_status === 'paid'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : booking.payment_status === 'failed'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          {booking.payment_status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : booking.payment_status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          )}
                          <span className={`font-semibold ${
                            booking.payment_status === 'paid'
                              ? 'text-green-800 dark:text-green-300'
                              : booking.payment_status === 'failed'
                              ? 'text-red-800 dark:text-red-300'
                              : 'text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {booking.payment_status === 'paid' ? 'Payé' :
                             booking.payment_status === 'failed' ? 'Échec du paiement' :
                             'En attente de paiement'}
                          </span>
                        </div>
                        {booking.payment_status === 'pending' && (
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                            Veuillez effectuer le paiement pour valider votre réservation.
                          </p>
                        )}
                        {booking.payment_status === 'paid' && (
                          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                            Paiement confirmé. Votre reçu est disponible ci-dessous.
                          </p>
                        )}
                      </div>
                      
                      {booking.payment_status === 'pending' && !isPast && (
                        <Link
                          href={`/bookings/${booking.id}/payment`}
                          className="w-full btn-primary inline-flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-5 h-5" />
                          Payer maintenant
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions d'annulation */}
                {canCancel && !isPast && booking.payment_status !== 'paid' && (
                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Actions</h3>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full btn-outline text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {cancelling ? 'Annulation...' : 'Annuler la réservation'}
                    </button>
                  </div>
                )}
              </>
            ) : null}

            {/* Contact & fidélité */}
            {booking.user && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Contact</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-gray-600 dark:text-gray-400">{booking.user.email}</span>
                  </div>
                  {booking.user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-gray-600 dark:text-gray-400">{booking.user.phone}</span>
                    </div>
                  )}
                </div>

                {booking.loyalty?.is_best_customer && (
                  <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-xs text-yellow-800 dark:text-yellow-200">
                    🎉 Félicitations ! Vous faites partie des meilleurs clients de Bosejour
                    avec <strong>{booking.loyalty.total_confirmed_bookings}</strong> séjours confirmés.
                    Lors de vos échanges avec l&apos;hôte, n&apos;hésitez pas à mentionner votre statut
                    pour bénéficier d&apos;une réduction d&apos;environ{' '}
                    <strong>{booking.loyalty.recommended_discount_percent}%</strong>, selon la politique
                    de l&apos;établissement.
                  </div>
                )}
              </div>
            )}

            {/* Formulaire d'évaluation */}
            {!isLoading && isUser && isPast && booking.status === 'confirmed' && booking.payment_status === 'paid' && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Laisser un avis</h3>
                {hasReview ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-300">
                      Vous avez déjà laissé un avis pour ce séjour. Merci !
                    </p>
                  </div>
                ) : showReviewForm ? (
                  <ReviewForm
                    accommodationId={booking.accommodation.id}
                    onSuccess={() => {
                      setShowReviewForm(false);
                      setHasReview(true);
                      // Rafraîchir la page pour voir le nouvel avis
                      window.location.reload();
                    }}
                    onCancel={() => setShowReviewForm(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="w-full btn-primary"
                  >
                    Évaluer votre séjour
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reçu de paiement - pour les voyageurs */}
        {!isLoading && isUser && booking.payment_status === 'paid' && (
          <div id="receipt" className="mt-6 scroll-mt-6">
            {showReceipt && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-bold text-green-800 dark:text-green-300">
                    Paiement confirmé avec succès !
                  </h2>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Votre reçu de paiement est disponible ci-dessous. Vous pouvez l&apos;imprimer ou le télécharger.
                  Un exemplaire vient également d&apos;être envoyé par e-mail — pensez à vérifier votre boîte de réception
                  (et vos spams si vous ne le voyez pas tout de suite).
                </p>
              </div>
            )}
            <PaymentReceipt
              bookingId={booking.id}
              booking={booking}
              userRole="user"
            />
          </div>
        )}
      </main>
    </div>
  );
}

