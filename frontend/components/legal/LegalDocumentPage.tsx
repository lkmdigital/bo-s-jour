'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/lib/api';
import { FileText } from 'lucide-react';

interface LegalDoc {
  slug: string;
  title: string;
  content: string;
  version: string;
  published_at: string | null;
}

export default function LegalDocumentPage({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api.get(`/legal/${slug}`)
      .then((res) => setDoc(res.data))
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <LoadingSpinner message="Chargement du document…" size="lg" />
        ) : unavailable || !doc ? (
          <div className="card text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h1 className="text-xl font-bold mb-2">Document pas encore disponible</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ce document est en cours de préparation et sera publié prochainement.
            </p>
          </div>
        ) : (
          <article>
            <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Version {doc.version}
              {doc.published_at && ` · en vigueur depuis le ${new Date(doc.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
            <div>
              {doc.content.split(/\n\n+/).map((block, i) => {
                const trimmed = block.trim();
                if (!trimmed) return null;
                // Document contractuel V2 (2026-09) : structure à deux niveaux —
                // "TITRE N — ..." (section) au-dessus de plusieurs "Article N — ...".
                const isTitre = /^TITRE\s+[IVXLCDM]+\s*—/.test(trimmed);
                const isArticle = /^Article\s+\d+\s*—/.test(trimmed);
                if (isTitre) {
                  return (
                    <h2
                      key={i}
                      className="text-sm font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 mt-10 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700"
                    >
                      {trimmed}
                    </h2>
                  );
                }
                if (isArticle) {
                  return <h3 key={i} className="text-lg font-bold mt-6 mb-3 text-primary">{trimmed}</h3>;
                }
                return (
                  <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-line">{trimmed}</p>
                );
              })}
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
