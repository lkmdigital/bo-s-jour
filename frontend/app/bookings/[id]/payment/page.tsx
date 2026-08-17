'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useRetryCountdown } from '@/hooks/useRetryCountdown';
import Header from '@/components/common/Header';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Lock,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentOptionFull {
  label: string;
  amount: number;
  original_amount: number;
  discount_percent: number;
  description: string;
}

interface PaymentOptionGuarantee {
  label: string;
  amount: number;
  percent_of_total?: number;
  description: string;
  balance_at_hotel: number;
}

interface PaymentOptions {
  full_only: boolean;
  reason?: string;
  options: {
    full: PaymentOptionFull;
    guarantee?: PaymentOptionGuarantee;
  };
}

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  payment_status: string;
  user_id?: number;
  deposit_amount?: number;
  amount_paid?: number;
  payment_options?: PaymentOptions;
  cancellation_policy?: {
    is_non_refundable: boolean;
    label: string;
    hours_before_arrival: number;
    can_modify_free: boolean;
    modification_deadline_info: string | null;
  };
  accommodation: {
    id: number;
    name: string;
    city: string;
  };
}

interface PaymentMethod {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  is_active: boolean;
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const retrySecondsLeft = useRetryCountdown(retryAfter);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'guarantee' | ''>('');

  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam === '1' || errorParam === 'true') {
      setPaymentError('Le paiement a échoué ou a été annulé. Vous pouvez réessayer ci-dessous.');
    }
    fetchPaymentMethods();
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, searchParams]);

  const fetchPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await api.get('/payment-methods');
      const methods: PaymentMethod[] = response.data || [];
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].slug);
      }
    } catch (err) {
      // silencieux : géré par l'écran (aucune méthode dispo)
    } finally {
      setLoadingMethods(false);
    }
  };

  const fetchBooking = async () => {
    try {
      setError(null);
      const response = await api.get(`/bookings/${params.id}`);
      const bookingData: Booking = response.data;

      if (isAuthenticated && user && bookingData.user_id !== user.id) {
        router.push('/bookings');
        return;
      }
      if (bookingData.payment_status === 'paid') {
        router.push(`/bookings/${params.id}`);
        return;
      }

      setBooking(bookingData);
      setPaymentType('full');
    } catch (err) {
      setError('Impossible de charger les informations de la réservation. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Un seul clic : on initie le paiement (Malia Pay renvoie le lien) puis on redirige.
  const handlePay = async () => {
    if (!booking || !selectedPaymentMethod || !paymentType) {
      setError('Veuillez sélectionner un mode et un moyen de paiement.');
      return;
    }
    setProcessing(true);
    setError(null);
    setRetryAfter(null);
    try {
      const res = await api.post(`/bookings/${booking.id}/payment/initiate`, {
        payment_method: selectedPaymentMethod,
        payment_type: paymentType,
      });

      let link: string | undefined = res.data.link || res.data.payment_url;

      // Repli : si le lien n'est pas renvoyé, on le récupère via /process
      if (!link && res.data.payment?.id) {
        const proc = await api.post(`/payments/${res.data.payment.id}/process`, {
          payment_method: selectedPaymentMethod,
        });
        link = proc.data.link || proc.data.payment_url || proc.data.redirect_url;
      }

      if (link) {
        window.location.href = link; // redirection vers la passerelle
        return; // la page navigue : on garde l'état "processing"
      }
      throw new Error('Le lien de paiement est indisponible. Veuillez réessayer.');
    } catch (err: any) {
      if (err.response?.status === 429 && err.retryAfterSeconds) {
        // Message reconstruit côté client avec un décompte en direct plutôt que le texte
        // statique du backend (qui deviendrait faux dès la seconde suivante).
        setError('Trop de tentatives.');
        setRetryAfter(err.retryAfterSeconds);
      } else {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Une erreur est survenue lors du paiement. Veuillez réessayer.';
        setError(message);
      }
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement..." size="lg" />
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay error={error} onRetry={fetchBooking} type="error" />
          <div className="text-center mt-8">
            <Link href="/bookings" className="btn-primary">
              Retour aux réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const fallbackPaymentOpts: PaymentOptions = (() => {
    const safeNights = Math.max(1, nights);
    const checkInDate = new Date(booking.check_in);
    const hoursUntilCheckIn = (checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const total = booking.total_price || 0;
    const firstNight = total / safeNights;
    const isNonRefundable = booking.cancellation_policy?.is_non_refundable ?? false;
    const isLastMinute = hoursUntilCheckIn < 48;
    const isLongStay = safeNights >= 7;
    const fullOnly = isNonRefundable || isLastMinute || isLongStay;
    const reason = isLastMinute
      ? "réservation à moins de 48h de l'arrivée"
      : isLongStay
      ? `séjour long (${safeNights} nuits)`
      : isNonRefundable
      ? 'réservation non remboursable'
      : undefined;

    return {
      full_only: fullOnly,
      reason,
      options: {
        full: {
          label: 'Paiement intégral',
          amount: total,
          original_amount: total,
          discount_percent: 0,
          description: 'Payez la totalité maintenant : réservation confirmée immédiatement.',
        },
        guarantee: fullOnly
          ? undefined
          : {
              label: '1ère nuitée garantie',
              amount: Math.round(firstNight),
              percent_of_total: total > 0 ? Math.round((firstNight / total) * 100) : 0,
              description:
                "Payez la première nuitée en ligne. Le solde se règle à l'établissement à l'arrivée.",
              balance_at_hotel: Math.max(0, Math.round(total - firstNight)),
            },
      },
    };
  })();

  const paymentOpts = booking.payment_options ?? fallbackPaymentOpts;

  const activeOption =
    paymentType === 'guarantee' && paymentOpts.options.guarantee
      ? paymentOpts.options.guarantee
      : paymentOpts.options.full;
  const amountToPay = activeOption?.amount ?? booking.total_price ?? 0;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* En-tête */}
        <div className="mb-6">
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la réservation
          </Link>
          <h1 className="text-3xl font-bold">Paiement</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Réglez en toute sécurité pour confirmer votre séjour.
          </p>
        </div>

        {/* Échec de paiement (retour passerelle) */}
        {paymentError && (
          <div className="mb-6 card bg-red-50 dark:bg-red-900/20 border-2 border-primary">
            <div className="flex items-start gap-4">
              <XCircle className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">
                  Paiement non abouti
                </h3>
                <p className="text-red-700 dark:text-red-400">{paymentError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode de paiement */}
            <div className="card">
              <h2 className="text-xl font-bold mb-1">Comment souhaitez-vous payer&nbsp;?</h2>
              {paymentOpts.full_only && paymentOpts.reason && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                  Paiement intégral requis pour cette réservation ({paymentOpts.reason}).
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {/* Intégral */}
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`p-4 border-2 rounded-2xl text-left transition-all ${
                    paymentType === 'full'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{paymentOpts.options.full.label}</p>
                    {paymentType === 'full' && <CheckCircle className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                    {formatPrice(paymentOpts.options.full.amount)} FCFA
                    {paymentOpts.options.full.discount_percent > 0 && (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium ml-1">
                        -{paymentOpts.options.full.discount_percent}%
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {paymentOpts.options.full.description}
                  </p>
                </button>

                {/* Garantie 1ère nuitée */}
                {!paymentOpts.full_only && paymentOpts.options.guarantee && (
                  <button
                    type="button"
                    onClick={() => setPaymentType('guarantee')}
                    className={`p-4 border-2 rounded-2xl text-left transition-all ${
                      paymentType === 'guarantee'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{paymentOpts.options.guarantee.label}</p>
                      {paymentType === 'guarantee' && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                      {formatPrice(paymentOpts.options.guarantee.amount)} FCFA
                      {paymentOpts.options.guarantee.percent_of_total ? (
                        <span className="text-xs font-medium text-gray-500 ml-1">
                          ({paymentOpts.options.guarantee.percent_of_total}%)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {paymentOpts.options.guarantee.description}
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Moyen de paiement</h2>
              {loadingMethods ? (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  Chargement des moyens de paiement...
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  Aucun moyen de paiement disponible pour le moment. Veuillez contacter le support.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method.slug)}
                      className={`p-4 border-2 rounded-2xl transition-all flex flex-col items-center gap-2 ${
                        selectedPaymentMethod === method.slug
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      {method.icon && (
                        <div className="relative w-12 h-12">
                          <Image src={method.icon} alt={method.name} fill className="object-contain" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-center leading-tight">
                        {method.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Réassurance sécurité */}
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <Lock className="w-4 h-4 text-bosejour-grayGreen" />
                Paiement 100&nbsp;% sécurisé — vous êtes redirigé vers la passerelle bancaire.
              </div>

              {error && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                        {error}
                        {retryAfter != null && (
                          <>
                            {' '}
                            {retrySecondsLeft ? (
                              <>Réessayez dans <span className="font-semibold tabular-nums">{retrySecondsLeft}s</span>.</>
                            ) : (
                              'Vous pouvez réessayer.'
                            )}
                          </>
                        )}
                      </p>
                      <button
                        onClick={() => { setError(null); setRetryAfter(null); }}
                        className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={processing || !selectedPaymentMethod || !paymentType || !!retrySecondsLeft}
                className="w-full btn-primary mt-5 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Redirection vers le paiement...
                  </>
                ) : (
                  `Payer ${formatPrice(amountToPay)} FCFA`
                )}
              </button>
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">{booking.accommodation.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{booking.accommodation.city}</p>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })} —{' '}
                    {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
                  </p>
                  <p>{nights} nuit{nights > 1 ? 's' : ''}</p>
                  <p>
                    {booking.guests} {booking.guests > 1 ? 'voyageurs' : 'voyageur'}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {booking.amount_paid && booking.amount_paid > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Déjà payé</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatPrice(booking.amount_paid)} FCFA
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-medium">
                      {paymentType === 'guarantee' ? '1ère nuitée garantie' : 'Paiement intégral'}
                    </span>
                    <span className="text-lg font-bold text-primary text-right whitespace-nowrap">
                      {formatPrice(amountToPay)} FCFA
                    </span>
                  </div>
                  {paymentType === 'guarantee' && paymentOpts.options.guarantee && (
                    <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Solde à régler à l&apos;établissement :{' '}
                      {formatPrice(paymentOpts.options.guarantee.balance_at_hotel)} FCFA
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 1ère nuitée garantie */}
            <div className="card bg-bosejour-grayGreen/5 border border-bosejour-grayGreen/20">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-bosejour-grayGreen mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Réservation protégée</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    En cas de refus de l&apos;établissement, vous êtes intégralement remboursé sous 24h.
                  </p>
                </div>
              </div>
            </div>

            {/* Politique d'annulation */}
            {booking.cancellation_policy && (
              <div
                className={`card ${
                  booking.cancellation_policy.is_non_refundable
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className={`w-5 h-5 mt-0.5 ${
                      booking.cancellation_policy.is_non_refundable ? 'text-primary' : 'text-bosejour-grayGreen'
                    }`}
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      {booking.cancellation_policy.is_non_refundable
                        ? 'Non remboursable'
                        : 'Réservation modifiable'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{booking.cancellation_policy.label}</p>
                    {booking.cancellation_policy.modification_deadline_info && (
                      <p className="text-gray-500 mt-1">
                        {booking.cancellation_policy.modification_deadline_info}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
