'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/common/Header';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { 
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText
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

interface Payment {
  id: number;
  amount: number;
  status: string;
  payment_method: string;
  payment_reference: string;
  transaction_id?: string;
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
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'guarantee' | ''>('');

  useEffect(() => {
    // Vérifier si on vient d'un échec de paiement
    const errorParam = searchParams?.get('error');
    if (errorParam === '1' || errorParam === 'true') {
      setPaymentError('Le paiement a échoué. Veuillez réessayer ou contacter le support si le problème persiste.');
    }

    // Charger les méthodes de paiement et la réservation même sans authentification
    fetchPaymentMethods();
    fetchBooking();
  }, [params.id, searchParams]);

  const fetchPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await api.get('/payment-methods');
      const methods = response.data || [];
      console.log('Payment methods loaded:', methods);
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].slug);
      } else {
        setError('Aucune méthode de paiement disponible. Veuillez contacter le support.');
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      // Message d'erreur simple pour l'utilisateur
      setError('Impossible de charger les méthodes de paiement. Veuillez réessayer.');
    } finally {
      setLoadingMethods(false);
    }
  };

  const fetchBooking = async () => {
    try {
      setError(null);
      const response = await api.get(`/bookings/${params.id}`);
      const bookingData = response.data;
      
      // Vérifier que c'est bien la réservation de l'utilisateur (si authentifié)
      if (isAuthenticated && user && bookingData.user_id !== user.id) {
        router.push('/bookings');
        return;
      }

      // Si déjà payé, rediriger vers la page de détails
      if (bookingData.payment_status === 'paid') {
        router.push(`/bookings/${params.id}`);
        return;
      }

      setBooking(bookingData);

      const paymentOpts = bookingData.payment_options;
      if (paymentOpts) {
        // Définir le type de paiement par défaut: 'full' si disponible, sinon 'guarantee'
        if (paymentOpts.full_only) {
          setPaymentType('full');
        } else {
          // Par défaut, sélectionner 'full' si disponible, sinon 'guarantee'
          setPaymentType('full');
        }
      }
      
      // Essayer de récupérer le paiement existant seulement si on a déjà choisi un type
      // (on ne le fait plus automatiquement)
    } catch (err: any) {
      // Message d'erreur simple pour l'utilisateur
      setError('Impossible de charger les informations de la réservation. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!booking || !selectedPaymentMethod || !paymentType) {
      setError('Veuillez sélectionner le type de paiement et la méthode de paiement');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('Initiating payment...', {
        bookingId: booking.id,
        paymentMethod: selectedPaymentMethod,
        purpose: paymentType
      });

      const response = await api.post(`/bookings/${booking.id}/payment/initiate`, {
        payment_method: selectedPaymentMethod,
        payment_type: paymentType
      });
      
      console.log('Payment initiated successfully', response.data);
      
      if (response.data.payment) {
        setPayment(response.data.payment);
      }
      
      // Si un lien est retourné, on peut l'afficher
      if (response.data.link || response.data.payment_url) {
        console.log('Payment link received:', response.data.link || response.data.payment_url);
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      console.error('Error response:', err.response);
      
      // Message d'erreur simple pour l'utilisateur (sans détails techniques)
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Une erreur est survenue lors de l\'initialisation du paiement. Veuillez réessayer.';
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async () => {
    if (!payment) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await api.post(`/payments/${payment.id}/process`, {
        payment_method: selectedPaymentMethod
      });

      // Rediriger vers le lien de paiement externe
      if (response.data.link || response.data.payment_url || response.data.redirect_url) {
        const paymentLink = response.data.link || response.data.payment_url || response.data.redirect_url;
        window.location.href = paymentLink;
      } else {
        throw new Error('Lien de paiement non disponible');
      }
    } catch (err: any) {
      // Message d'erreur simple pour l'utilisateur
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.';
      setError(errorMessage);
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
          <ErrorDisplay 
            error={error} 
            onRetry={fetchBooking}
            type="error"
          />
          <div className="text-center mt-8">
            <Link href="/bookings" className="btn-primary">
              Retour aux réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

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
      ? 'réservation moins de 48h avant l\'arrivée'
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
          description: 'Payez 100% du montant pour confirmer votre réservation immédiatement.',
        },
        guarantee: fullOnly ? undefined : {
          label: 'Garantir ma réservation (paiement de la première nuitée)',
          amount: Math.round(firstNight),
          percent_of_total: total > 0 ? Math.round((firstNight / total) * 100) : 0,
          description: 'Payez la première nuitée sur la plateforme. Le solde est payable directement à l\'hôtel à l\'arrivée.',
          balance_at_hotel: Math.max(0, Math.round(total - firstNight)),
        },
      },
    };
  })();

  const paymentOpts = booking.payment_options ?? fallbackPaymentOpts;
  const totalPrice = booking.total_price || 0;
  const amountPaid = booking.amount_paid || 0;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la réservation
          </Link>
          <h1 className="text-3xl font-bold">Paiement de la réservation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complétez votre paiement pour finaliser votre réservation
          </p>
        </div>

        {/* Message d'erreur de paiement */}
        {paymentError && (
          <div className="mb-6 card bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                  Échec du paiement
                </h3>
                <p className="text-red-700 dark:text-red-400 mb-4">
                  {paymentError}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/bookings"
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux réservations
                  </Link>
                  <button
                    onClick={() => {
                      setPaymentError(null);
                      // Nettoyer l'URL
                      router.replace(`/bookings/${booking.id}/payment`);
                    }}
                    className="btn-outline inline-flex items-center justify-center gap-2"
                  >
                    Réessayer le paiement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire de paiement */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Informations de paiement
              </h2>

              {!payment ? (
                <div className="space-y-4">
                  {/* Options de paiement : A (intégral) et B (garantie) */}
                  {!paymentOpts ? (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        Chargement des options de paiement...
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        Choisissez votre mode de paiement
                      </label>
                      {paymentOpts.full_only && paymentOpts.reason && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                          Paiement intégral obligatoire ({paymentOpts.reason})
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {/* Option A - Paiement intégral */}
                        <button
                          type="button"
                          onClick={() => setPaymentType('full')}
                          className={`p-4 border-2 rounded-lg transition-all text-left ${
                            paymentType === 'full'
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{paymentOpts.options.full.label}</p>
                              <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                {formatPrice(paymentOpts.options.full.amount)} FCFA
                                {paymentOpts.options.full.discount_percent > 0 && (
                                  <span className="text-green-600 dark:text-green-400 ml-1">
                                    (-{paymentOpts.options.full.discount_percent}%)
                                  </span>
                                )}
                              </p>
                            </div>
                            {paymentType === 'full' && (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                            {paymentOpts.options.full.description}
                          </p>
                        </button>

                        {/* Option B - Garantie de réservation */}
                        {!paymentOpts.full_only && paymentOpts.options.guarantee && (
                          <button
                            type="button"
                            onClick={() => setPaymentType('guarantee')}
                            className={`p-4 border-2 rounded-lg transition-all text-left ${
                              paymentType === 'guarantee'
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-sm">{paymentOpts.options.guarantee.label}</p>
                                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                  {formatPrice(paymentOpts.options.guarantee.amount)} FCFA
                                  {paymentOpts.options.guarantee.percent_of_total && (
                                    <span className="ml-1">
                                      ({paymentOpts.options.guarantee.percent_of_total}% du séjour)
                                    </span>
                                  )}
                                </p>
                              </div>
                              {paymentType === 'guarantee' && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                              {paymentOpts.options.guarantee.description}
                            </p>
                          </button>
                        )}
                      </div>
                      {paymentType && paymentOpts.options[paymentType as 'full' | 'guarantee'] && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            {paymentType === 'full' ? (
                              <>
                                Vous allez payer <strong>{formatPrice(paymentOpts.options.full.amount)} FCFA</strong> (paiement intégral avec {paymentOpts.options.full.discount_percent}% de réduction). Réservation confirmée immédiatement.
                              </>
                            ) : paymentOpts.options.guarantee ? (
                              <>
                                Vous allez payer <strong>{formatPrice(paymentOpts.options.guarantee.amount)} FCFA</strong> pour garantir votre réservation. Le solde de <strong>{formatPrice(paymentOpts.options.guarantee.balance_at_hotel)} FCFA</strong> sera payable à l&apos;hôtel à l&apos;arrivée.
                              </>
                            ) : null}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Choisissez votre méthode de paiement
                    </label>
                    {loadingMethods ? (
                      <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin" />
                          Chargement des méthodes de paiement...
                        </p>
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <p className="text-sm text-red-800 dark:text-red-300">
                          Aucune méthode de paiement disponible. Veuillez contacter le support.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(method.slug)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            selectedPaymentMethod === method.slug
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {method.icon && (
                              <div className="relative w-16 h-16">
                                <Image
                                  src={method.icon}
                                  alt={method.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <span className="text-sm font-medium text-center">
                              {method.name}
                            </span>
                          </div>
                        </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                            Erreur lors de l'initialisation
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                            {error}
                          </p>
                          <button
                            onClick={() => setError(null)}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={initiatePayment}
                    disabled={processing || !selectedPaymentMethod || !paymentType || !paymentOpts}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {processing ? 'Initialisation...' : 'Initialiser le paiement'}
                  </button>
                  {!paymentType && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      Veuillez sélectionner un type de paiement
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Référence de paiement
                      </span>
                      <span className="font-mono font-semibold">
                        {payment.payment_reference}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Statut
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : payment.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {payment.status === 'completed' ? 'Payé' : 
                         payment.status === 'failed' ? 'Échoué' : 
                         'En attente'}
                      </span>
                    </div>
                  </div>

                  {payment.status === 'pending' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-3">
                          Méthode de paiement
                        </label>
                        {loadingMethods ? (
                          <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                              <Clock className="w-4 h-4 animate-spin" />
                              Chargement des méthodes de paiement...
                            </p>
                          </div>
                        ) : paymentMethods.length === 0 ? (
                          <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <p className="text-sm text-red-800 dark:text-red-300">
                              Aucune méthode de paiement disponible. Veuillez contacter le support.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setSelectedPaymentMethod(method.slug)}
                              className={`p-4 border-2 rounded-lg transition-all ${
                                selectedPaymentMethod === method.slug
                                  ? 'border-primary bg-primary/10'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                {method.icon && (
                                  <div className="relative w-16 h-16">
                                    <Image
                                      src={method.icon}
                                      alt={method.name}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <span className="text-sm font-medium text-center">
                                  {method.name}
                                </span>
                              </div>
                            </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-semibold mb-1">Note importante</p>
                            <p>
                              Cette simulation traite le paiement immédiatement. 
                              Dans un environnement de production, vous seriez redirigé vers 
                              la plateforme de paiement (Stripe, PayPal, Mobile Money, etc.).
                            </p>
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                Erreur lors du traitement
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                {error}
                              </p>
                              <button
                                onClick={() => setError(null)}
                                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                              >
                                Fermer
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={processPayment}
                        disabled={processing || !selectedPaymentMethod}
                        className="w-full btn-primary disabled:opacity-50"
                      >
                        {processing ? 'Traitement du paiement...' : 'Payer maintenant'}
                      </button>
                    </>
                  )}

                  {payment.status === 'completed' && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-300">
                            Paiement effectué avec succès
                          </p>
                          {payment.transaction_id && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Transaction: {payment.transaction_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card min-w-[280px]">
              <h3 className="text-lg font-semibold mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">{booking.accommodation.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {booking.accommodation.city}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })} - {' '}
                      {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {nights} nuit{nights > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {booking.guests} {booking.guests > 1 ? 'voyageurs' : 'voyageur'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {booking.amount_paid && booking.amount_paid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Déjà payé:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatPrice(booking.amount_paid)} FCFA
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-medium flex-shrink-0">
                      {paymentType === 'guarantee' ? 'Garantie de réservation' : 'Paiement intégral'}
                    </span>
                    <span className="text-lg font-bold text-primary text-right whitespace-nowrap">
                      {paymentType === 'guarantee' && booking.payment_options?.options?.guarantee ? (
                        formatPrice(booking.payment_options.options.guarantee.amount) + ' FCFA'
                      ) : booking.payment_options?.options?.full ? (
                        formatPrice(booking.payment_options.options.full.amount) + ' FCFA'
                      ) : (
                        formatPrice(booking.total_price) + ' FCFA'
                      )}
                    </span>
                  </div>
                  {paymentType === 'guarantee' && booking.payment_options?.options?.guarantee && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p>Solde à payer à l&apos;hôtel : {formatPrice(booking.payment_options.options.guarantee.balance_at_hotel)} FCFA</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {booking.cancellation_policy && (
              <div className={`card ${booking.cancellation_policy.is_non_refundable ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
                <div className="flex items-start gap-3">
                  <FileText className={`w-5 h-5 mt-0.5 ${booking.cancellation_policy.is_non_refundable ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  <div className="text-sm">
                    <p className={`font-semibold mb-1 ${booking.cancellation_policy.is_non_refundable ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
                      {booking.cancellation_policy.is_non_refundable ? 'Non remboursable' : 'Réservation modifiable'}
                    </p>
                    <p className={booking.cancellation_policy.is_non_refundable ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}>
                      {booking.cancellation_policy.label}
                    </p>
                    {booking.cancellation_policy.modification_deadline_info && (
                      <p className="text-blue-600 dark:text-blue-400 mt-1">{booking.cancellation_policy.modification_deadline_info}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    Réservation en attente
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    Votre réservation sera confirmée une fois le paiement validé.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

