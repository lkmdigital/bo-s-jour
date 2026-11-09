'use client';

import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from '@/components/common/ToastContext';

interface Props {
  code: string;
  /** Lien d'inscription qui préremplit le code (fourni par l'API) : c'est aussi ce que le QR code encode. */
  link: string | null;
  bonusParrain: number;
  bonusFilleul: number;
}

const points = (n: number) => `${n} point${n > 1 ? 's' : ''}`;

/**
 * Parrainage : le membre partage son code de trois façons — le code lui-même, un lien d'inscription et un QR code.
 * Les montants affichés viennent de l'administration : le texte ne dit jamais autre chose que ce qui sera crédité.
 */
export default function ReferralShare({ code, link, bonusParrain, bonusFilleul }: Props) {
  const { showSuccess, showError } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const message = link
    ? `Rejoins-moi sur boséjour ! Inscris-toi avec mon code de parrainage ${code} et gagne ${points(bonusFilleul)} après ton premier séjour : ${link}`
    : `Rejoins-moi sur boséjour ! Inscris-toi avec mon code de parrainage ${code}.`;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(done);
    } catch {
      showError("Impossible de copier automatiquement : sélectionnez le texte puis copiez-le.");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'boséjour', text: message });
    } catch {
      // fermeture de la fenêtre de partage par la personne : rien à signaler
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `bosejour-parrainage-${code}.png`;
    a.click();
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div>
        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Parrainez vos proches</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Quand la personne que vous invitez s&apos;inscrit avec votre code et termine son premier séjour, vous gagnez{' '}
          <strong>{points(bonusParrain)}</strong> et elle gagne <strong>{points(bonusFilleul)}</strong>.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Votre code</p>
        <div className="flex items-center gap-2">
          <code className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono font-semibold tracking-wider">
            {code}
          </code>
          <button onClick={() => copy(code, 'Code de parrainage copié.')} className="btn-outline text-xs inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Copier
          </button>
        </div>
      </div>

      {link && (
        <>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Votre lien d&apos;invitation</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Lien d'invitation"
                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300"
              />
              <button onClick={() => copy(link, "Lien d'invitation copié.")} className="btn-outline text-xs inline-flex items-center gap-1.5 shrink-0">
                <Link2 className="w-3.5 h-3.5" /> Copier le lien
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Envoyer par WhatsApp
            </a>
            {canNativeShare && (
              <button onClick={nativeShare} className="btn-outline text-xs inline-flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Partager…
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div ref={qrRef} className="rounded-xl bg-white p-2 border border-gray-200 shrink-0" aria-label="QR code d'invitation" role="img">
              <QRCodeCanvas value={link} size={132} level="M" marginSize={1} bgColor="#ffffff" fgColor="#0F0F0F" />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <p>Faites scanner ce QR code : il ouvre directement l&apos;inscription avec votre code déjà rempli.</p>
              <button onClick={downloadQr} className="btn-outline text-xs inline-flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Télécharger le QR code
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
