'use client';

import { useEffect, useRef, useState } from 'react';
import { FileDown, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/components/common/ToastContext';
import { downloadPoster, renderPoster, type PosterFormat, type PosterKind } from '@/lib/ambassadorPoster';

interface Props {
  /** Lien encodé dans le QR code (le lien « scan » de l'ambassadeur). */
  qrLink: string;
  /** Nom affiché sur l'affiche (« Invitation de … »). */
  name: string;
  /** Remise de bienvenue annoncée, en %. */
  percent: number;
  /** Code de l'ambassadeur : sert à nommer les fichiers. */
  code: string;
  /** Sans aperçu (fiche admin). */
  compact?: boolean;
}

const ACTIONS: { kind: PosterKind; format: PosterFormat; label: string; primary?: boolean }[] = [
  { kind: 'pdf', format: 'a4', label: 'PDF A4', primary: true },
  { kind: 'pdf', format: 'a3', label: 'PDF A3' },
  { kind: 'png', format: 'a4', label: 'PNG haute résolution' },
];

/** Affiche prête à imprimer (chevalets, vitrines, comptoirs) aux couleurs de boséjour, avec le QR code de l'ambassadeur. */
export default function PosterDownload({ qrLink, name, percent, code, compact = false }: Props) {
  const { showError } = useToast();
  const preview = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (compact) return;
    let cancelled = false;
    renderPoster({ link: qrLink, name, percent }, 520)
      .then((canvas) => {
        const target = preview.current;
        if (cancelled || !target) return;
        target.width = canvas.width;
        target.height = canvas.height;
        target.getContext('2d')?.drawImage(canvas, 0, 0);
      })
      .catch(() => { /* l'aperçu est facultatif : les téléchargements signalent l'erreur */ });
    return () => { cancelled = true; };
  }, [qrLink, name, percent, compact]);

  const run = async (kind: PosterKind, format: PosterFormat) => {
    const key = `${kind}-${format}`;
    setBusy(key);
    try {
      await downloadPoster({ link: qrLink, name, percent }, kind, format, `affiche-bosejour-${code}`);
    } catch {
      showError("Impossible de générer l'affiche. Réessayez dans un instant.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'flex flex-col sm:flex-row gap-4 items-start'} data-testid="poster-download">
      {!compact && (
        <canvas
          ref={preview}
          className="w-36 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 aspect-[794/1123]"
          aria-label="Aperçu de l'affiche"
          role="img"
        />
      )}
      <div className="space-y-2 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Affiche prête à imprimer</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pour vos chevalets, comptoirs et vitrines : aux couleurs de boséjour, avec votre QR code. Imprimez-la en A4 ou A3 (PDF) ou utilisez l&apos;image.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => {
            const key = `${a.kind}-${a.format}`;
            const Icon = a.kind === 'pdf' ? FileDown : ImageIcon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => run(a.kind, a.format)}
                disabled={busy !== null}
                className={`${a.primary ? 'btn-primary' : 'btn-outline'} text-xs inline-flex items-center gap-1.5 disabled:opacity-60`}
              >
                {busy === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
