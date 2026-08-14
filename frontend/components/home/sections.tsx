'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DollarSign, ShieldCheck, FileText, Sparkles, Sun, Leaf, Snowflake,
  Compass, Waves, Landmark, Eye, UtensilsCrossed, Moon, Play, Quote, Star,
} from 'lucide-react';
import DestinationCard, { DestinationCardData } from './DestinationCard';
import { cn } from '@/lib/utils';

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
  { icon: DollarSign, title: 'Pas de frais cachés', text: 'Tarification transparente sans frais cachés.' },
  { icon: ShieldCheck, title: 'Réservation instantanée', text: 'Confirmation par E-mail et WhatsApp juste après votre réservation.' },
  { icon: FileText, title: 'Flexibilité', text: 'Options flexibles avec annulation gratuite sur de nombreuses annonces.' },
];

export function TrustSection() {
  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
        className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-14"
      >
        Pourquoi les voyageurs font confiance à bo séjour ?
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
const SEASON_TABS = [
  { label: 'Choix de printemps', icon: Sparkles },
  { label: "Point chaud de l'été", icon: Sun },
  { label: "Évasion d'automne", icon: Leaf },
  { label: 'Escapade hivernale', icon: Snowflake },
];

const DESTINATIONS: DestinationCardData[] = [
  { name: 'Grand-Bassam', image: img('1520250497591-112f2f40a3f4'), fromPrice: 128000, tagline: 'Escapades romantiques, art et cafés.' },
  { name: 'Assinie', image: img('1573843981267-be1999ff37cd'), fromPrice: 145000, tagline: 'Plages, lagune et sérénité.' },
  { name: 'Man', image: img('1441974231531-c6227db76b6e'), fromPrice: 98000, tagline: 'Montagnes, cascades et nature.' },
  { name: 'Yamoussoukro', image: img('1566073771259-6a8506099945'), fromPrice: 110000, tagline: 'Patrimoine et grands espaces.' },
];

export function TrendingDestinations({ photos = [] }: { photos?: string[] }) {
  const [active, setActive] = useState(0);
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
      <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {DESTINATIONS.map((d, i) => <DestinationCard key={d.name} data={{ ...d, image: photos[i] || d.image }} />)}
      </Reveal>
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
  { title: 'Gagnez des récompenses', text: 'Bénéficiez d\'avantages en tant que membre bo séjour.' },
];

function SaveCard({ o }: { o: { title: string; text: string } }) {
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
const SITES = [
  { name: 'Grand-Bassam', flag: '🇨🇮', image: img('1441974231531-c6227db76b6e', 1000), big: true },
  { name: 'Man', flag: '🇨🇮', image: img('1506905925346-21bda4d32df4', 1000), big: true },
  { name: 'Assinie', flag: '🇨🇮', image: img('1507525428034-b723cf961d3e', 700) },
  { name: 'Yamoussoukro', flag: '🇨🇮', image: img('1502602898657-3e91760cbb34', 700) },
  { name: 'Sassandra', flag: '🇨🇮', image: img('1470071459604-3b5ec3a7fe05', 700) },
];

function SiteCard({ s, className = '' }: { s: typeof SITES[number]; className?: string }) {
  return (
    <Link href="/accommodations" className={`group relative block rounded-2xl overflow-hidden ${className}`}>
      <Image src={s.image} alt={s.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <span className="absolute top-4 left-4 text-white font-bold text-lg flex items-center gap-2">
        {s.name} <span>{s.flag}</span>
      </span>
    </Link>
  );
}

export function TopSites({ photos = [] }: { photos?: string[] }) {
  const sites = SITES.map((s, i) => ({ ...s, image: photos[i] || s.image }));
  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Principaux sites à voir</h2>
      <Reveal className="grid grid-cols-2 gap-5 mb-5">
        <SiteCard s={sites[0]} className="h-56" />
        <SiteCard s={sites[1]} className="h-56" />
      </Reveal>
      <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-5" delay={0.1}>
        <SiteCard s={sites[2]} className="h-52" />
        <SiteCard s={sites[3]} className="h-52" />
        <SiteCard s={sites[4]} className="h-52" />
      </Reveal>
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
const ACTIVITIES: { name: string; searchTerm: string; categories: ActivityCategory[]; image: string }[] = [
  { name: 'Plage de Grand-Bassam', searchTerm: 'Grand-Bassam', categories: ['plage'], image: img('1507525428034-b723cf961d3e', 500) },
  { name: 'San-Pédro, bord de mer', searchTerm: 'San-Pédro', categories: ['plage'], image: img('1520250497591-112f2f40a3f4', 500) },
  { name: 'Basilique de Yamoussoukro', searchTerm: 'Yamoussoukro', categories: ['musee'], image: img('1566073771259-6a8506099945', 500) },
  { name: 'Plateau, Abidjan', searchTerm: 'Plateau', categories: ['musee', 'voir'], image: img('1502602898657-3e91760cbb34', 500) },
  { name: 'Parc du Banco', searchTerm: 'Abidjan', categories: ['voir'], image: img('1441974231531-c6227db76b6e', 500) },
  { name: 'Lagune Ébrié', searchTerm: 'Abidjan', categories: ['voir'], image: img('1520250497591-112f2f40a3f4', 500) },
  { name: 'Cascades de Man', searchTerm: 'Man', categories: ['voir'], image: img('1506905925346-21bda4d32df4', 500) },
  { name: 'Marché de Treichville', searchTerm: 'Abidjan', categories: ['nourriture'], image: img('1502602898657-3e91760cbb34', 500) },
  { name: 'Rue Princesse, Yopougon', searchTerm: 'Yopougon', categories: ['nourriture', 'vie_nocturne'], image: img('1441974231531-c6227db76b6e', 500) },
  { name: 'Zone 4, Marcory', searchTerm: 'Marcory', categories: ['vie_nocturne'], image: img('1506905925346-21bda4d32df4', 500) },
];

export function Activities({ photos = [] }: { photos?: string[] }) {
  const [active, setActive] = useState(0);
  const category = ACT_TABS[active].category;
  const filtered = category === 'all' ? ACTIVITIES : ACTIVITIES.filter((a) => a.categories.includes(category));

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
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Aucune activité dans cette catégorie pour le moment.</p>
      ) : (
        <Reveal className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {filtered.map((a, i) => (
            <Link key={a.name} href={`/accommodations?search=${encodeURIComponent(a.searchTerm)}`} className="group">
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                <Image src={photos[i] || a.image} alt={a.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="16vw" />
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
/* 6. Explorez en mouvement (vidéos)                                   */
/* ------------------------------------------------------------------ */
const VIDEOS = [
  { name: 'Assinie, Côte d\'Ivoire', image: img('1573843981267-be1999ff37cd', 500), stars: 4 },
  { name: 'Man, Côte d\'Ivoire', image: img('1506905925346-21bda4d32df4', 500), stars: 5 },
  { name: 'Grand-Bassam, Côte d\'Ivoire', image: img('1520250497591-112f2f40a3f4', 500), stars: 5 },
];

export function VideoShowcase({ photos = [] }: { photos?: string[] }) {
  const videos = VIDEOS.map((v, i) => ({ ...v, image: photos[i] || v.image }));
  const heroImg = photos[3] || img('1470071459604-3b5ec3a7fe05', 1200);
  return (
    <section className="bg-gray-50 dark:bg-gray-900/40 py-16">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Explorez bo séjour en mouvement</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-[360px] ring-4 ring-primary/30">
            <Image src={heroImg} alt="Luxe" fill className="object-cover" sizes="66vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/10" />
            <div className="relative z-10 p-8 md:p-12 max-w-lg text-white h-full flex flex-col justify-center">
              <h3 className="text-3xl md:text-4xl font-bold">Entrez dans un monde du luxe</h3>
              <p className="mt-3 text-white/90">Plongez-vous dans des visuels captivants de nos destinations les plus emblématiques.</p>
              <Link href="/accommodations" className="btn-primary mt-6 w-fit">Explorer toutes les vidéos</Link>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            {videos.map((v) => (
              <div key={v.name} className="relative rounded-2xl overflow-hidden h-[112px] flex-1 group">
                <Image src={v.image} alt={v.name} fill className="object-cover" sizes="33vw" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary fill-primary ml-0.5" />
                </span>
                <div className="absolute bottom-2 left-3 text-white text-sm font-medium drop-shadow">
                  {v.name}
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < v.stars ? 'fill-[#F7C948] text-[#F7C948]' : 'text-white/50'}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

export function Testimonials() {
  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl py-16">
      <div className="relative bg-gray-50 dark:bg-gray-800/40 rounded-3xl px-6 py-14 min-h-[520px] overflow-hidden">
        <p className="text-center text-gray-500 mb-8">Voyons ce que les gens pensent de bo séjour</p>

        {/* avatars dispersés (desktop) */}
        <div className="hidden md:block">
          {RING_AVATARS.map((a, i) => (
            <span key={i} className={`absolute ${a.pos}`}>
              <RingAvatar src={a.src} size={a.size} ring={a.ring} />
            </span>
          ))}
        </div>

        {/* avatar central */}
        <div className="flex justify-center mb-6">
          <RingAvatar src={portrait('1500648767791-00dcc994a43e', 300)} size="w-24 h-24 md:w-28 md:h-28" ring="from-rose-400 to-pink-300" />
        </div>

        {/* citation */}
        <div className="relative max-w-2xl mx-auto text-center">
          <Quote className="hidden md:block absolute -left-6 top-0 w-10 h-10 text-rose-300 fill-rose-300/40" />
          <Quote className="hidden md:block absolute -right-6 bottom-8 w-10 h-10 text-rose-300 fill-rose-300/40 rotate-180" />
          <p className="text-lg md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
            Cet endroit est exactement comme la photo publiée sur bo séjour. Excellent service, nous avons passé un excellent séjour !
          </p>
          <p className="mt-6 font-bold text-lg text-gray-900 dark:text-white">Ethan Rogrinho</p>
          <p className="text-sm text-gray-500 mt-1">🇲🇾 Malaisie</p>
        </div>
      </div>
    </section>
  );
}
