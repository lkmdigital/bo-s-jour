'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Scale, CheckCircle2, Circle } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface LegalDoc {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  version: string;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
}

const SLUGS = ['cgv', 'cgu', 'confidentialite'] as const;
const LABELS: Record<string, string> = {
  cgv: 'Conditions générales de vente',
  cgu: "Conditions générales d'utilisation",
  confidentialite: 'Politique de confidentialité',
};

export default function AdminJuridiquePage() {
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();
  const [docs, setDocs] = useState<Record<string, LegalDoc>>({});
  const [activeSlug, setActiveSlug] = useState<string>(SLUGS.includes(searchParams?.get('doc') as any) ? (searchParams!.get('doc') as string) : 'cgv');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Champs édités pour le document actif
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isPublished, setIsPublished] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/legal-documents')
      .then((res) => {
        const map: Record<string, LegalDoc> = {};
        (res.data?.data ?? []).forEach((d: LegalDoc) => { map[d.slug] = d; });
        setDocs(map);
      })
      .catch(() => showError('Erreur lors du chargement des documents'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const doc = docs[activeSlug];
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content || '');
      setVersion(doc.version);
      setIsPublished(doc.is_published);
    }
  }, [activeSlug, docs]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/admin/legal-documents/${activeSlug}`, {
        title,
        content,
        version,
        is_published: isPublished,
      });
      setDocs((prev) => ({ ...prev, [activeSlug]: res.data.data }));
      showSuccess('Document enregistré');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" /> Juridique
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Documents légaux de la plateforme et leur statut de publication.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {SLUGS.map((slug) => (
              <button
                key={slug}
                onClick={() => setActiveSlug(slug)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                  activeSlug === slug
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {docs[slug]?.is_published ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-300" />
                )}
                {LABELS[slug]}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titre</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contenu</label>
              <textarea
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez ou collez le texte du document…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setIsPublished((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${isPublished ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                Publié (visible des visiteurs)
              </label>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            {docs[activeSlug]?.published_at && (
              <p className="text-xs text-gray-400">
                Publié le {new Date(docs[activeSlug].published_at as string).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
