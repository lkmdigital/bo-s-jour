'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Link2, Unlink, Loader2, CheckCircle2, XCircle, Radio, Mail,
} from 'lucide-react';

interface IcalStatus {
  ical_import_url: string | null;
  ical_last_synced_at: string | null;
  ical_last_sync_status: 'success' | 'error' | null;
  ical_last_sync_error: string | null;
  ical_last_sync_events_count: number | null;
  channel_manager_interest_requested_at: string | null;
}

function fmt(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Synchronisation externe (brief Extranet Partenaire, Étape 18) : import iCal réel
 * (Booking.com, Airbnb, PMS…) + demande d'intérêt pour une future connexion API XML.
 * Réutilisé dans le configurateur guidé (juste après la création) et dans les
 * paramètres de l'établissement — le partenaire peut la passer et y revenir plus tard.
 */
export default function IcalSyncPanel({ accommodationId, onSkip }: { accommodationId: number; onSkip?: () => void }) {
  const [status, setStatus] = useState<IcalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);

  const load = () => {
    api.get(`/accommodations/${accommodationId}/ical`)
      .then((r) => { setStatus(r.data); setUrl(r.data.ical_import_url || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accommodationId]);

  const sync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError(null);
    setSyncResult(null);
    setSyncing(true);
    try {
      const isNew = !status?.ical_import_url || status.ical_import_url !== url;
      const res = isNew
        ? await api.post(`/accommodations/${accommodationId}/ical/sync`, { url })
        : await api.post(`/accommodations/${accommodationId}/ical/resync`);
      setSyncResult(`${res.data.dates_blocked} date${res.data.dates_blocked > 1 ? 's' : ''} bloquée${res.data.dates_blocked > 1 ? 's' : ''} à partir de ${res.data.events_count} événement${res.data.events_count > 1 ? 's' : ''} importé${res.data.events_count > 1 ? 's' : ''}.`);
      load();
    } catch (err: any) {
      setSyncError(err.response?.data?.message || 'La synchronisation a échoué.');
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Désactiver la synchronisation iCal ? Les dates déjà importées resteront bloquées jusqu\'à ce que vous les libériez manuellement dans le calendrier.')) return;
    await api.delete(`/accommodations/${accommodationId}/ical`);
    setUrl('');
    setSyncResult(null);
    load();
  };

  const requestChannelManager = async () => {
    setInterestBusy(true);
    try {
      const res = await api.post(`/accommodations/${accommodationId}/channel-manager/interest`);
      setStatus((s) => (s ? { ...s, channel_manager_interest_requested_at: res.data.channel_manager_interest_requested_at } : s));
    } finally {
      setInterestBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div id="synchronisation" className="card space-y-6 scroll-mt-24">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" /> Synchronisation (Channel Manager)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Facultatif — vous pouvez passer cette étape et la configurer plus tard depuis les paramètres de votre
          établissement.
        </p>
      </div>

      {/* Import iCal */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="font-medium text-gray-900 dark:text-white mb-1">Import iCal</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Collez le lien iCal exporté par Booking.com, Airbnb ou votre logiciel de gestion (PMS) : vos dates déjà
          réservées ailleurs seront automatiquement bloquées sur bo séjour.
        </p>

        <form onSubmit={sync} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            required
            placeholder="https://www.airbnb.fr/calendar/ical/12345.ics?s=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button type="submit" disabled={syncing || !url} className="btn-primary text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {status?.ical_import_url ? 'Resynchroniser' : 'Synchroniser'}
          </button>
          {status?.ical_import_url && (
            <button type="button" onClick={disconnect} className="btn-outline text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <Unlink className="w-4 h-4" /> Désactiver
            </button>
          )}
        </form>

        {syncError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{syncError}</p>}
        {syncResult && !syncError && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {syncResult}
          </p>
        )}

        {status?.ical_last_synced_at && !syncResult && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            {status.ical_last_sync_status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            Dernière synchronisation : {fmt(status.ical_last_synced_at)}
            {status.ical_last_sync_status === 'success' && status.ical_last_sync_events_count !== null && (
              <> · {status.ical_last_sync_events_count} événement{status.ical_last_sync_events_count > 1 ? 's' : ''}</>
            )}
            {status.ical_last_sync_status === 'error' && status.ical_last_sync_error && (
              <> · {status.ical_last_sync_error}</>
            )}
          </p>
        )}
      </div>

      {/* API XML */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">Connexion API XML (temps réel)</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Synchronisation bidirectionnelle avec Booking.com / Airbnb. Nécessite un partenariat direct avec ces
              plateformes — <span className="font-medium">bientôt disponible</span>.
            </p>
          </div>
          {status?.channel_manager_interest_requested_at ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" /> Intérêt enregistré
            </span>
          ) : (
            <button
              type="button"
              onClick={requestChannelManager}
              disabled={interestBusy}
              className="btn-outline text-sm inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {interestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Être informé
            </button>
          )}
        </div>
      </div>

      {onSkip && (
        <div className="flex justify-end">
          <button type="button" onClick={onSkip} className="text-sm text-gray-500 hover:underline">
            Passer cette étape
          </button>
        </div>
      )}
    </div>
  );
}
