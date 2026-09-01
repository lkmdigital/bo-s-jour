'use client';

import { useEffect } from 'react';

/**
 * Dernier filet de rattrapage : ne se déclenche que si app/layout.tsx (ou un de ses
 * providers) lève lui-même une exception — un cas très rare, mais sans ce fichier
 * Next.js retombe sur un écran blanc générique en production. Doit fournir son propre
 * <html>/<body> (remplace tout le layout racine) et rester volontairement minimal —
 * pas de Providers, pas de polices, pas de composants métier : ce sont potentiellement
 * ce qui vient de planter.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur critique (layout racine) :', error, error.digest ? `(digest: ${error.digest})` : '');
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            color: '#111111',
          }}
        >
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <span style={{ color: '#FF0000' }}>bo</span> séjour
          </h1>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Un problème est survenu. Ce n'est pas de votre faute.
          </p>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Réessayez, ou revenez un peu plus tard.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2rem', fontFamily: 'monospace' }}>
              Référence : {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '9999px',
                backgroundColor: '#FF0000',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '9999px',
                border: '1px solid #d1d5db',
                color: '#111111',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
