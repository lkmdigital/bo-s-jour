'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import { fr as frLocale } from 'react-day-picker/locale';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import 'react-day-picker/style.css';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Link from 'next/link';

type DayStatus = 'available' | 'occupied' | 'blocked' | 'maintenance';

interface CalendarDay {
  date: string;
  status: DayStatus;
  price_override: number | null;
  price: number;
}

interface Room {
  id: number;
  name: string;
  type: string;
  price_per_night?: number;
}

interface PricePeriod {
  id: number;
  label: string | null;
  start_date: string;
  end_date: string;
  price_per_night: number;
  is_active: boolean;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(value));

const formatCompactPrice = (value: number) =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`;

export default function RoomCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const roomId = params.roomId as string;

  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [month, setMonth] = useState(new Date());
  const [room, setRoom] = useState<Room | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<DayStatus>('blocked');

  // Périodes tarifaires (tarification saisonnière)
  const [periods, setPeriods] = useState<PricePeriod[]>([]);
  const [periodStartMonth, setPeriodStartMonth] = useState('');
  const [periodEndMonth, setPeriodEndMonth] = useState('');
  const [periodPrice, setPeriodPrice] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [periodSuccess, setPeriodSuccess] = useState<string | null>(null);

  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const maxMonthStr = `${new Date().getFullYear() + 1}-12`;

  const fetchRoom = useCallback(async () => {
    const { data } = await api.get(`/accommodations/${accommodationId}/rooms/${roomId}`);
    setRoom(data);
  }, [accommodationId, roomId]);

  const fetchCalendar = useCallback(async () => {
    const start_date = format(startOfMonth(month), 'yyyy-MM-dd');
    const end_date = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

    const { data } = await api.get(`/accommodations/${accommodationId}/rooms/${roomId}/calendar`, {
      params: { start_date, end_date },
    });

    setCalendar(data.calendar || []);
    if (data.base_price !== undefined) {
      setBasePrice(Number(data.base_price));
    }
  }, [accommodationId, roomId, month]);

  const fetchPeriods = useCallback(async () => {
    const { data } = await api.get(
      `/accommodations/${accommodationId}/rooms/${roomId}/price-periods`
    );
    setPeriods(data.periods || []);
    if (data.base_price !== undefined) {
      setBasePrice(Number(data.base_price));
    }
  }, [accommodationId, roomId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user || user.role !== 'host') {
      router.push('/auth/login');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchRoom(), fetchCalendar(), fetchPeriods()]);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur lors du chargement du calendrier');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, isAuthenticated, user, router, fetchRoom, fetchCalendar, fetchPeriods]);

  useEffect(() => {
    if (!loading) {
      fetchCalendar().catch(() => {
        setError('Impossible de rafraîchir le calendrier');
      });
    }
  }, [month]);

  const dateMap = useMemo(() => {
    const map = new Map<string, DayStatus>();
    calendar.forEach((d) => map.set(d.date, d.status));
    return map;
  }, [calendar]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    calendar.forEach((d) => {
      if (d.price !== undefined && d.price !== null) map.set(d.date, Number(d.price));
    });
    return map;
  }, [calendar]);

  const occupiedDates = useMemo(
    () => calendar.filter((d) => d.status === 'occupied').map((d) => new Date(`${d.date}T12:00:00`)),
    [calendar]
  );

  const blockedDates = useMemo(
    () => calendar.filter((d) => d.status === 'blocked').map((d) => new Date(`${d.date}T12:00:00`)),
    [calendar]
  );

  const maintenanceDates = useMemo(
    () => calendar.filter((d) => d.status === 'maintenance').map((d) => new Date(`${d.date}T12:00:00`)),
    [calendar]
  );

  // Jours dont le prix diffère du tarif de base (période tarifaire ou override)
  const customPriceDates = useMemo(
    () =>
      basePrice === null
        ? []
        : calendar
            .filter((d) => d.price !== undefined && Number(d.price) !== basePrice)
            .map((d) => new Date(`${d.date}T12:00:00`)),
    [calendar, basePrice]
  );

  const handleBulkUpdate = async () => {
    if (!startDate || !endDate) {
      setError('Veuillez renseigner la date de début et de fin');
      return;
    }

    if (endDate < startDate) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.post(`/accommodations/${accommodationId}/rooms/${roomId}/availability/bulk`, {
        start_date: startDate,
        end_date: endDate,
        status,
      });

      await fetchCalendar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour des disponibilités');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPeriod = async () => {
    setPeriodSuccess(null);

    if (!periodStartMonth || !periodEndMonth || !periodPrice) {
      setPeriodError('Veuillez renseigner le mois de début, le mois de fin et le prix');
      return;
    }

    if (periodEndMonth < periodStartMonth) {
      setPeriodError('Le mois de fin doit être après le mois de début');
      return;
    }

    const price = Number(periodPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setPeriodError('Le prix par nuit doit être un nombre positif');
      return;
    }

    // Convertir les mois en plage de dates : 1er jour du mois de début → dernier jour du mois de fin
    const start_date = `${periodStartMonth}-01`;
    const end_date = format(endOfMonth(new Date(`${periodEndMonth}-01T12:00:00`)), 'yyyy-MM-dd');

    try {
      setSavingPeriod(true);
      setPeriodError(null);

      await api.post(`/accommodations/${accommodationId}/rooms/${roomId}/price-periods`, {
        label: periodLabel || null,
        start_date,
        end_date,
        price_per_night: price,
      });

      setPeriodStartMonth('');
      setPeriodEndMonth('');
      setPeriodPrice('');
      setPeriodLabel('');
      setPeriodSuccess(
        `Tarif de ${formatPrice(price)} FCFA/nuit programmé du ${format(new Date(`${start_date}T12:00:00`), 'dd/MM/yyyy')} au ${format(new Date(`${end_date}T12:00:00`), 'dd/MM/yyyy')}. Il sera appliqué automatiquement aux réservations sur ces dates.`
      );

      await Promise.all([fetchPeriods(), fetchCalendar()]);
    } catch (err: any) {
      setPeriodError(
        err.response?.data?.message || 'Erreur lors de la création de la période tarifaire'
      );
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleTogglePeriod = async (period: PricePeriod) => {
    try {
      setPeriodError(null);
      await api.put(
        `/accommodations/${accommodationId}/rooms/${roomId}/price-periods/${period.id}`,
        { is_active: !period.is_active }
      );
      await Promise.all([fetchPeriods(), fetchCalendar()]);
    } catch (err: any) {
      setPeriodError(err.response?.data?.message || 'Erreur lors de la mise à jour de la période');
    }
  };

  const handleDeletePeriod = async (period: PricePeriod) => {
    if (!window.confirm('Supprimer cette période tarifaire ? Le tarif de base sera de nouveau appliqué sur ces dates.')) {
      return;
    }

    try {
      setPeriodError(null);
      await api.delete(
        `/accommodations/${accommodationId}/rooms/${roomId}/price-periods/${period.id}`
      );
      await Promise.all([fetchPeriods(), fetchCalendar()]);
    } catch (err: any) {
      setPeriodError(err.response?.data?.message || 'Erreur lors de la suppression de la période');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-4 py-12">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <Link
            href={`/dashboard/host/accommodations/${accommodationId}/rooms`}
            className="text-primary hover:underline"
          >
            ← Retour aux chambres
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Calendrier et tarifs de chambre</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {room?.name || 'Chambre'} — {room?.type || ''}
            {basePrice !== null && (
              <span> • Tarif de base : {formatPrice(basePrice)} FCFA/nuit</span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="card p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tarifs par période</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Programmez vos prix par mois pour l&apos;année en cours ou l&apos;année suivante
              (ex: 60 000 FCFA/nuit à partir de septembre). Le nouveau tarif est appliqué
              automatiquement aux réservations couvrant ces dates.
            </p>
          </div>

          {periodError && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {periodError}
            </div>
          )}

          {periodSuccess && (
            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm">
              {periodSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Du mois de
              </label>
              <input
                type="month"
                value={periodStartMonth}
                min={currentMonthStr}
                max={maxMonthStr}
                onChange={(e) => setPeriodStartMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Au mois de (inclus)
              </label>
              <input
                type="month"
                value={periodEndMonth}
                min={periodStartMonth || currentMonthStr}
                max={maxMonthStr}
                onChange={(e) => setPeriodEndMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Prix par nuit (FCFA)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                placeholder="60000"
                value={periodPrice}
                onChange={(e) => setPeriodPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Libellé (optionnel)
              </label>
              <input
                type="text"
                placeholder="Haute saison"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddPeriod}
                disabled={savingPeriod}
                className="btn-primary w-full disabled:opacity-50"
              >
                {savingPeriod ? 'Enregistrement...' : 'Programmer'}
              </button>
            </div>
          </div>

          {periods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4">Période</th>
                    <th className="py-2 pr-4">Libellé</th>
                    <th className="py-2 pr-4">Prix / nuit</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr
                      key={period.id}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {format(new Date(period.start_date), 'dd/MM/yyyy')} →{' '}
                        {format(new Date(period.end_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-2 pr-4">{period.label || '—'}</td>
                      <td className="py-2 pr-4 font-semibold whitespace-nowrap">
                        {formatPrice(Number(period.price_per_night))} FCFA
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            period.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {period.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePeriod(period)}
                          className="text-primary hover:underline mr-3"
                        >
                          {period.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleDeletePeriod(period)}
                          className="text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucune période tarifaire programmée. Le tarif de base s&apos;applique toute l&apos;année.
            </p>
          )}
        </div>

        <div className="card p-4 space-y-4">
          <h2 className="text-lg font-semibold">Bloquer / débloquer une période</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DayStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="blocked">Bloqué</option>
              <option value="available">Disponible</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Mise à jour...' : 'Appliquer'}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Astuce: sélectionnez un jour dans le calendrier pour préremplir la plage.
          </p>
        </div>

        <div className="card p-4">
          <style>{`
            .rdp-day_blocked .rdp-day_button { background: #ef4444; color: white; }
            .rdp-day_occupied .rdp-day_button { background: #f59e0b; color: white; }
            .rdp-day_maintenance .rdp-day_button { background: #6b7280; color: white; }
            .rdp-day_custom_price .rdp-day_button { box-shadow: inset 0 0 0 2px #3b82f6; border-radius: 8px; }
            .rdp-day_button { height: auto; min-height: 2.75rem; }
          `}</style>

          <DayPicker
            mode="single"
            locale={frLocale}
            month={month}
            onMonthChange={setMonth}
            showOutsideDays={false}
            modifiers={{
              blocked: blockedDates,
              occupied: occupiedDates,
              maintenance: maintenanceDates,
              customPrice: customPriceDates,
            }}
            modifiersClassNames={{
              blocked: 'rdp-day_blocked',
              occupied: 'rdp-day_occupied',
              maintenance: 'rdp-day_maintenance',
              customPrice: 'rdp-day_custom_price',
            }}
            components={{
              DayButton: (props) => {
                const { day, modifiers, ...buttonProps } = props;
                const dateStr = format(day.date, 'yyyy-MM-dd');
                const price = priceMap.get(dateStr);
                return (
                  <button {...buttonProps}>
                    <span className="flex flex-col items-center leading-tight">
                      <span>{day.date.getDate()}</span>
                      {price !== undefined && (
                        <span className="text-[9px] opacity-75">
                          {formatCompactPrice(price)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              },
            }}
            onDayClick={(day) => {
              const selected = format(day, 'yyyy-MM-dd');
              setStartDate(selected);
              setEndDate(selected);
              const currentStatus = dateMap.get(selected);
              if (currentStatus && currentStatus !== 'occupied') {
                setStatus(currentStatus);
              }
            }}
          />

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500" /> Bloqué</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500" /> Occupé (réservation)</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-500" /> Maintenance</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Disponible</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded border-2 border-blue-500" /> Tarif spécifique (période)</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
