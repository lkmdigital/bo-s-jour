'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Users, Send, History, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { useConfirm } from '@/components/common/ConfirmContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface SegmentPreview {
  count: number;
  sample: Array<{ id: number; name: string; email: string; city: string | null; role: string }>;
}

interface Campaign {
  id: number;
  title: string;
  body: string;
  url: string | null;
  filters: Record<string, string> | null;
  recipients_count: number;
  status: 'sent' | 'failed';
  error: string | null;
  sender: { id: number; name: string } | null;
  created_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMarketingPage() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();

  // Filtres de segment
  const [role, setRole] = useState('user');
  const [city, setCity] = useState('');
  const [travelerType, setTravelerType] = useState('all');
  const [activity, setActivity] = useState('all');
  const [registeredAfter, setRegisteredAfter] = useState('');
  const [registeredBefore, setRegisteredBefore] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  // Message
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);

  // Historique
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/marketing/cities').then((r) => setCities(r.data?.data ?? [])).catch(() => setCities([]));
  }, []);

  const loadCampaigns = () => {
    setCampaignsLoading(true);
    api.get('/admin/marketing/campaigns')
      .then((r) => setCampaigns(r.data?.data ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setCampaignsLoading(false));
  };

  useEffect(loadCampaigns, []);

  const filterParams = () => ({
    role,
    city: city || undefined,
    traveler_type: role === 'user' && travelerType !== 'all' ? travelerType : undefined,
    activity: activity !== 'all' ? activity : undefined,
    registered_after: registeredAfter || undefined,
    registered_before: registeredBefore || undefined,
  });

  useEffect(() => {
    setPreviewLoading(true);
    const t = setTimeout(() => {
      api.get('/admin/marketing/segment-preview', { params: filterParams() })
        .then((r) => setPreview(r.data))
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, city, travelerType, activity, registeredAfter, registeredBefore]);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      showError('Titre et message sont requis.');
      return;
    }
    if (!preview || preview.count === 0) {
      showError('Aucun destinataire ne correspond à ces critères.');
      return;
    }

    const ok = await confirmAction({
      title: 'Envoyer la campagne',
      message: `Cette notification push sera envoyée à ${preview.count} destinataire${preview.count > 1 ? 's' : ''}, immédiatement et irréversiblement. Confirmez-vous l'envoi ?`,
      confirmLabel: 'Envoyer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    setSending(true);
    try {
      const res = await api.post('/admin/marketing/campaigns', {
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        ...filterParams(),
      });
      showSuccess(res.data?.message || 'Campagne envoyée');
      setTitle('');
      setBody('');
      setUrl('');
      loadCampaigns();
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Commercialisation
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Campagnes de notification push segmentées par profil d&apos;utilisateur.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-400">
        Un seul canal pour l&apos;instant : notification push (via le même service déjà utilisé pour les
        confirmations de réservation). Pas de campagne e-mail depuis ce module.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filtres de segment */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" /> Segment ciblé
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm">
                  <option value="user">Voyageurs</option>
                  <option value="host">Hôtes</option>
                  <option value="all">Tous (voyageurs + hôtes)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ville</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm">
                  <option value="">Toutes les villes</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {role === 'user' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Type de voyageur</label>
                  <select value={travelerType} onChange={(e) => setTravelerType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm">
                    <option value="all">Tous</option>
                    <option value="individual">Individuel</option>
                    <option value="corporate">Entreprise</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Activité</label>
                <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm">
                  <option value="all">Tous</option>
                  <option value="never_booked">N&apos;a jamais réservé</option>
                  <option value="has_booked">A déjà réservé</option>
                  <option value="inactive_30d">Inactif depuis 30 jours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inscrit après le</label>
                <input type="date" value={registeredAfter} onChange={(e) => setRegisteredAfter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inscrit avant le</label>
                <input type="date" value={registeredBefore} onChange={(e) => setRegisteredBefore(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Message</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
                placeholder="Ex : Offres spéciales week-end !"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message <span className="text-red-500">*</span></label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={3}
                placeholder="Le contenu de la notification…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lien de destination <span className="text-gray-500">(optionnel)</span></label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://bosejour.ci/accommodations?featured=1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
            </div>
            <div className="flex justify-end">
              <button onClick={send} disabled={sending} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" /> {sending ? 'Envoi…' : 'Envoyer la campagne'}
              </button>
            </div>
          </div>
        </section>

        {/* Aperçu du segment */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Aperçu</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            {previewLoading ? (
              <LoadingSpinner />
            ) : preview ? (
              <>
                <p className="text-3xl font-bold text-primary">{preview.count}</p>
                <p className="text-xs text-gray-500 mb-4">destinataire{preview.count > 1 ? 's' : ''} correspondant{preview.count > 1 ? 's' : ''}</p>
                {preview.sample.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500">Exemples :</p>
                    {preview.sample.map((u) => (
                      <div key={u.id} className="text-xs text-gray-600 dark:text-gray-400">
                        {u.name} {u.city && <span className="text-gray-400">· {u.city}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Erreur de chargement.</p>
            )}
          </div>
        </section>
      </div>

      {/* Historique */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <History className="w-4 h-4 text-primary" /> Historique des campagnes
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {campaignsLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucune campagne envoyée pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {campaigns.map((c) => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{c.title}</p>
                      {c.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Envoyée</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> Échec</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{c.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {c.recipients_count} destinataire{c.recipients_count > 1 ? 's' : ''} · {c.sender?.name ?? 'système'} · {fmt(c.created_at)}
                    </p>
                    {c.error && <p className="text-xs text-red-500 mt-1">{c.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
