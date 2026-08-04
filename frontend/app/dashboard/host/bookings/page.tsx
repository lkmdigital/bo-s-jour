'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { Calendar, MapPin, Users, ChevronLeft, ChevronRight, List, FileText, CheckCircle, Wallet, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '@/lib/utils';

interface BookingItem {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  total_price: number;
  deposit_amount?: number;
  amount_paid?: number;
  deposit_paid_at?: string;
  accommodation: {
    id: number;
    name: string;
    city: string;
    images?: Array<{ url: string }>;
  };
  room?: { id: number; name: string | null };
  user: { id: number; name: string; email: string };
}

export default function HostBookingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [data, setData] = useState<{ week: BookingItem[]; month: BookingItem[]; two_months: BookingItem[]; history: BookingItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstMonth, setFirstMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Filtre par établissement : null = tous, sinon accommodation.id */
  const [accommodationFilter, setAccommodationFilter] = useState<number | null>(null);

  const allBookings = useMemo(() => {
    if (!data) return [];
    return [...data.week, ...data.month, ...data.two_months, ...data.history].filter(b => b.status !== 'cancelled');
  }, [data]);

  const accommodationsList = useMemo(() => {
    const seen = new Map<number, { id: number; name: string }>();
    allBookings.forEach(b => {
      if (!seen.has(b.accommodation.id)) {
        seen.set(b.accommodation.id, { id: b.accommodation.id, name: b.accommodation.name });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allBookings]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/bookings/host/overview');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const getMonthDaysGrid = (monthStart: Date) => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    const days: Date[] = [];
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  };

  const getBookingsForDay = (day: Date) => {
    return allBookings.filter(b => {
      if (accommodationFilter != null && b.accommodation.id !== accommodationFilter) return false;
      const checkIn = new Date(b.check_in);
      const checkOut = new Date(b.check_out);
      return day >= checkIn && day < checkOut;
    });
  };

  const getBookingBadgeStyle = (b: BookingItem) => {
    if (b.status === 'cancelled') return 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    if (b.payment_status === 'paid') return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
    if (b.payment_status === 'failed') return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700';
  };

  const nextMonth = () => setFirstMonth((m) => addMonths(m, 1));
  const prevMonth = () => setFirstMonth((m) => subMonths(m, 1));
  const secondMonth = addMonths(firstMonth, 1);

  const Section = ({ title, items }: { title: string; items: BookingItem[] }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">{items.length} réservation{items.length > 1 ? 's' : ''}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">Aucune réservation</p>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
              <Link href={`/dashboard/host/bookings/${b.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{b.accommodation.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(b.check_in), 'dd MMM yyyy', { locale: fr })} → {format(new Date(b.check_out), 'dd MMM yyyy', { locale: fr })}
                      <span className="ml-2 flex items-center"><Users className="w-4 h-4 mr-1" />{b.guests}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {b.accommodation.city}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="min-w-[140px]">
                      <p className="text-primary font-bold">{formatPrice(b.total_price)} FCFA</p>
                      <div className="flex flex-col items-end gap-1.5 mt-2">
                        {/* Informations de paiement */}
                        {(() => {
                          const depositAmount = b.deposit_amount || 0;
                          const amountPaid = b.amount_paid || 0;
                          const totalPrice = b.total_price || 0;
                          const remainingBalance = totalPrice - amountPaid;
                          const hasPaidDeposit = b.deposit_paid_at || (depositAmount > 0 && amountPaid >= depositAmount);
                          const depositPaidAmount = depositAmount > 0 ? Math.min(amountPaid, depositAmount) : 0;
                          
                          return (
                            <>
                              {/* Garantie de réservation */}
                              {depositAmount > 0 && (
                                <div className="flex items-center gap-1">
                                  {hasPaidDeposit ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                        Garantie: {formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  ) : depositPaidAmount > 0 ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                      <Wallet className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                        Garantie partielle: {formatPrice(depositPaidAmount)}/{formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                                      <Wallet className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                      <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                        Garantie: {formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Reste à payer */}
                              {remainingBalance > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                                    <Wallet className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                                      Reste: {formatPrice(remainingBalance)} FCFA
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Tout payé */}
                              {remainingBalance <= 0 && amountPaid > 0 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                  <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                                    Total payé
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        
                        {/* Statut de paiement */}
                        {b.payment_status && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                            b.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : b.payment_status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {b.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                            {b.payment_status === 'paid' ? 'Payé' :
                             b.payment_status === 'failed' ? 'Échec' :
                             'En attente'}
                          </span>
                        )}
                      </div>
                    </div>
                    {b.payment_status === 'paid' && (
                      <Link
                        href={`/dashboard/host/bookings/${b.id}#receipt`}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Voir le reçu de paiement"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mes réservations (hôte)</h1>
          <p className="text-gray-600 dark:text-gray-400">Vue calendrier et liste par période</p>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {data && (
          <>
            {/* Header type Booking : filtre établissement + navigation mois + vue liste/calendrier */}
            <div className="card mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Mois précédent">
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center capitalize">
                      {format(firstMonth, 'MMMM yyyy', { locale: fr })}
                    </span>
                    <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Mois suivant">
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  {accommodationsList.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <select
                        value={accommodationFilter ?? ''}
                        onChange={(e) => setAccommodationFilter(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Tous les établissements</option>
                        {accommodationsList.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowList(!showList)} className="btn-secondary text-sm inline-flex items-center gap-2 shrink-0">
                  <List className="w-4 h-4" />
                  {showList ? 'Voir calendrier' : 'Voir liste'}
                </button>
              </div>
            </div>

            {!showList ? (
              <>
                {/* Calendrier 2 mois côte à côte (style Booking) */}
                <div className="flex flex-wrap gap-6 justify-center">
                  {[firstMonth, secondMonth].map((monthStart) => (
                    <div key={monthStart.getTime()} className="card flex-1 min-w-[280px] max-w-[400px]">
                      <div className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-3 capitalize">
                        {format(monthStart, 'MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                          <div key={d} className="py-1 font-medium">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {getMonthDaysGrid(monthStart).map((day, idx) => {
                          const dayBookings = getBookingsForDay(day);
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          const isTodayDate = isToday(day);
                          return (
                            <div
                              key={idx}
                              className={`min-h-[72px] p-1 rounded border text-left ${
                                isCurrentMonth
                                  ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50'
                                  : 'border-transparent bg-gray-50 dark:bg-gray-800/30 opacity-60'
                              } ${isTodayDate ? 'ring-1 ring-primary ring-inset' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-xs font-medium ${isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {format(day, 'd')}
                                </span>
                                {dayBookings.length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                    {dayBookings.length}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-0.5">
                                {dayBookings.slice(0, 2).map((b) => (
                                  <Link
                                    key={b.id}
                                    href={`/dashboard/host/bookings/${b.id}`}
                                    className={`block text-[10px] truncate px-1.5 py-0.5 rounded border ${getBookingBadgeStyle(b)} hover:opacity-90`}
                                    title={`${b.room?.name || b.accommodation.name} • ${b.guests} voyageur(s) • ${formatPrice(b.total_price)} FCFA`}
                                  >
                                    {b.room?.name || b.accommodation.name}
                                  </Link>
                                ))}
                                {dayBookings.length > 2 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 pl-1">+{dayBookings.length - 2}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Légende */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Légende :</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700" />
                    Payé
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700" />
                    En attente
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700" />
                    Échec paiement
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded ring-1 ring-primary ring-inset" />
                    Aujourd&apos;hui
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-6 mt-6">
                <Section
                  title="Cette semaine"
                  items={accommodationFilter == null ? data.week : data.week.filter((b) => b.accommodation.id === accommodationFilter)}
                />
                <Section
                  title="Ce mois-ci"
                  items={accommodationFilter == null ? data.month : data.month.filter((b) => b.accommodation.id === accommodationFilter)}
                />
                <Section
                  title="Deux prochains mois"
                  items={accommodationFilter == null ? data.two_months : data.two_months.filter((b) => b.accommodation.id === accommodationFilter)}
                />
                <Section
                  title="Historique"
                  items={accommodationFilter == null ? data.history : data.history.filter((b) => b.accommodation.id === accommodationFilter)}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}


