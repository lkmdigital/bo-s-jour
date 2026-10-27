'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUp, BedDouble, CalendarCheck, ClipboardCheck, MapPin, ShieldAlert, TrendingUp } from 'lucide-react';
import { useAdminAssistantStore } from '@/stores/adminAssistantStore';
import BoOrb from './BoOrb';

/*
 * Corps de la conversation avec Bo dans l'espace admin (accueil, échanges, saisie) : le même dans la
 * bulle flottante (`panel`) et dans la page « Renseignement IA » (`page`, plus aéré). Les deux lisent
 * la même conversation (adminAssistantStore).
 */

const MAX_QUESTION = 500;

const SUGGESTIONS: { icon: ReactNode; label: string; question: string }[] = [
  { icon: <ClipboardCheck className="h-5 w-5" />, label: 'Établissements à valider', question: 'Quels établissements attendent une validation ?' },
  { icon: <CalendarCheck className="h-5 w-5" />, label: 'Réservations de la semaine', question: 'Combien de réservations cette semaine ?' },
  { icon: <ShieldAlert className="h-5 w-5" />, label: 'Anomalies à surveiller', question: 'Y a-t-il des anomalies à surveiller ?' },
  { icon: <TrendingUp className="h-5 w-5" />, label: 'Le point sur la semaine', question: 'Fais-moi le point sur la semaine' },
  { icon: <BedDouble className="h-5 w-5" />, label: 'Établissements sans réservation', question: "Quels établissements n'ont reçu aucune réservation depuis 90 jours ?" },
  { icon: <MapPin className="h-5 w-5" />, label: "Villes les plus rentables", question: "Quelle ville génère le plus de chiffre d'affaires ?" },
];

/** Texte de Bo : retours à la ligne conservés, puces lisibles, **gras** rendu. */
function renderAnswer(text: string): ReactNode[] {
  return text
    .replace(/^[-*]\s+/gm, '• ')
    .split(/(\*\*[^*\n]+\*\*)/g)
    .map((part, i) => (/^\*\*[^*\n]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

export default function AdminAssistantChat({ variant }: { variant: 'panel' | 'page' }) {
  const { messages, loading, startedAt, ask } = useAdminAssistantStore();
  const [question, setQuestion] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPage = variant === 'page';

  useEffect(() => {
    // Sur ordinateur seulement : sur mobile, le clavier masquerait l'écran d'accueil de Bo.
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = (text: string) => {
    setQuestion('');
    ask(text);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(question);
  };

  const tileClass =
    'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left text-sm font-bold leading-snug text-gray-900 transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  const chipClass =
    'rounded-full border border-gray-900 bg-white px-3.5 py-1.5 text-left text-xs font-medium text-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-300 dark:bg-transparent dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-900';

  return (
    <>
      <div ref={listRef} className="flex-1 overflow-y-auto" aria-live="polite">
        {messages.length === 0 ? (
          <div className={`mx-auto flex min-h-full flex-col items-center px-5 pb-4 text-center ${isPage ? 'max-w-3xl pt-10' : 'pt-6'}`}>
            <BoOrb size={isPage ? 148 : 112} shadow />
            <p className="mt-2 font-slogan text-3xl text-primary">Bonjour&nbsp;!</p>
            <h3 className="mt-1 text-xl font-bold leading-tight text-gray-900 dark:text-white">
              {isPage ? 'Que voulez-vous savoir sur la plateforme ?' : 'Interrogez la plateforme'}
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">
              Réservations, établissements, paiements, anomalies : je réponds à partir des données réelles de boséjour.
            </p>
            {isPage ? (
              <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} type="button" onClick={() => send(s.question)} className={tileClass}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex w-full flex-col items-stretch gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} type="button" onClick={() => send(s.question)} className={chipClass}>
                    {s.question}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`mx-auto space-y-3 px-3 py-4 ${isPage ? 'max-w-3xl' : ''}`}>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">Aujourd&apos;hui · {startedAt}</p>

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gray-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-gray-900">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                  <BoOrb size={isPage ? 30 : 24} className="mb-1 shrink-0" />
                  <div
                    className={`max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${
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
                <BoOrb size={isPage ? 30 : 24} state="thinking" className="mb-1 shrink-0" />
                <span className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Bo analyse les données…
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <form onSubmit={onSubmit} className={`mx-auto flex items-end gap-2 ${isPage ? 'max-w-3xl' : ''}`}>
          <label htmlFor={`admin-assistant-question-${variant}`} className="sr-only">
            Votre question à Bo
          </label>
          <textarea
            id={`admin-assistant-question-${variant}`}
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(question);
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
    </>
  );
}
