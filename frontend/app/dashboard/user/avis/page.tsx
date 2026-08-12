'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Star, MapPin, MessageSquare, Loader2, CheckCircle2, X } from 'lucide-react';

interface SubmittedReview {
  id: number;
  rating: number;
  comment: string;
  host_reply?: string | null;
  created_at: string;
  accommodation: { id: number; name: string; city: string } | null;
}
interface PendingReview {
  booking_id: number;
  check_out: string;
  accommodation: { id: number; name: string; city: string } | null;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'cleanliness', label: 'Propreté' },
  { key: 'equipment', label: 'Équipements' },
  { key: 'staff', label: 'Personnel' },
  { key: 'value_for_money', label: 'Rapport qualité/prix' },
  { key: 'location', label: 'Situation géographique' },
  { key: 'comfort', label: 'Confort' },
];

function StarPicker({ value, onChange, size = 'w-6 h-6' }: { value: number; onChange: (v: number) => void; size?: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} étoiles`}>
          <Star className={`${size} transition-colors ${n <= value ? 'fill-[#F7C948] text-[#F7C948]' : 'text-gray-300 dark:text-gray-600'}`} />
        </button>
      ))}
    </div>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MemberReviewsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.reviews');
  const { isAuthenticated, isLoading } = useAuthStore();
  const [submitted, setSubmitted] = useState<SubmittedReview[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [writingFor, setWritingFor] = useState<PendingReview | null>(null);

  const load = () => {
    api.get('/me/reviews')
      .then((r) => { setSubmitted(r.data?.submitted ?? []); setPending(r.data?.pending ?? []); })
      .catch(() => { setSubmitted([]); setPending([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/avis');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos avis…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* En attente */}
        {pending.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Avis en attente</h2>
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.booking_id} className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{p.accommodation?.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4 text-primary" /> {p.accommodation?.city} · séjour terminé le {fmt(p.check_out)}</p>
                  </div>
                  <button onClick={() => setWritingFor(p)} className="btn-primary text-sm inline-flex items-center gap-2 flex-shrink-0">
                    <MessageSquare className="w-4 h-4" /> Laisser un avis
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Déposés */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Avis déposés</h2>
          {submitted.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
              <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Vous n&apos;avez pas encore déposé d&apos;avis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submitted.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{r.accommodation?.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-4 h-4 text-primary" /> {r.accommodation?.city}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="w-4 h-4 fill-[#F7C948] text-[#F7C948]" />
                      <span className="font-semibold text-sm">{r.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">{fmt(r.created_at)}</p>
                  {r.host_reply && (
                    <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg py-2 pr-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Réponse de l&apos;établissement</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{r.host_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <MemberAside />

      {writingFor && (
        <ReviewModal
          pending={writingFor}
          onClose={() => setWritingFor(null)}
          onSubmitted={() => { setWritingFor(null); load(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ pending, onClose, onSubmitted }: { pending: PendingReview; onClose: () => void; onSubmitted: () => void }) {
  const [overall, setOverall] = useState(0);
  const [cats, setCats] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCatsFilled = CATEGORIES.every((c) => (cats[c.key] ?? 0) > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!overall) { setError('Donnez une note globale.'); return; }
    if (!allCatsFilled) { setError('Notez chaque catégorie.'); return; }
    if (comment.trim().length < 10) { setError('Décrivez votre séjour en quelques mots (10 caractères minimum).'); return; }
    setSaving(true);
    try {
      await api.post('/reviews', {
        accommodation_id: pending.accommodation?.id,
        rating: overall,
        category_ratings: cats,
        comment: comment.trim(),
      });
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || "Impossible d'enregistrer votre avis.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Votre avis</h2>
            <p className="text-sm text-gray-500">{pending.accommodation?.name} · {pending.accommodation?.city}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-1.5">Note globale</p>
            <StarPicker value={overall} onChange={setOverall} size="w-7 h-7" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.key}>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{c.label}</p>
                <StarPicker value={cats[c.key] ?? 0} onChange={(v) => setCats((s) => ({ ...s, [c.key]: v }))} size="w-4 h-4" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Votre commentaire</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Racontez votre séjour…"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={saving} className="w-full btn-primary disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><CheckCircle2 className="w-4 h-4" /> Publier mon avis</>}
          </button>
        </form>
      </div>
    </div>
  );
}
