'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { formatPrice, getRoomCategoryLabel } from '@/lib/utils';
import { ArrowLeft, Building2, MapPin, Users, Mail, Phone, MessageCircle, CreditCard, History, XCircle, CheckCircle, Settings2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Payment {
  id: number;
  amount: number;
  status: string;
  purpose?: string;
  payment_method?: string;
  transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

interface HistoryEntry {
  id: number;
  from_status?: string;
  to_status?: string;
  action?: string;
  note?: string;
  created_at: string;
  user?: { name: string };
}

interface BookingDetail {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  estimated_arrival_time?: string | null;
  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: string;
  display_status_label?: string;
  display_payment_status_label?: string;
  special_requests?: string;
  booked_for_third_party?: boolean;
  traveler_name?: string;
  traveler_phone?: string;
  traveler_email?: string;
  confirmation_code?: string;
  booking_number?: string | null;
  created_at: string;
  updated_at?: string;
  user: { id: number; name: string; email: string; phone?: string };
  accommodation: {
    id: number; name: string; city: string; address?: string;
    establishment_code?: string | null;
    breakfast_included?: boolean;
    breakfast_included_persons?: number | null;
    host?: { id: number; name: string; email: string; phone?: string; whatsapp?: string };
  };
  room?: { id: number; name: string; type?: string; room_category?: string } | null;
  payments: Payment[];
  history: HistoryEntry[];
  promotion?: { id: number; promo_code?: string | null; description?: string | null; discount_percent?: number | null; discount_amount?: number | null; discount_type?: string } | null;
  loyalty_voucher?: { id: number; code: string; discount_percent: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
};

export default function AdminReservationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const confirmDialog = useConfirm();
  const { showSuccess, showError } = useToast();

  const fetchBooking = () => {
    setLoading(true);
    api
      .get(`/admin/bookings/${id}`)
      .then((res) => setBooking(res.data?.data ?? null))
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement de la réservation'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "Droits de modification ou d'annulation" (retour client 2026-09-02,
  // Partie 4.3) — l'API le permettait déjà pour un admin (PUT /bookings/{id}),
  // mais aucun bouton ne l'exposait sur cette page.
  const handleCancel = async () => {
    setActionBusy(true);
    try {
      await api.put(`/bookings/${id}`, { status: 'cancelled', reason: cancelReason.trim() || undefined });
      showSuccess('Réservation annulée.');
      setShowCancelForm(false);
      setCancelReason('');
      fetchBooking();
    } catch (err: any) {
      showError(err.response?.data?.message || "Impossible d'annuler cette réservation.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirm = async () => {
    const ok = await confirmDialog({
      title: 'Confirmer cette réservation ?',
      message: booking && !booking.amount_paid
        ? "Cette réservation n'a reçu aucun paiement. La confirmer manuellement passe outre ce contrôle."
        : 'Le voyageur et l\'hôte seront notifiés.',
      confirmLabel: 'Confirmer la réservation',
      variant: 'default',
    });
    if (!ok) return;
    setActionBusy(true);
    try {
      await api.put(`/bookings/${id}`, { status: 'confirmed' });
      showSuccess('Réservation confirmée.');
      fetchBooking();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Impossible de confirmer cette réservation.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !booking) {
    return <ErrorDisplay error={error || 'Réservation introuvable'} />;
  }

  const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
  const remaining = booking.total_price - (booking.amount_paid || 0);
  const statusConfig = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/reservations"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-bosejour-red mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux réservations
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Réservation {booking.booking_number || `#${booking.id}`}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Créée le {format(new Date(booking.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              {booking.updated_at && booking.updated_at !== booking.created_at && (
                <> · Mise à jour le {format(new Date(booking.updated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</>
              )}
              {booking.confirmation_code && <> · Code : {booking.confirmation_code}</>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusConfig.color}`}>{booking.display_status_label ?? statusConfig.label}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              Paiement : {booking.display_payment_status_label ?? booking.payment_status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Séjour</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Arrivée</p>
                <p className="font-medium text-gray-900 dark:text-white">{format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Départ</p>
                <p className="font-medium text-gray-900 dark:text-white">{format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Nuits</p>
                <p className="font-medium text-gray-900 dark:text-white">{nights}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Voyageurs</p>
                <p className="font-medium text-gray-900 dark:text-white">{booking.guests}</p>
              </div>
              {booking.estimated_arrival_time && (
                <div>
                  <p className="text-gray-400 mb-1">Arrivée prévue à</p>
                  <p className="font-medium text-gray-900 dark:text-white">{booking.estimated_arrival_time.slice(0, 5)}</p>
                </div>
              )}
            </div>
            {booking.room && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Chambre : <span className="text-gray-800 dark:text-gray-200 font-medium">{booking.room.name}</span>
                {(booking.room.room_category || booking.room.type) && (
                  <> · {getRoomCategoryLabel(booking.room.room_category || booking.room.type)}</>
                )}
              </p>
            )}
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Demandes spéciales</p>
                <p className="text-gray-800 dark:text-gray-200 text-sm">{booking.special_requests}</p>
              </div>
            )}
            {booking.booked_for_third_party && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm">
                <p className="text-gray-400 mb-1">Réservé pour un tiers</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {booking.traveler_name} {booking.traveler_phone && `· ${booking.traveler_phone}`} {booking.traveler_email && `· ${booking.traveler_email}`}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Établissement</h2>
            <Link
              href={`/dashboard/admin/accommodations/${booking.accommodation.id}`}
              className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-white hover:text-bosejour-red"
            >
              <Building2 className="w-4 h-4" />
              {booking.accommodation.name}
            </Link>
            {booking.accommodation.establishment_code && (
              <p className="text-xs font-mono text-gray-400 mt-0.5">{booking.accommodation.establishment_code}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {booking.accommodation.address ? `${booking.accommodation.address}, ` : ''}
              {booking.accommodation.city}
            </p>
            {booking.accommodation.breakfast_included && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Petit-déjeuner inclus
                {booking.accommodation.breakfast_included_persons ? ` (${booking.accommodation.breakfast_included_persons} pers.)` : ''}
              </p>
            )}
            {booking.accommodation.host && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm space-y-1">
                <p className="text-gray-400">Gérant</p>
                <p className="text-gray-800 dark:text-gray-200 font-medium">{booking.accommodation.host.name}</p>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {booking.accommodation.host.email}
                </p>
                {booking.accommodation.host.phone && (
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {booking.accommodation.host.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique
            </h2>
            {booking.history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun changement de statut enregistré</p>
            ) : (
              <ul className="space-y-3">
                {booking.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-bosejour-red/40 pl-4 py-1 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {h.action ?? 'Modification'}
                      {h.from_status && h.to_status && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal"> — {h.from_status} → {h.to_status}</span>
                      )}
                    </p>
                    {h.note && <p className="text-gray-600 dark:text-gray-300">{h.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {h.user?.name ?? 'Système'} · {format(new Date(h.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Actions
              </h2>
              <div className="flex flex-col gap-2">
                {booking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={actionBusy}
                    className="btn-outline text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirmer manuellement
                  </button>
                )}
                {!showCancelForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelForm(true)}
                    disabled={actionBusy}
                    className="text-sm inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-full border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Annuler la réservation
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Motif de l'annulation (facultatif)"
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none focus:border-bosejour-red resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={actionBusy}
                        className="flex-1 text-sm py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                      >
                        {actionBusy ? 'Annulation…' : "Confirmer l'annulation"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                        disabled={actionBusy}
                        className="text-sm py-2 px-4 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Retour
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Client
            </h2>
            <p className="font-medium text-gray-900 dark:text-white">{booking.user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
              <Mail className="w-3.5 h-3.5" /> {booking.user.email}
            </p>
            {booking.user.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {booking.user.phone}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Paiement
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Total</dt>
                <dd className="font-bold text-bosejour-red">{formatPrice(booking.total_price)} FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Acompte requis</dt>
                <dd className="text-gray-800 dark:text-gray-200">{formatPrice(booking.deposit_amount || 0)} FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Payé</dt>
                <dd className="text-gray-800 dark:text-gray-200">{formatPrice(booking.amount_paid || 0)} FCFA</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <dt className="text-gray-400">Reste à payer</dt>
                <dd className={remaining > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
                  {formatPrice(remaining)} FCFA
                </dd>
              </div>
              {(booking.promotion || booking.loyalty_voucher) && (
                <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-400">Origine de la remise</dt>
                  <dd className="text-gray-800 dark:text-gray-200 text-right">
                    {booking.promotion ? (
                      <>Promotion{booking.promotion.promo_code ? ` (${booking.promotion.promo_code})` : ''}{booking.promotion.discount_percent ? ` — -${booking.promotion.discount_percent}%` : ''}</>
                    ) : (
                      <>Bon de fidélité {booking.loyalty_voucher!.code} — -{booking.loyalty_voucher!.discount_percent}%</>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {booking.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Transactions</p>
                {booking.payments.map((p) => (
                  <div key={p.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">
                        {p.purpose ?? 'Paiement'} {p.payment_method && `(${p.payment_method})`}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPrice(p.amount)} FCFA</span>
                    </div>
                    {p.transaction_id && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Réf. : {p.transaction_id}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
