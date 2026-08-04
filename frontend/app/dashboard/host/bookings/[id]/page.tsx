'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
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
  User as UserIcon,
  KeyRound,
  LogIn
} from 'lucide-react';
import PaymentReceipt from '@/components/payment/PaymentReceipt';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingDetail {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  confirmation_code?: string | null;
  checked_in_at?: string | null;
  expires_at?: string;
  deposit_paid_at?: string;
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

export default function HostBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const confirmAction = useConfirm();
  const { showError } = useToast();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user?.role === 'host') {
      fetchBooking();
    }
  }, [params.id, isAuthenticated, isLoading, user, router]);

  const fetchBooking = async () => {
    try {
      setError(null);
      const response = await api.get(`/bookings/${params.id}`);
      const bookingData = response.data;
      
      // Vérifier que l'hôte peut bien voir cette réservation
      // Le backend devrait déjà gérer cela, mais on vérifie quand même
      setBooking(bookingData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Erreur lors du chargement de la réservation';
      
      // Si erreur 403 (Forbidden), rediriger vers la liste des réservations
      if (err.response?.status === 403) {
        router.push('/dashboard/host/bookings');
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = checkInCode.trim().toUpperCase();
    if (!trimmed) return;
    setCheckInLoading(true);
    setCheckInMessage(null);
    try {
      await api.post('/host/check-in', { confirmation_code: trimmed });
      setCheckInMessage({ type: 'success', text: 'Arrivée enregistrée. Le séjour a démarré.' });
      setCheckInCode('');
      await fetchBooking();
    } catch (err: any) {
      setCheckInMessage({
        type: 'error',
        text: err.response?.data?.message ?? 'Code invalide ou réservation déjà enregistrée.',
      });
    } finally {
      setCheckInLoading(false);
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
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement des détails de la réservation..." size="lg" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay 
            error={error || 'Réservation non trouvée'} 
            onRetry={fetchBooking}
            type="error"
          />
          <div className="text-center mt-8">
            <Link href="/dashboard/host/bookings" className="btn-primary">
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

  const statusConfig = {
    pending: {
      label: 'En attente',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: Clock,
      description: 'Réservation en attente de confirmation',
    },
    confirmed: {
      label: 'Confirmée',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: CheckCircle,
      description: 'Réservation confirmée',
    },
    cancelled: {
      label: 'Annulée',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      icon: XCircle,
      description: 'Réservation annulée',
    },
  };

  const status = statusConfig[booking.status as keyof typeof statusConfig];
  const StatusIcon = status?.icon || Clock;
  const isPast = new Date(booking.check_out) < new Date();

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <Link 
            href="/dashboard/host/bookings" 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réservations
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              Détails de la réservation
            </h1>
            <div className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{status.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations du client */}
            {booking.user && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Informations du client</h2>
                  </div>
                  {booking.loyalty?.is_best_customer && (
                    <div className="px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                        Meilleur client ({booking.loyalty.total_confirmed_bookings} séjours)
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nom complet</p>
                    <p className="font-semibold text-lg">{booking.user.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="text-gray-700 dark:text-gray-300">{booking.user.email}</span>
                  </div>
                  {booking.user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      <span className="text-gray-700 dark:text-gray-300">{booking.user.phone}</span>
                    </div>
                  )}
                  {booking.loyalty?.is_best_customer && (
                    <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-200">
                      Ce client a déjà réalisé <strong>{booking.loyalty.total_confirmed_bookings}</strong> réservation(s) confirmée(s) sur Bosejour.
                      Il est recommandé d&apos;appliquer une réduction d&apos;environ{' '}
                      <strong>{booking.loyalty.recommended_discount_percent}%</strong> sur ce séjour
                      (à ajuster selon vos politiques internes).
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* État du paiement */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                État du paiement
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
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Statut</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : booking.payment_status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {booking.payment_status === 'paid' ? 'Payé' : 
                       booking.payment_status === 'failed' ? 'Échec' : 
                       booking.payment_status === 'refunded' ? 'Remboursé' : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Garantie de réservation</span>
                    <span className="font-medium">{formatPrice(booking.deposit_amount || 0)} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Montant payé</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatPrice(booking.amount_paid || 0)} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Reste à payer</span>
                    <span className={`font-medium ${
                      (booking.total_price - (booking.amount_paid || 0)) > 0
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {formatPrice(booking.total_price - (booking.amount_paid || 0))} FCFA
                    </span>
                  </div>
                </div>

                {booking.deposit_paid_at && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Garantie payée le {format(new Date(booking.deposit_paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                )}

                {booking.expires_at && booking.payment_status !== 'paid' && (
                  <div className={`pt-3 border-t border-gray-200 dark:border-gray-700 ${
                    new Date(booking.expires_at) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    <p className="text-xs">
                      {new Date(booking.expires_at) < new Date() ? 'Expirée le ' : 'Expire le '}
                      {format(new Date(booking.expires_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {booking.status === 'pending' && !isPast ? (
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
              <>
                {/* Enregistrer l'arrivée (code communiqué par le client) */}
                {booking.payment_status === 'paid' && !booking.checked_in_at && (
                  <div className="card border-2 border-primary/20">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <LogIn className="w-5 h-5 text-primary" />
                      Marquer le début du séjour
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Le client vous communique son code réservation : saisissez-le ci-dessous pour enregistrer son arrivée et débloquer le reversement.
                    </p>
                    <form onSubmit={handleCheckIn} className="space-y-2">
                      <label htmlFor="checkin-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Code réservation
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          id="checkin-code"
                          type="text"
                          value={checkInCode}
                          onChange={(e) => setCheckInCode(e.target.value.toUpperCase().slice(0, 8))}
                          placeholder="Ex: A1B2C3D4"
                          maxLength={8}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono uppercase text-lg"
                        />
                        <button
                          type="submit"
                          disabled={checkInLoading || !checkInCode.trim()}
                          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <KeyRound className="w-4 h-4" />
                          {checkInLoading ? 'Enregistrement...' : 'Valider l\'arrivée'}
                        </button>
                      </div>
                      {checkInMessage && (
                        <p className={`text-sm ${checkInMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {checkInMessage.text}
                        </p>
                      )}
                    </form>
                  </div>
                )}
                {booking.checked_in_at && (
                  <div className="card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-800 dark:text-green-200">
                      <CheckCircle className="w-5 h-5" />
                      Début de séjour enregistré
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Le {format(new Date(booking.checked_in_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                )}
                {booking.payment_status !== 'paid' && (
                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Réservation confirmée</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Cette réservation est confirmée. Paiement en attente.
                    </p>
                  </div>
                )}
              </>
            ) : isPast ? (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Séjour terminé</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Cette réservation est terminée.
                </p>
              </div>
            ) : null}

            {/* Contact client */}
            {booking.user && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Contact client</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Email</p>
                    <a 
                      href={`mailto:${booking.user.email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {booking.user.email}
                    </a>
                  </div>
                  {booking.user.phone && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Téléphone</p>
                      <a 
                        href={`tel:${booking.user.phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        {booking.user.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reçu de paiement - pour les hôtes */}
        {booking.payment_status === 'paid' && (
          <div id="receipt" className="mt-6 scroll-mt-6">
            <PaymentReceipt
              bookingId={booking.id}
              booking={booking}
              userRole="host"
            />
          </div>
        )}
      </main>
    </div>
  );
}

