'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DollarSign, ShieldCheck, FileText,
  Compass, Waves, Landmark, Eye, UtensilsCrossed, Moon, Play, Quote, Star,
  Briefcase, Palmtree,
} from 'lucide-react';
import api from '@/lib/api';
import DestinationCard, { DestinationCardData } from './DestinationCard';
import { cn, resolveImageUrl } from '@/lib/utils';
import Brand from '@/components/common/Brand';

/** Image Unsplash (le domaine est autorisé + images non optimisées) */
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Portrait Unsplash */
const portrait = (id: string, w = 200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=3&w=${w}&h=${w}&q=80`;

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
// Avatars décoratifs (positions + anneaux colorés façon design)
const RING_AVATARS = [
  { src: portrait('1494790108377-be9c29b29330'), pos: 'top-10 left-[20%]', size: 'w-14 h-14', ring: 'from-teal-400 to-cyan-200' },
  { src: portrait('1438761681033-6461ffad8d80'), pos: 'top-16 right-[20%]', size: 'w-14 h-14', ring: 'from-amber-300 to-orange-200' },
  { src: portrait('1544005313-94ddf0286df2'), pos: 'top-1/2 left-[8%]', size: 'w-14 h-14', ring: 'from-yellow-300 to-amber-200' },
  { src: portrait('1472099645785-5658abf4ff4e'), pos: 'bottom-16 right-[9%]', size: 'w-14 h-14', ring: 'from-teal-300 to-emerald-200' },
  { src: portrait('1534528741775-53994a69daeb'), pos: 'bottom-8 left-[30%]', size: 'w-12 h-12', ring: 'from-pink-300 to-rose-200' },
  { src: portrait('1519085360753-af0119f7cbe7'), pos: 'bottom-12 right-[33%]', size: 'w-12 h-12', ring: 'from-emerald-300 to-teal-200' },
];

function RingAvatar({ src, size, ring, className = '' }: { src: string; size: string; ring: string; className?: string }) {
  return (
    <span className={`inline-block p-0.5 rounded-full bg-gradient-to-tr ${ring} ${className}`}>
      <span className={`relative block ${size} rounded-full overflow-hidden ring-2 ring-white`}>
        <Image src={src} alt="Voyageur" fill className="object-cover" sizes="80px" />
      </span>
    </span>
  );
}

// Retour client 2026-09-16/17 : remplace la citation unique inventée
// ("Ethan Rogrinho", Malaisie — nom et pays fictifs) par les avis réels
// transmis par le client (espace commentaires BoSéjour). Aucun nom ne les
// accompagnait — plutôt que d'en inventer un, la citation défile parmi les
// avis réels sans attribution fictive.
const REAL_REVIEWS = [
  "Très bonne découverte ! Le site est simple à utiliser et surtout rapide pour trouver un hébergement. Je recommande.",
  "J'aime beaucoup le concept de BoSéjour. On retrouve facilement les établissements et les informations sont claires. C'est vraiment pratique.",
  "Site très fluide et facile à utiliser. Ça fait plaisir d'avoir une plateforme qui permet de rechercher rapidement un hébergement en Côte d'Ivoire.",
  "Franchement, belle plateforme ! Simple, rapide et rassurante. Je pense que je vais passer par BoSéjour pour mes prochaines réservations.",
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % REAL_REVIEWS.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-16">
      <div className="relative bg-gray-50 dark:bg-gray-800/40 rounded-3xl px-6 py-14 min-h-[520px] overflow-hidden">
        <p className="text-center text-gray-500 mb-8">Voyons ce que les gens pensent de <Brand /></p>

        {/* avatars dispersés (desktop) */}
        <div className="hidden md:block">
          {RING_AVATARS.map((a, i) => (
            <span key={i} className={`absolute ${a.pos}`}>
              <RingAvatar src={a.src} size={a.size} ring={a.ring} />
            </span>
          ))}
        </div>

        {/* citation — avis réels, défilent (pas de nom/pays/photo : non fournis) */}
        <div className="relative max-w-2xl mx-auto text-center mt-4">
          <Quote className="hidden md:block absolute -left-6 top-0 w-10 h-10 text-rose-300 fill-rose-300/40" />
          <Quote className="hidden md:block absolute -right-6 bottom-8 w-10 h-10 text-rose-300 fill-rose-300/40 rotate-180" />
          <p className="text-lg md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed min-h-[6rem] md:min-h-[4rem] flex items-center justify-center">
            {REAL_REVIEWS[active]}
          </p>
          <div className="flex justify-center gap-1.5 mt-6">
            {REAL_REVIEWS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Avis ${i + 1}`}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
