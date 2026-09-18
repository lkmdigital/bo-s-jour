'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, ShieldCheck, FileText,
  Compass, Waves, Landmark, Eye, UtensilsCrossed, Moon, Play, Star,
  Briefcase, Palmtree, MessageSquarePlus, X,
} from 'lucide-react';
import api from '@/lib/api';
import DestinationCard, { DestinationCardData } from './DestinationCard';
import { cn, resolveImageUrl } from '@/lib/utils';
import Brand from '@/components/common/Brand';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/common/ToastContext';

/** Image Unsplash (le domaine est autorisé + images non optimisées) */
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Révélation douce à l'entrée dans le viewport (réutilisable) */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Pourquoi faire confiance                                         */
/* ------------------------------------------------------------------ */
const TRUST = [
  { icon: DollarSign, title: 'Pas de frais cachés', text: 'Tarification transparente.' },
  { icon: ShieldCheck, title: 'Réservation instantanée', text: 'Confirmation par E-mail et WhatsApp.' },
  { icon: FileText, title: 'Flexibilité', text: "Annulation selon les politiques de l'hôtel." },
];

export function TrustSection() {
  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
        className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-14"
      >
        Pourquoi les voyageurs font confiance à <Brand /> ?
      </motion.h2>

      <div className="relative">
        {/* connecteur pointillé rouge ondulé (animé au scroll) */}
        <svg
          className="hidden md:block absolute inset-x-0 top-0 h-28 w-full pointer-events-none"
          viewBox="0 0 1000 120" preserveAspectRatio="none" fill="none" aria-hidden
        >
          <motion.path
            d="M 166 52 C 240 52 260 14 333 14 C 410 14 430 52 500 52 C 570 52 590 14 666 14 C 740 14 760 52 833 52"
            stroke="#FF0000" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" opacity="0.55"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
          {[166, 500, 833].map((x) => (
            <circle key={x} cx={x} cy="52" r="4" fill="#FF0000" />
          ))}
        </svg>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          {TRUST.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <span className={cn('w-12 h-12 flex items-center justify-center bg-primary', i === 0 ? 'rounded-full' : 'rounded-2xl')}>
                    <Icon className="w-6 h-6 text-white" />
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{t.title}</h3>
                <p className="text-sm text-gray-500 max-w-xs">{t.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Destinations tendances                                           */
/* ------------------------------------------------------------------ */
// Retour client 2026-09-17 : les 4 onglets (Business/Balnéaires/Tourisme et
// culture/Escapade weekend) doivent réellement filtrer, et l'admin doit
// pouvoir gérer les destinations affichées ici (ajouter/modifier/supprimer,
// avec leurs catégories) — jusque-là la section agrégeait automatiquement
// les vraies villes des établissements (/accommodations/top-cities), une
// donnée qui n'a aucune notion de catégorie. Remplacé par le même principe
// que "Principaux sites à voir" (TrendingDestination, contenu admin géré
// dans Paramètres > Découvertes), avec un filtrage par onglet identique à
// SITE_TABS ci-dessous. Masquée tant qu'aucune entrée n'est publiée.
type DestinationCategory = 'business' | 'balneaire' | 'tourisme_culture' | 'escapade_weekend';
const SEASON_TABS: { label: string; icon: typeof Compass; category: DestinationCategory }[] = [
  { label: 'Business', icon: Briefcase, category: 'business' },
  { label: 'Balnéaires', icon: Waves, category: 'balneaire' },
  { label: 'Tourisme et culture', icon: Landmark, category: 'tourisme_culture' },
  { label: 'Escapade weekend', icon: Palmtree, category: 'escapade_weekend' },
];

interface TrendingDestinationApi {
  id: number;
  city: string;
  from_price: number;
  accommodations_count: number;
  categories: DestinationCategory[] | null;
  image_path: string;
}

interface TrendingDestinationData extends DestinationCardData {
  categories: DestinationCategory[];
}

function useTrendingDestinations() {
  const [destinations, setDestinations] = useState<TrendingDestinationData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/discovery/destinations')
      .then((r) => {
        if (cancelled) return;
        const data: TrendingDestinationApi[] = r.data?.data ?? [];
        setDestinations(data.map((d) => ({
          name: d.city,
          image: resolveImageUrl(d.image_path) || '',
          fromPrice: d.from_price,
          tagline: `${d.accommodations_count} hébergement${d.accommodations_count > 1 ? 's' : ''} disponible${d.accommodations_count > 1 ? 's' : ''}`,
          href: `/accommodations?city=${encodeURIComponent(d.city)}`,
          categories: d.categories || [],
        })));
      })
      .catch(() => { if (!cancelled) setDestinations([]); });
    return () => { cancelled = true; };
  }, []);

  return destinations;
}

export function TrendingDestinations() {
  const [active, setActive] = useState(0);
  const destinations = useTrendingDestinations();
  const category = SEASON_TABS[active].category;

  // Rien de publié : on masque la section plutôt que d'afficher une grille vide.
  if (destinations !== null && destinations.length === 0) return null;

  const filtered = destinations === null ? null : destinations.filter((d) => d.categories.includes(category));

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Destinations tendances</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {SEASON_TABS.map((t, i) => {
          const Icon = t.icon;
          const isActive = i === active;
          return (
            <button key={t.label} onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-black'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      {filtered === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[440px] rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Aucune destination dans cette catégorie pour le moment.</p>
      ) : (
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((d) => <DestinationCard key={d.name} data={d} />)}
        </Reveal>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Voyagez plus, dépensez moins                                     */
/* ------------------------------------------------------------------ */
const SAVE_OFFERS = [
  { title: 'Offres exclusives', text: 'Bénéficiez de réductions chez nos partenaires dans toute la Côte d\'Ivoire.' },
  { title: 'Spécial week-end', text: 'Bénéficiez de 12 % de réduction sur les séjours week-end.' },
  { title: "Offre exclusive à l'application", text: "Économisez jusqu'à 20 % lorsque vous réservez via l'application." },
  { title: 'Remise long séjour', text: 'Séjournez 7 nuits ou plus et bénéficiez de 25 % de réduction.' },
  { title: 'Gagnez des récompenses', text: <>Bénéficiez d&apos;avantages en tant que membre <Brand />.</> },
];

function SaveCard({ o }: { o: { title: string; text: ReactNode } }) {
  return (
    <div className="min-w-[260px] w-[260px] flex-shrink-0 rounded-2xl border-2 border-primary/40 p-5 bg-white dark:bg-gray-900 transition-all duration-300 hover:border-primary hover:shadow-lg hover:-translate-y-1">
      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{o.title}</h3>
      <p className="text-sm text-gray-500">{o.text}</p>
    </div>
  );
}

export function SaveMore() {
  // Deux groupes identiques qui défilent chacun de -100% : boucle parfaitement continue
  return (
    <section className="py-12 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Voyagez plus, dépensez moins</h2>
      </div>
      <div className="marquee-track relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex gap-5 pr-5 animate-marquee shrink-0">
          {SAVE_OFFERS.map((o, i) => <SaveCard key={`a-${i}`} o={o} />)}
        </div>
        <div className="flex gap-5 pr-5 animate-marquee shrink-0" aria-hidden>
          {SAVE_OFFERS.map((o, i) => <SaveCard key={`b-${i}`} o={o} />)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Principaux sites à voir                                          */
/* ------------------------------------------------------------------ */
// Retour client 2026-09-15 : cette section montrait 5 lieux inventés (photos
// Unsplash) — remplacée par du contenu réel publié par l'admin (Paramètres >
// Découvertes). Masquée tant que rien n'est publié, même logique que
// useTrendingDestinations() ci-dessus.
// Retour client 2026-09-16 (correction "Les destinations tendances") :
// catégories de voyage pour filtrer les sites — distinctes des onglets
// d'activités ci-dessous, un site peut appartenir à plusieurs.
type SiteCategory = 'business' | 'balneaire' | 'tourisme_culture' | 'escapade_weekend';
const SITE_TABS: { label: string; icon: typeof Compass; category: SiteCategory | 'all' }[] = [
  { label: 'Explorer', icon: Compass, category: 'all' },
  { label: 'Business', icon: Briefcase, category: 'business' },
  { label: 'Balnéaires', icon: Waves, category: 'balneaire' },
  { label: 'Tourisme et culture', icon: Landmark, category: 'tourisme_culture' },
  { label: 'Escapade weekend', icon: Palmtree, category: 'escapade_weekend' },
];

interface DiscoverySiteApi { id: number; name: string; city: string | null; categories: SiteCategory[] | null; image_path: string }
interface DiscoverySiteData { id: number; name: string; city: string | null; categories: SiteCategory[]; image: string }

function useDiscoverySites() {
  const [sites, setSites] = useState<DiscoverySiteData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/discovery/sites')
      .then((r) => {
        if (cancelled) return;
        const data: DiscoverySiteApi[] = r.data?.data ?? [];
        setSites(data.map((s) => ({ id: s.id, name: s.name, city: s.city, categories: s.categories || [], image: resolveImageUrl(s.image_path) })));
      })
      .catch(() => { if (!cancelled) setSites([]); });
    return () => { cancelled = true; };
  }, []);

  return sites;
}

function SiteCard({ s, className = '' }: { s: DiscoverySiteData; className?: string }) {
  return (
    <Link href="/accommodations" className={`group relative block rounded-2xl overflow-hidden ${className}`}>
      <Image src={s.image} alt={s.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <span className="absolute top-4 left-4 text-white font-bold text-lg">{s.name}</span>
    </Link>
  );
}

export function TopSites() {
  const [active, setActive] = useState(0);
  const sites = useDiscoverySites();
  const category = SITE_TABS[active].category;

  if (sites !== null && sites.length === 0) return null;

  const filtered = sites === null ? null : (category === 'all' ? sites : sites.filter((s) => s.categories.includes(category)));

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Principaux sites à voir</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {SITE_TABS.map((t, i) => {
          const Icon = t.icon;
          const isActive = i === active;
          return (
            <button key={t.label} onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-black'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      {filtered === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Aucun site dans cette catégorie pour le moment.</p>
      ) : (
        <Reveal className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {filtered.map((s) => <SiteCard key={s.id} s={s} className="h-56" />)}
        </Reveal>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Meilleures activités                                             */
/* ------------------------------------------------------------------ */
// 'all' = onglet "Explorer" (aucun filtre, tout affiché). Les autres catégories
// filtrent réellement la grille, et chaque carte relie vers une recherche
// d'hébergements pré-remplie (paramètre `search`, consommé par /accommodations)
// plutôt que vers un lien générique sans effet.
type ActivityCategory = 'plage' | 'musee' | 'voir' | 'nourriture' | 'vie_nocturne';
const ACT_TABS: { label: string; icon: typeof Compass; category: ActivityCategory | 'all' }[] = [
  { label: 'Explorer', icon: Compass, category: 'all' },
  { label: 'Plage', icon: Waves, category: 'plage' },
  { label: 'Musée', icon: Landmark, category: 'musee' },
  { label: 'À voir', icon: Eye, category: 'voir' },
  { label: 'Nourriture', icon: UtensilsCrossed, category: 'nourriture' },
  { label: 'Vie nocturne', icon: Moon, category: 'vie_nocturne' },
];
// Retour client 2026-09-15 : cette section montrait 10 activités inventées —
// remplacée par du contenu réel publié par l'admin (Paramètres > Découvertes).
// Masquée tant que rien n'est publié.
interface DiscoveryActivityApi { id: number; name: string; categories: ActivityCategory[] | null; search_term: string | null; image_path: string }
interface DiscoveryActivityData { id: number; name: string; searchTerm: string; categories: ActivityCategory[]; image: string }

function useDiscoveryActivities() {
  const [activities, setActivities] = useState<DiscoveryActivityData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/discovery/activities')
      .then((r) => {
        if (cancelled) return;
        const data: DiscoveryActivityApi[] = r.data?.data ?? [];
        setActivities(data.map((a) => ({
          id: a.id,
          name: a.name,
          searchTerm: a.search_term || a.name,
          categories: a.categories || [],
          image: resolveImageUrl(a.image_path),
        })));
      })
      .catch(() => { if (!cancelled) setActivities([]); });
    return () => { cancelled = true; };
  }, []);

  return activities;
}

export function Activities() {
  const [active, setActive] = useState(0);
  const activities = useDiscoveryActivities();
  const category = ACT_TABS[active].category;

  if (activities !== null && activities.length === 0) return null;

  const filtered = activities === null ? null : (category === 'all' ? activities : activities.filter((a) => a.categories.includes(category)));

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Les meilleures activités à Abidjan</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {ACT_TABS.map((t, i) => {
          const Icon = t.icon;
          const isActive = i === active;
          return (
            <button key={t.label} onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-black'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      {filtered === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Aucune activité dans cette catégorie pour le moment.</p>
      ) : (
        <Reveal className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {filtered.map((a) => (
            <Link key={a.id} href={`/accommodations?search=${encodeURIComponent(a.searchTerm)}`} className="group">
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                <Image src={a.image} alt={a.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="16vw" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{a.name}</p>
            </Link>
          ))}
        </Reveal>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Explorer boséjour (vidéos)                                       */
/* ------------------------------------------------------------------ */
// Retour client 2026-09-17 : les 3 vignettes vidéo (noms de lieux, notes en
// étoiles) étaient codées en dur, avec un bouton "Lire" qui ne menait à
// aucune vidéo réelle — le client veut que l'admin puisse ajouter ses
// propres vidéos ici (Paramètres > Découvertes) et changer le texte du
// bloc héros. Titre de section aussi raccourci ("Explorez ... en
// mouvement" -> "Explorer boséjour") à la demande du client. Le grand
// bloc héros à gauche garde sa vraie photo d'hébergement (non fabriquée) —
// seules les vignettes vidéo et le texte deviennent gérés par l'admin.
interface ShowcaseVideoApi {
  id: number;
  label: string;
  rating: number;
  image_path: string;
  video_url: string | null;
}

function useShowcaseVideos() {
  const [videos, setVideos] = useState<ShowcaseVideoApi[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/discovery/videos')
      .then((r) => { if (!cancelled) setVideos(r.data?.data ?? []); })
      .catch(() => { if (!cancelled) setVideos([]); });
    return () => { cancelled = true; };
  }, []);

  return videos;
}

function useShowcaseText() {
  const [text, setText] = useState<{ title: string; description: string; image_path: string | null }>({
    title: "Vivez l'expérience",
    description: 'Plongez-vous dans des visuels captivants de nos destinations les plus emblématiques.',
    image_path: null,
  });

  useEffect(() => {
    let cancelled = false;
    api.get('/discovery/showcase-text')
      .then((r) => { if (!cancelled && r.data?.title) setText({ title: r.data.title, description: r.data.description, image_path: r.data.image_path ?? null }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return text;
}

export function VideoShowcase({ photos = [] }: { photos?: string[] }) {
  const videos = useShowcaseVideos();
  const text = useShowcaseText();
  // Retour client 2026-09-17 : l'admin peut choisir une photo pour ce bloc
  // (showcase_image_path) ; sans choix, on garde le comportement précédent
  // (vraie photo d'hébergement, jamais une image inventée).
  const heroImg = (text.image_path && resolveImageUrl(text.image_path)) || photos[3] || img('1470071459604-3b5ec3a7fe05', 1200);
  const hasVideos = videos === null || videos.length > 0;

  return (
    <section className="bg-gray-50 dark:bg-gray-900/40 py-16">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Explorer <Brand /></h2>
        <div className={cn('grid grid-cols-1 gap-5', hasVideos && 'lg:grid-cols-3')}>
          <div className={cn('relative rounded-2xl overflow-hidden min-h-[360px] ring-4 ring-primary/30', hasVideos && 'lg:col-span-2')}>
            <Image src={heroImg} alt="Luxe" fill className="object-cover" sizes="66vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/10" />
            <div className="relative z-10 p-8 md:p-12 max-w-lg text-white h-full flex flex-col justify-center">
              <h3 className="text-3xl md:text-4xl font-bold">{text.title}</h3>
              <p className="mt-3 text-white/90">{text.description}</p>
              <Link href="/accommodations" className="btn-primary mt-6 w-fit">Explorer toutes les vidéos</Link>
            </div>
          </div>
          {videos === null ? (
            <div className="flex flex-col gap-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[112px] flex-1 rounded-2xl skeleton" />)}
            </div>
          ) : videos.length > 0 && (
            <div className="flex flex-col gap-5">
              {videos.map((v) => {
                const Tile = (
                  <>
                    <Image src={resolveImageUrl(v.image_path)} alt={v.label} fill className="object-cover" sizes="33vw" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-4 h-4 text-primary fill-primary ml-0.5" />
                    </span>
                    <div className="absolute bottom-2 left-3 text-white text-sm font-medium drop-shadow">
                      {v.label}
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < v.rating ? 'fill-[#F7C948] text-[#F7C948]' : 'text-white/50'}`} />
                        ))}
                      </div>
                    </div>
                  </>
                );
                return v.video_url ? (
                  <a key={v.id} href={v.video_url} target="_blank" rel="noopener noreferrer"
                    className="relative rounded-2xl overflow-hidden h-[112px] flex-1 group block">
                    {Tile}
                  </a>
                ) : (
                  <div key={v.id} className="relative rounded-2xl overflow-hidden h-[112px] flex-1 group">
                    {Tile}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Témoignages                                                      */
/* ------------------------------------------------------------------ */
interface TestimonialItem {
  id: string;
  comment: string;
  avatar: string | null;
  label: string;
}

// Retour client 2026-09-18 : les 4 avis réels transmis par le client
// (KONE Raïssa, FOFANA Azize, DIABATÉ Fatou, KOUAME Yannick) vivaient
// jusqu'ici uniquement codés en dur ici — absents de la table
// platform_testimonials, ils n'apparaissaient jamais sur la page publique
// "Avis clients" (qui lit cette table). Insérés comme vraies lignes
// publiées (migration 2026_09_18_000002_seed_platform_testimonials), donc
// désormais chargés comme n'importe quel autre avis via useTestimonialsFeed
// ci-dessous — plus de tableau codé en dur, une seule source de vérité.
interface TestimonialApi { id: number; first_name: string; avatar_path: string | null; comment: string }

/** Avis réels soumis via "Laissez un avis sur boséjour", validés par l'admin. */
function useTestimonialsFeed() {
  const [items, setItems] = useState<TestimonialItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/testimonials')
      .then((r) => {
        if (cancelled) return;
        const data: TestimonialApi[] = r.data?.data ?? [];
        setItems(data.map((t) => ({
          id: `t-${t.id}`,
          comment: t.comment,
          avatar: t.avatar_path ? resolveImageUrl(t.avatar_path) : null,
          label: t.first_name,
        })));
      })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  return items;
}

function TestimonialAvatar({ item, size }: { item: TestimonialItem; size: number }) {
  if (item.avatar) {
    return (
      <span className="relative block rounded-full overflow-hidden ring-2 ring-white shadow shrink-0" style={{ width: size, height: size }}>
        <Image src={item.avatar} alt={item.label} fill className="object-cover" sizes={`${size}px`} />
      </span>
    );
  }
  // Pas de photo de profil : initiale du prénom, façon avatar générique (montre
  // que l'avis vient d'un vrai compte, sans jamais inventer de photo).
  return (
    <span
      className="rounded-full bg-primary text-white flex items-center justify-center font-bold ring-2 ring-white shadow shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {item.label.charAt(0).toUpperCase()}
    </span>
  );
}

function TestimonialBubble({ item, variant }: { item: TestimonialItem; variant: 'main' | 'float' }) {
  if (variant === 'main') {
    return (
      <div className="flex flex-col items-center gap-3">
        <TestimonialAvatar item={item} size={56} />
        <p className="text-lg md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {item.comment}
        </p>
        <p className="text-sm text-gray-500">{item.label}</p>
      </div>
    );
  }
  return (
    <div className="w-[210px] bg-white/95 dark:bg-gray-900/90 backdrop-blur rounded-2xl shadow-lg p-3 flex items-start gap-2.5">
      <TestimonialAvatar item={item} size={32} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{item.label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5 line-clamp-3">{item.comment}</p>
      </div>
    </div>
  );
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Zones d'ancrage possibles pour les bulles flottantes : retour client
// 2026-09-17, elles ne doivent occuper que l'espace du bas (jamais sous le
// titre, jamais au niveau de la citation principale) — uniquement une bande
// tout en bas, avec 3 positions possibles pour varier. Deux bulles ne
// doivent jamais partager le même endroit — chaque bulle réserve son index
// de zone dans `occupiedRef` (partagé entre les instances) tant qu'elle est
// visible, et ne pioche que parmi les zones encore libres.
const FLOAT_ZONES = [
  { top: 80, left: 3 },
  { top: 80, left: 36 },
  { top: 80, left: 68 },
];

function pickFreeZoneIndex(occupied: Set<number>): number {
  const all = FLOAT_ZONES.map((_, i) => i);
  const free = all.filter((i) => !occupied.has(i));
  return pickRandom(free.length > 0 ? free : all);
}

function zonePosition(index: number) {
  const z = FLOAT_ZONES[index];
  const jitter = () => (Math.random() - 0.5) * 2;
  return { top: `${z.top + jitter()}%`, left: `${z.left + jitter()}%` };
}

/** Pioche un avis non déjà affiché ailleurs (citation principale + autres bulles) — retour client 2026-09-17 : jamais le même commentaire visible à deux endroits en même temps. */
function pickAvailableItem(pool: TestimonialItem[], active: Set<string>): TestimonialItem {
  const free = pool.filter((it) => !active.has(it.id));
  return pickRandom(free.length > 0 ? free : pool);
}

function randomDrift() {
  const span = () => Math.round((Math.random() - 0.5) * 20);
  return {
    dx: [0, span(), span(), 0],
    dy: [0, span(), span(), 0],
    durX: 5 + Math.random() * 4,
    durY: 6 + Math.random() * 4,
  };
}

/**
 * Retour client 2026-09-17 : bulle de commentaire qui "sort de la page" en
 * grandissant, flotte quelques secondes en se baladant doucement, puis
 * disparaît en rétrécissant — avant qu'une autre (autre avis, autre
 * position) ne prenne sa place. Chaque instance tourne sur son propre
 * timing, complètement indépendant des autres et de la citation principale
 * (pas d'intervalle partagé). Reste visible 10s pile (retour client
 * 2026-09-17 : elles disparaissaient trop vite à 6s — durée fixe, seul le
 * délai avant la prochaine apparition reste aléatoire, pour ne pas que les
 * bulles se resynchronisent).
 */
function FloatingTestimonial({
  pool,
  occupiedRef,
  activeIdsRef,
}: {
  pool: TestimonialItem[];
  occupiedRef: React.MutableRefObject<Set<number>>;
  activeIdsRef: React.MutableRefObject<Set<string>>;
}) {
  const [current, setCurrent] = useState<null | {
    key: number;
    item: TestimonialItem;
    pos: { top: string; left: string };
    drift: ReturnType<typeof randomDrift>;
  }>(null);
  const zoneRef = useRef<number | null>(null);
  const itemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pool.length === 0) return;
    let cancelled = false;
    let keySeq = 0;
    let timer: ReturnType<typeof setTimeout>;

    const release = () => {
      if (zoneRef.current !== null) { occupiedRef.current.delete(zoneRef.current); zoneRef.current = null; }
      if (itemIdRef.current !== null) { activeIdsRef.current.delete(itemIdRef.current); itemIdRef.current = null; }
    };

    const showNext = () => {
      if (cancelled) return;
      keySeq += 1;
      const zoneIndex = pickFreeZoneIndex(occupiedRef.current);
      occupiedRef.current.add(zoneIndex);
      zoneRef.current = zoneIndex;
      const item = pickAvailableItem(pool, activeIdsRef.current);
      activeIdsRef.current.add(item.id);
      itemIdRef.current = item.id;
      setCurrent({ key: keySeq, item, pos: zonePosition(zoneIndex), drift: randomDrift() });
      timer = setTimeout(() => {
        if (cancelled) return;
        release();
        setCurrent(null);
        const hiddenFor = 1200 + Math.random() * 2800;
        timer = setTimeout(showNext, hiddenFor);
      }, 10000);
    };

    timer = setTimeout(showNext, Math.random() * 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      release();
    };
  }, [pool, occupiedRef, activeIdsRef]);

  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.key}
            className="absolute"
            style={{ top: current.pos.top, left: current.pos.left }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, x: current.drift.dx, y: current.drift.dy }}
            exit={{ opacity: 0, scale: 0, transition: { duration: 0.9, ease: 'easeIn' } }}
            transition={{
              opacity: { duration: 0.9, ease: 'easeOut' },
              scale: { duration: 0.9, ease: 'easeOut' },
              x: { duration: current.drift.durX, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              y: { duration: current.drift.durY, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
            }}
          >
            <TestimonialBubble item={current.item} variant="float" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Citation centrale, plus grande que les bulles flottantes, change toutes
 * les 5s (timing indépendant). Réserve elle aussi son avis courant dans
 * `activeIdsRef` — jamais le même commentaire ici et dans une bulle en même
 * temps.
 */
function MainTestimonial({ pool, activeIdsRef }: { pool: TestimonialItem[]; activeIdsRef: React.MutableRefObject<Set<string>> }) {
  const [item, setItem] = useState<TestimonialItem | null>(null);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pool.length === 0) { setItem(null); return; }

    const pickNext = () => {
      if (currentIdRef.current) activeIdsRef.current.delete(currentIdRef.current);
      const next = pickAvailableItem(pool, activeIdsRef.current);
      activeIdsRef.current.add(next.id);
      currentIdRef.current = next.id;
      setItem(next);
    };

    pickNext();
    const id = setInterval(pickNext, 5000);
    return () => {
      clearInterval(id);
      if (currentIdRef.current) { activeIdsRef.current.delete(currentIdRef.current); currentIdRef.current = null; }
    };
  }, [pool, activeIdsRef]);

  if (!item) return null;

  return (
    <div className="relative z-10 max-w-2xl mx-auto text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5 }}
        >
          <TestimonialBubble item={item} variant="main" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Testimonials() {
  const { isAuthenticated } = useAuthStore();
  const { showError } = useToast();
  const fetched = useTestimonialsFeed();
  const pool = useMemo(() => fetched || [], [fetched]);
  const occupiedZonesRef = useRef<Set<number>>(new Set());
  const activeItemIdsRef = useRef<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openForm = () => {
    setSubmitted(false);
    setComment('');
    setShowForm(true);
  };

  const submit = async () => {
    if (comment.trim().length < 5) return;
    setSubmitting(true);
    try {
      await api.post('/testimonials', { comment: comment.trim() });
      setSubmitted(true);
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'envoi de votre avis.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-16">
      <div className="relative bg-gray-50 dark:bg-gray-800/40 rounded-3xl px-6 py-14 min-h-[560px] overflow-hidden">
        <p className="relative z-10 text-center text-gray-500 mb-8">Voyons ce que les gens pensent de <Brand /></p>

        <FloatingTestimonial pool={pool} occupiedRef={occupiedZonesRef} activeIdsRef={activeItemIdsRef} />
        <FloatingTestimonial pool={pool} occupiedRef={occupiedZonesRef} activeIdsRef={activeItemIdsRef} />

        <MainTestimonial pool={pool} activeIdsRef={activeItemIdsRef} />
      </div>

      {/* Retour client 2026-09-17 : le bouton doit être juste sous l'espace
          commentaires, pas dessus — sorti du cadre plutôt qu'empilé dans son
          padding bas, pour ne jamais chevaucher une bulle flottante. */}
      <div className="flex justify-center mt-6">
        <button type="button" onClick={openForm} className="btn-outline text-sm inline-flex items-center gap-2 bg-white dark:bg-gray-900">
          <MessageSquarePlus className="w-4 h-4" /> Laissez un avis sur boséjour
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Fermer"
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4" />
            </button>

            {!isAuthenticated ? (
              <div className="text-center pt-2">
                <p className="text-gray-700 dark:text-gray-200 mb-4">Connectez-vous pour laisser un avis sur <Brand />.</p>
                <div className="flex justify-center gap-3">
                  <Link href="/auth/login" className="btn-primary text-sm">Se connecter</Link>
                  <Link href="/auth/register" className="btn-outline text-sm">Créer un compte</Link>
                </div>
              </div>
            ) : submitted ? (
              <div className="text-center pt-2">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Merci !</p>
                <p className="text-sm text-gray-500">Votre avis sera visible après validation par notre équipe.</p>
                <button type="button" onClick={() => setShowForm(false)} className="btn-primary text-sm mt-4">Fermer</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Laissez un avis sur <Brand /></h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Partagez votre ressenti sur la plateforme..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || comment.trim().length < 5}
                  className="btn-primary text-sm mt-3 w-full disabled:opacity-50"
                >
                  {submitting ? 'Envoi...' : 'Envoyer mon avis'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
