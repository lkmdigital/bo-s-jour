'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info,
  Trophy, MapPin, ArrowRight, Star,
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface RankedAccommodation {
  id: number;
  name: string;
  city: string;
  bookings_count: number;
  revenue: number;
  rating: number | null;
  total_reviews: number;
}

interface Alert {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  link: string;
}

interface GeographyRow {
  city: string;
  bookings_count: number;
  revenue: number;
  accommodations_count: number;
}

interface ForecastData {
  history: Array<{ month: string; revenue: number; bookings: number }>;
  forecast_next_month: { month: string; revenue: number; bookings: number };
}

const METRICS = [
  { key: 'revenue', label: 'Chiffre d\'affaires' },
  { key: 'bookings', label: 'Réservations' },
  { key: 'rating', label: 'Note moyenne' },
];

const SEVERITY_STYLE: Record<string, { icon: any; cls: string }> = {
  high: { icon: AlertTriangle, cls: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' },
  medium: { icon: AlertCircle, cls: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' },
  low: { icon: Info, cls: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' },
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

export default function AdminStrategicPage() {
  const [metric, setMetric] = useState('revenue');
  const [rankings, setRankings] = useState<{ top: RankedAccommodation[]; bottom: RankedAccommodation[] } | null>(null);
  const [rankingsLoading, setRankingsLoading] = useState(true);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [geography, setGeography] = useState<GeographyRow[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    setRankingsLoading(true);
    api.get('/admin/strategic/rankings', { params: { metric, limit: 5 } })
      .then((r) => setRankings({ top: r.data?.top ?? [], bottom: r.data?.bottom ?? [] }))
      .catch(() => setRankings({ top: [], bottom: [] }))
      .finally(() => setRankingsLoading(false));
  }, [metric]);

  useEffect(() => {
    api.get('/admin/strategic/alerts').then((r) => setAlerts(r.data?.data ?? [])).catch(() => setAlerts([])).finally(() => setAlertsLoading(false));
    api.get('/admin/strategic/geography').then((r) => setGeography(r.data?.data ?? [])).catch(() => setGeography([])).finally(() => setGeoLoading(false));
    api.get('/admin/strategic/forecast').then((r) => setForecast(r.data)).catch(() => setForecast(null)).finally(() => setForecastLoading(false));
  }, []);

  const maxGeoRevenue = Math.max(1, ...geography.map((g) => g.revenue));
  const maxForecastRevenue = forecast ? Math.max(1, ...forecast.history.map((h) => h.revenue), forecast.forecast_next_month.revenue) : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Tableau stratégique
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Vue exécutive : classements, tendance et signaux à surveiller.
        </p>
      </div>

      {/* Alertes stratégiques */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Alertes stratégiques</h2>
        {alertsLoading ? (
          <LoadingSpinner />
        ) : alerts.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-400">
            Aucun signal à surveiller pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const style = SEVERITY_STYLE[alert.severity];
              const Icon = style.icon;
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-sm hover:shadow-sm transition-shadow ${style.cls}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {alert.message}
                  </span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-400">
          Règles simples calculées à partir des données de la plateforme (conformité, délais, tendance) — pas de
          détection automatique par intelligence artificielle.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Classements */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" /> Classements
            </h2>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-xs"
            >
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>

          {rankingsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-semibold text-green-600 mb-2">Meilleurs</p>
                <div className="space-y-2">
                  {(rankings?.top ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">Pas encore de données.</p>
                  ) : (
                    rankings!.top.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 w-3">{i + 1}</span>
                          {a.name}
                        </span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {metric === 'revenue' && formatFCFA(a.revenue)}
                          {metric === 'bookings' && `${a.bookings_count} résa.`}
                          {metric === 'rating' && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {a.rating?.toFixed(1) ?? '–'}
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-semibold text-red-600 mb-2">À surveiller</p>
                <div className="space-y-2">
                  {(rankings?.bottom ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">Pas assez de données.</p>
                  ) : (
                    rankings!.bottom.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{a.name}</span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {metric === 'revenue' && formatFCFA(a.revenue)}
                          {metric === 'bookings' && `${a.bookings_count} résa.`}
                          {metric === 'rating' && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {a.rating?.toFixed(1) ?? '–'}
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Répartition géographique */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> Répartition géographique
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            {geoLoading ? (
              <LoadingSpinner />
            ) : geography.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de réservations confirmées.</p>
            ) : (
              <div className="space-y-3">
                {geography.map((g) => (
                  <div key={g.city}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{g.city}</span>
                      <span className="text-xs text-gray-500">{formatFCFA(g.revenue)} · {g.accommodations_count} étab.</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(g.revenue / maxGeoRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              Cartographie interactive (carte avec établissements géolocalisés) prévue avec le module Base
              touristique — non construite ici pour éviter de dupliquer l&apos;intégration cartographique.
            </p>
          </div>
        </section>
      </div>

      {/* Prévisions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          {(forecast?.forecast_next_month.revenue ?? 0) >= (forecast?.history[forecast.history.length - 1]?.revenue ?? 0) ? (
            <TrendingUp className="w-4 h-4 text-primary" />
          ) : (
            <TrendingDown className="w-4 h-4 text-primary" />
          )}
          Estimation de tendance
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          {forecastLoading ? (
            <LoadingSpinner />
          ) : forecast ? (
            <>
              <div className="flex items-end gap-2 h-32 mb-3">
                {forecast.history.map((h) => (
                  <div key={h.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gray-200 dark:bg-gray-700 rounded-t"
                      style={{ height: `${Math.max(4, (h.revenue / maxForecastRevenue) * 100)}%` }}
                    />
                    <span className="text-[10px] text-gray-400">{monthLabel(h.month)}</span>
                  </div>
                ))}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/60 border-2 border-dashed border-primary rounded-t"
                    style={{ height: `${Math.max(4, (forecast.forecast_next_month.revenue / maxForecastRevenue) * 100)}%` }}
                  />
                  <span className="text-[10px] font-semibold text-primary">{monthLabel(forecast.forecast_next_month.month)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimation {monthLabel(forecast.forecast_next_month.month)} : <strong>{formatFCFA(forecast.forecast_next_month.revenue)}</strong>
                {' '}({forecast.forecast_next_month.bookings} réservation{forecast.forecast_next_month.bookings !== 1 ? 's' : ''})
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Extrapolation linéaire simple sur les 6 derniers mois — une estimation de tendance, pas une
                prévision basée sur un modèle prédictif ou l&apos;IA.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Données insuffisantes pour une estimation.</p>
          )}
        </div>
      </section>
    </div>
  );
}
