'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUp, BedDouble, CalendarCheck, Home, MapPin, Palmtree, RotateCcw, Star } from 'lucide-react';
import api from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useAuthStore } from '@/stores/authStore';
import BoOrb, { type BoState } from './BoOrb';

/*
 * Bo, l'assistant de séjour : pastille flottante « Demandez à Bo » en bas à droite du site,
 * qui ouvre la conversation (plein écran sur mobile, panneau sur ordinateur).
 *
 * N'existe que si l'admin a activé le module IA et renseigné une clé API (drapeau `aiEnabled`
 * des réglages publics). Un voyageur connecté y retrouve ses réservations et sa fidélité ; un
 * visiteur non connecté peut seulement chercher et comparer des hébergements — ou est invité
 * à se connecter si l'admin a fermé l'assistant aux visiteurs.
 *
 * Le serveur renvoie le texte de Bo et, à part, les hébergements trouvés (`offers`) : ils sont
 * affichés en cartes, la première portant le badge « Choix de Bo ».
 *
 * La conversation reste en mémoire de la page (rien n'est enregistré) ; seuls les derniers
 * échanges sont renvoyés au serveur pour garder le fil.
 */

const HISTORY_SENT = 10;
const MAX_QUESTION = 500;

// Pages où Bo n'a pas sa place : espaces partenaire et admin (ils ont leur propre assistant),
// connexion, et paiement (ne pas distraire pendant un règlement).
const HIDDEN_ON = /^\/(?:dashboard\/(?:host|admin)|auth\/|paiement\/|bookings\/[^/]+\/payment|dashboard\/user\/ai)/;

interface Offer {
  id: number;
  name: string;
  type: string;
  city: string | null;
  rating: number | null;
  photo: string | null;
  listing_link: string;
  price_per_night_fcfa: number | null;
  total_fcfa: number | null;
  nights: number | null;
  room: string | null;
  booking_link: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  offers?: Offer[];
  /** Message d'erreur ou d'information : affiché, mais pas renvoyé au serveur comme historique */
  local?: boolean;
  loginRequired?: boolean;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

// Liens que Bo peut encore glisser dans son texte : fiche d'un établissement, ou formulaire de
// réservation prérempli (établissement, chambre, dates, voyageurs).
const LISTING_LINK = /^\/accommodations\/\d+$/;
const BOOKING_LINK = /^\/bookings\/new\?[\w=&%.\-]+$/;
const TOKENS = /(\/bookings\/new\?[\w=&%.\-]+|\/accommodations\/\d+|\*\*[^*\n]+\*\*)/g;

/** Rend le texte de Bo : liens « Réserver » et « voir la fiche », et **gras**. */
function renderAnswer(text: string, onNavigate: () => void): ReactNode[] {
  return text.split(TOKENS).map((part, i) => {
    if (BOOKING_LINK.test(part)) {
      // Certains modèles terminent l'adresse par un point de fin de phrase : on l'écarte.
      const href = part.replace(/[.&]+$/, '');
      return (
        <Link
          key={i}
          href={href}
          onClick={onNavigate}
          className="my-1 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white no-underline hover:bg-primary-dark"
        >
          Réserver
        </Link>
      );
    }
    if (LISTING_LINK.test(part)) {
      return (
        <Link key={i} href={part} onClick={onNavigate} className="font-medium text-primary underline underline-offset-2">
          voir la fiche
        </Link>
      );
    }
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function OfferCard({
  offer,
  favorite,
  selected,
  onSelect,
  onNavigate,
}: {
  offer: Offer;
  favorite: boolean;
  selected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}) {
  const photo = resolveImageUrl(offer.photo);

  return (
    <article
      onClick={onSelect}
      className={`relative w-[15.5rem] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-colors dark:bg-gray-800 ${
        selected ? 'border-2 border-primary' : 'border-2 border-gray-200 dark:border-gray-700'
      }`}
    >
      {favorite && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold leading-none text-white">
          Choix de Bo
        </span>
      )}
      <div className="flex h-28 items-center justify-center bg-gray-200 text-gray-400 dark:bg-gray-700">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <BedDouble className="h-7 w-7" />
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">{offer.name}</h3>
        <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{[offer.city, offer.type].filter(Boolean).join(' · ')}</span>
          {offer.rating ? (
            <span className="ml-1 inline-flex shrink-0 items-center gap-0.5">
              <Star className="h-3.5 w-3.5" /> {offer.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            </span>
          ) : null}
        </p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="min-w-0 text-xs text-gray-600 dark:text-gray-300">
            {offer.price_per_night_fcfa ? (
              <>
                <strong className="text-sm text-gray-900 dark:text-white">
                  {Math.round(offer.price_per_night_fcfa).toLocaleString('fr-FR')}
                </strong>{' '}
                FCFA / nuit
              </>
            ) : (
              'Tarif sur la fiche'
            )}
          </p>
          <Link
            href={offer.booking_link ?? offer.listing_link}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white no-underline hover:bg-primary-dark"
          >
            {offer.booking_link ? 'Réserver' : 'Voir'}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function TravelerAssistant() {
  const pathname = usePathname() ?? '';
  const aiEnabled = useAppSettingsStore((s) => s.aiEnabled);
  const aiGuestEnabled = useAppSettingsStore((s) => s.aiGuestEnabled);
  const { user, isAuthenticated } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [startedAt, setStartedAt] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const isTraveler = isAuthenticated && (user?.role ?? 'user') === 'user';
  const isStaff = isAuthenticated && !isTraveler;
  const mustLogIn = !isTraveler && !aiGuestEnabled;

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    // Sur ordinateur seulement : sur mobile, le clavier masquerait l'écran d'accueil de Bo.
    if (open && !mustLogIn && window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, [open, mustLogIn]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const ask = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (text.length < 3 || loading) return;

      const history = messages.filter((m) => !m.local).slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content }));
      if (messages.length === 0) {
        setStartedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setQuestion('');
      setLoading(true);
      try {
        const res = await api.post('/assistant/ask', { question: text, history });
        const offers: Offer[] = res.data?.data?.offers ?? [];
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data?.data?.answer ?? '', offers }]);
        if (offers.length > 0) setSelectedId(offers[0].id);
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { message?: string; login_required?: boolean } } };
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            local: true,
            loginRequired: !!e.response?.data?.login_required,
            content:
              e.response?.data?.message ||
              (e.response?.status === 429
                ? 'Vous posez des questions un peu vite. Patientez une minute, puis réessayez.'
                : "Bo n'a pas pu répondre. Vérifiez votre connexion, puis réessayez."),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const restart = () => {
    setMessages([]);
    setSelectedId(null);
    setQuestion('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  // Tout ce qui suit dépend de l'interrupteur admin : désactivé, Bo n'existe pas.
  if (!aiEnabled || isStaff || HIDDEN_ON.test(pathname)) return null;

  const loginHref = (target: string) => `/auth/login?redirect=${encodeURIComponent(target)}`;
  const hide = () => setOpen(false);

  // Les cartes actives sont celles de la dernière réponse de Bo.
  const last = messages[messages.length - 1];
  const lastOffers = !loading && last?.role === 'assistant' ? last.offers ?? [] : [];
  const selected = lastOffers.find((o) => o.id === selectedId) ?? null;
  const boState: BoState = loading ? 'thinking' : lastOffers.length > 0 ? 'found' : 'idle';

  const tiles: { icon: ReactNode; label: string; question?: string; href?: string }[] = [
    { icon: <BedDouble className="h-5 w-5" />, label: 'Un hôtel à Abidjan', question: 'Je cherche un hôtel à Abidjan' },
    { icon: <Palmtree className="h-5 w-5" />, label: 'Un week-end à Assinie', question: 'Je cherche un hébergement pour un week-end à Assinie' },
    { icon: <Home className="h-5 w-5" />, label: 'Une résidence meublée', question: 'Je cherche une résidence meublée' },
    isTraveler
      ? { icon: <CalendarCheck className="h-5 w-5" />, label: 'Suivre ma réservation', question: 'Où en sont mes réservations ?' }
      : { icon: <CalendarCheck className="h-5 w-5" />, label: 'Suivre ma réservation', href: loginHref('/dashboard/user/reservations') },
  ];
  const tileClass =
    'flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white p-3.5 text-left text-sm font-bold leading-snug text-gray-900 no-underline transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  const chipClass =
    'rounded-full border border-gray-900 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-40 dark:border-gray-300 dark:bg-transparent dark:text-gray-100';

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Demandez à Bo, l'assistant boséjour"
          className="group fixed right-3 z-40 flex items-center gap-2.5 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,.45)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-gray-900 dark:ring-white/10 md:bottom-6 md:right-6 md:pr-5 bottom-[calc(5rem+env(safe-area-inset-bottom))]"
        >
          <BoOrb size={44} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">Une question ?</span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Demandez à Bo</span>
          </span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Bo, l'assistant boséjour"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white dark:bg-gray-900 md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-3xl md:border md:border-gray-200 md:shadow-2xl md:dark:border-gray-700"
        >
          <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la conversation avec Bo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-white dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <BoOrb size={40} state={boState} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight text-gray-900 dark:text-white">Bo</h2>
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Assistant boséjour
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={restart}
                disabled={loading}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
            )}
          </header>

          {mustLogIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <BoOrb size={120} shadow />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Connectez-vous à votre espace voyageur pour discuter avec Bo.
              </p>
              <Link href={loginHref(pathname || '/')} onClick={hide} className="btn-primary">
                Me connecter
              </Link>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="flex min-h-full flex-col items-center px-5 pb-4 pt-6 text-center">
                    <BoOrb size={132} shadow />
                    <p className="mt-2 font-slogan text-3xl text-primary">Bonjour&nbsp;!</p>
                    <h3 className="mt-1 text-xl font-bold leading-tight text-gray-900 dark:text-white">
                      Je suis Bo, votre assistant de séjour
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-gray-600 dark:text-gray-300">
                      Dites-moi où, quand et pour combien de personnes : je trouve, je compare et je prépare votre
                      réservation, partout en Côte d&apos;Ivoire.
                    </p>
                    <div className="mt-5 grid w-full grid-cols-2 gap-2.5">
                      {tiles.map((t) =>
                        t.href ? (
                          <Link key={t.label} href={t.href} onClick={hide} className={tileClass}>
                            <span className="text-primary">{t.icon}</span>
                            {t.label}
                          </Link>
                        ) : (
                          <button key={t.label} type="button" onClick={() => ask(t.question!)} className={tileClass}>
                            <span className="text-primary">{t.icon}</span>
                            {t.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 px-3 py-4">
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">Aujourd&apos;hui · {startedAt}</p>

                    {messages.map((m, i) =>
                      m.role === 'user' ? (
                        <div key={i} className="flex justify-end">
                          <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gray-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-gray-900">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={i} className="space-y-2.5">
                          <div className="flex items-end gap-2">
                            <BoOrb size={24} className="mb-1 shrink-0" />
                            <div
                              className={`max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-bl-md px-4 py-2.5 text-sm ${
                                m.local
                                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                              }`}
                            >
                              {renderAnswer(m.content, hide)}
                              {m.loginRequired && !isTraveler && (
                                <Link
                                  href={loginHref(pathname || '/')}
                                  onClick={hide}
                                  className="mt-2 block font-semibold text-primary underline"
                                >
                                  Me connecter
                                </Link>
                              )}
                            </div>
                          </div>

                          {m.offers && m.offers.length > 0 && (
                            <div className="-mx-3 flex snap-x scroll-pl-11 gap-3 overflow-x-auto pb-1 pl-11 pr-3">
                              {m.offers.map((o, n) => (
                                <OfferCard
                                  key={o.id}
                                  offer={o}
                                  favorite={n === 0}
                                  selected={m === last ? o.id === selectedId : n === 0}
                                  onSelect={() => m === last && setSelectedId(o.id)}
                                  onNavigate={hide}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {lastOffers.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-8">
                        <button type="button" onClick={() => ask("Montre-moi d'autres options")} className={chipClass}>
                          Autres options
                        </button>
                        {lastOffers.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              ask(`Compare ${lastOffers.slice(0, 3).map((o) => o.name).join(', ')}`.slice(0, MAX_QUESTION))
                            }
                            className={chipClass}
                          >
                            {lastOffers.length === 2 ? 'Comparer les deux' : 'Comparer les trois premiers'}
                          </button>
                        )}
                      </div>
                    )}

                    {loading && (
                      <div className="flex items-end gap-2" role="status">
                        <BoOrb size={24} state="thinking" className="mb-1 shrink-0" />
                        <span className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Bo cherche…
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
                {selected?.booking_link && selected.total_fcfa ? (
                  <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gray-950 py-2 pl-4 pr-2 text-white">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {selected.name} · {selected.nights} nuit{(selected.nights ?? 0) > 1 ? 's' : ''}
                      </p>
                      <p className="truncate text-xs text-gray-300">Total {fcfa(selected.total_fcfa)}</p>
                    </div>
                    <Link
                      href={selected.booking_link}
                      onClick={hide}
                      className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-primary-dark"
                    >
                      Réserver
                    </Link>
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="flex items-end gap-2">
                  <label htmlFor="assistant-question" className="sr-only">
                    Votre message à Bo
                  </label>
                  <textarea
                    id="assistant-question"
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
                    placeholder={messages.length === 0 ? 'Où voulez-vous aller ?' : 'Écrivez à Bo…'}
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
                  Bo peut se tromper. Vérifiez les détails avant de payer.
                </p>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
