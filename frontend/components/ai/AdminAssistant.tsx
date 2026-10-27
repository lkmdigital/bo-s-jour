'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUp, RotateCcw, X } from 'lucide-react';
import api from '@/lib/api';
import { isAdmin } from '@/lib/userUtils';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useAuthStore } from '@/stores/authStore';
import BoOrb, { type BoState } from './BoOrb';

/*
 * Bo dans l'espace admin : pastille flottante sur toutes les pages du tableau de bord, qui ouvre
 * la conversation avec l'assistant IA administrateur (mêmes outils que la page « Renseignement IA »).
 *
 * N'existe que si le module IA est activé, et seulement pour un administrateur : la route serveur
 * refuse les contrôleurs. La conversation reste en mémoire tant que l'on navigue dans l'espace
 * admin (le layout n'est pas remonté entre deux pages) ; seuls les derniers échanges sont renvoyés
 * au serveur pour garder le fil.
 */

const HISTORY_SENT = 10;
const MAX_QUESTION = 500;

const SUGGESTIONS = [
  'Quels établissements attendent une validation ?',
  'Combien de réservations cette semaine ?',
  'Y a-t-il des anomalies à surveiller ?',
  'Fais-moi le point sur la semaine',
  "Quels établissements n'ont reçu aucune réservation depuis 90 jours ?",
  "Quelle ville génère le plus de chiffre d'affaires ?",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** Message d'erreur : affiché, mais pas renvoyé au serveur comme historique */
  local?: boolean;
}

/** Texte de Bo : retours à la ligne conservés, **gras** rendu. */
function renderAnswer(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    /^\*\*[^*\n]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

export default function AdminAssistant() {
  const aiEnabled = useAppSettingsStore((s) => s.aiEnabled);
  const { user } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    // Sur ordinateur seulement : sur mobile, le clavier masquerait l'écran d'accueil de Bo.
    if (open && window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const ask = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (text.length < 3 || loading) return;

      const history = messages.filter((m) => !m.local).slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content }));
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setQuestion('');
      setLoading(true);
      try {
        const res = await api.post('/admin/ai/ask', { question: text, history });
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data?.data?.answer || 'Aucune réponse.' }]);
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { message?: string } } };
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            local: true,
            content:
              e.response?.data?.message ||
              (e.response?.status === 429
                ? 'Vous posez des questions un peu vite. Patientez une minute, puis réessayez.'
                : "Bo n'a pas pu répondre. Réessayez dans un instant."),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  if (!aiEnabled || !isAdmin(user)) return null;

  const boState: BoState = loading ? 'thinking' : 'idle';
  const chipClass =
    'rounded-full border border-gray-900 bg-white px-3.5 py-1.5 text-left text-xs font-medium text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-40 dark:border-gray-300 dark:bg-transparent dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-900';

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Demandez à Bo, l'assistant IA administrateur"
          className="group fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,.45)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-gray-900 dark:ring-white/10 md:bottom-6 md:right-6 md:pr-5"
        >
          <BoOrb size={44} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">Assistant admin</span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Demandez à Bo</span>
          </span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Bo, l'assistant IA administrateur"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white dark:bg-gray-900 md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-3xl md:border md:border-gray-200 md:shadow-2xl md:dark:border-gray-700"
        >
          <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <BoOrb size={40} state={boState} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight text-gray-900 dark:text-white">Bo</h2>
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Assistant IA administrateur
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setQuestion('');
                }}
                disabled={loading}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la conversation avec Bo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-white dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col items-center px-5 pb-4 pt-6 text-center">
                <BoOrb size={112} shadow />
                <p className="mt-2 font-slogan text-3xl text-primary">Bonjour&nbsp;!</p>
                <h3 className="mt-1 text-xl font-bold leading-tight text-gray-900 dark:text-white">
                  Interrogez la plateforme
                </h3>
                <p className="mt-2 max-w-xs text-sm text-gray-600 dark:text-gray-300">
                  Réservations, établissements, paiements, anomalies : je réponds à partir des données réelles de
                  boséjour.
                </p>
                <div className="mt-5 flex w-full flex-col items-stretch gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} className={chipClass}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-3 py-4">
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gray-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-gray-900">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-end gap-2">
                      <BoOrb size={24} className="mb-1 shrink-0" />
                      <div
                        className={`max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-bl-md px-4 py-2.5 text-sm ${
                          m.local
                            ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {renderAnswer(m.content)}
                      </div>
                    </div>
                  )
                )}

                {loading && (
                  <div className="flex items-end gap-2" role="status">
                    <BoOrb size={24} state="thinking" className="mb-1 shrink-0" />
                    <span className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      Bo analyse les données…
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label htmlFor="admin-assistant-question" className="sr-only">
                Votre question à Bo
              </label>
              <textarea
                id="admin-assistant-question"
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                rows={1}
                placeholder={messages.length === 0 ? 'Posez une question sur la plateforme…' : 'Écrivez à Bo…'}
                className="max-h-28 min-h-[46px] flex-1 resize-none rounded-3xl border border-transparent bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-primary dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || question.trim().length < 3}
                aria-label="Envoyer à Bo"
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              Bo peut se tromper. Vérifiez les chiffres importants dans les rapports.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
