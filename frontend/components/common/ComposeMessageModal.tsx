'use client';

import { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface ComposeMessageModalProps {
  open: boolean;
  title: string;
  recipientLabel: string;
  placeholder?: string;
  onSend: (body: string) => Promise<void>;
  onClose: () => void;
}

// Modal de composition générique — retour client 2026-09-15 : réutilisée pour
// "Contacter l'établissement" (fiche hébergement) et pour la messagerie
// membre à membre (compte entreprise), qui envoient toutes deux un nouveau
// fil de conversation vers un destinataire déjà déterminé par l'appelant.
export default function ComposeMessageModal({
  open,
  title,
  recipientLabel,
  placeholder,
  onSend,
  onClose,
}: ComposeMessageModalProps) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body.trim());
      setSent(true);
      setBody('');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    setBody('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-message-title"
    >
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="compose-message-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{recipientLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-gray-900 dark:text-white font-medium">Message envoyé</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">La réponse arrivera dans votre boîte de réception.</p>
            <button type="button" onClick={handleClose} className="btn-primary mt-4">
              Fermer
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={placeholder || 'Écrivez votre message...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              autoFocus
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button type="button" onClick={handleClose} disabled={sending} className="btn-secondary text-sm">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
