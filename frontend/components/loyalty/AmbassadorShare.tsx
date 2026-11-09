'use client';

import { useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Link2, Mail, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from '@/components/common/ToastContext';

export interface AmbassadorData {
  code: string;
  display_name: string | null;
  link: string;
  signup_points: number;
  stats: {
    clicks: number;
    signups: number;
    signups_validated: number;
    bookings: number;
    points_awarded: number;
    conversion_signup: number | null;
    conversion_booking: number | null;
  };
}

const PRINT_SIZE = 1024;

const Counter = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

const percent = (v: number | null) => (v === null ? '—' : `${v} %`);

/**
 * Espace ambassadeur : QR code (PNG haute résolution et SVG vectoriel pour l'impression), lien court à partager, compteurs en
 * direct. Le QR code encode le lien court /p/CODE — pas le lien d'inscription — pour que chaque scan soit compté.
 */
export default function AmbassadorShare({ data }: { data: AmbassadorData }) {
  const { showSuccess, showError } = useToast();
  const svgWrap = useRef<HTMLDivElement>(null);
  const pngWrap = useRef<HTMLDivElement>(null);
  const { stats } = data;

  const message = `Rejoignez boséjour et réservez votre prochain séjour en Côte d'Ivoire avec mon invitation : ${data.link}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.link);
      showSuccess("Lien d'invitation copié.");
    } catch {
      showError('Impossible de copier automatiquement : sélectionnez le lien puis copiez-le.');
    }
  };

  const save = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
  };

  const downloadPng = () => {
    const canvas = pngWrap.current?.querySelector('canvas');
    if (canvas) save(canvas.toDataURL('image/png'), `bosejour-qr-${data.code}.png`);
  };

  const downloadSvg = () => {
    const svg = svgWrap.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    save(url, `bosejour-qr-${data.code}.svg`);
    URL.revokeObjectURL(url);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'boséjour', text: message });
    } catch {
      // fermeture de la fenêtre de partage : rien à signaler
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-5" data-testid="ambassador-block">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Espace ambassadeur</p>
        <h3 className="font-bold text-gray-900 dark:text-white">{data.display_name || 'Votre réseau boséjour'}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Vous gagnez <strong>{data.signup_points} points</strong> chaque fois qu&apos;un client s&apos;inscrit avec votre QR code ou votre lien et valide son
          compte. Vos points se transforment en bons de réduction sur vos séjours.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Counter label="Visiteurs (scans et clics)" value={stats.clicks} />
        <Counter label="Inscrits" value={stats.signups_validated} hint={stats.signups > stats.signups_validated ? `${stats.signups - stats.signups_validated} à valider` : undefined} />
        <Counter label="Réservations" value={stats.bookings} />
        <Counter label="Points gagnés" value={stats.points_awarded} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Conversion : {percent(stats.conversion_signup)} des visiteurs s&apos;inscrivent, {percent(stats.conversion_booking)} des inscrits réservent.
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="rounded-xl bg-white p-3 border border-gray-200 shrink-0" ref={svgWrap}>
          <QRCodeSVG value={data.link} size={168} level="M" marginSize={2} bgColor="#ffffff" fgColor="#0F0F0F" role="img" aria-label="QR code d'invitation boséjour" />
        </div>
        {/* Version haute résolution, hors écran, uniquement pour le téléchargement PNG. */}
        <div ref={pngWrap} className="hidden" aria-hidden>
          <QRCodeCanvas value={data.link} size={PRINT_SIZE} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" />
        </div>

        <div className="min-w-0 flex-1 space-y-3 w-full">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Votre lien d&apos;invitation</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={data.link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Lien d'invitation"
                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono"
              />
              <button onClick={copyLink} className="btn-outline text-xs inline-flex items-center gap-1.5 shrink-0">
                <Copy className="w-3.5 h-3.5" /> Copier
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPng} className="btn-primary text-xs inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> QR code PNG
            </button>
            <button onClick={downloadSvg} className="btn-outline text-xs inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> QR code SVG (impression)
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs inline-flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent('Invitation boséjour')}&body=${encodeURIComponent(message)}`} className="btn-outline text-xs inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> E-mail
            </a>
            {canNativeShare && (
              <button onClick={nativeShare} className="btn-outline text-xs inline-flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Autres réseaux…
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Link2 className="w-3.5 h-3.5" /> Code : <code className="font-mono font-semibold">{data.code}</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
