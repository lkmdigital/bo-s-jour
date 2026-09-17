'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Building2, Home, BedDouble, TreePalm } from 'lucide-react';
import SearchInputWithAutocomplete from './SearchInputWithAutocomplete';
import { useSearchStore } from '@/stores/searchStore';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn, toDateInputValue } from '@/lib/utils';

interface SearchParams {
  search?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  city?: string;
  type?: string;
}

interface HeroSectionProps {
  onSearch: (params: SearchParams) => void;
  initialValues?: SearchParams;
}

// Alignés sur l'enum réel de la base (Accommodation.type) et sur les filtres de
// /accommodations — un type choisi ici doit produire de vrais résultats filtrés,
// jamais une valeur inconnue silencieusement ignorée.
const PROPERTY_TYPES = [
  { key: 'hotel', label: 'Hôtel', icon: Building2 },
  { key: 'lodge', label: 'Écolodge', icon: TreePalm },
  { key: 'guesthouse', label: "Maison d'hôtes", icon: BedDouble },
  { key: 'apartment', label: 'Résidence', icon: Home },
];

// Diaporama du hero (change toutes les 3 s)
const unsplash = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const SLIDES = [
  '/images/bg.jpeg',
  unsplash('1566073771259-6a8506099945'),
  unsplash('1571003123894-1f0594d2b5d9'),
  unsplash('1582719478250-c89cae4dc85b'),
];

/** Champ date façon maquette : affiche « Ajouter des dates » puis la date choisie */
function DateField({ label, value, onChange, min, disabled }: {
  label: string; value: string; onChange: (v: string) => void; min?: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const formatted = value
    ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '';
  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (el?.showPicker) el.showPicker();
    else el?.focus();
  };
  return (
    <div className="relative flex-1 px-5 py-3 lg:border-r border-gray-200">
      <p className="text-[15px] font-semibold text-gray-900 mb-0.5">{label}</p>
      <button type="button" onClick={open} disabled={disabled}
        className={cn('text-sm text-left w-full', formatted ? 'text-gray-700' : 'text-gray-400', disabled && 'opacity-50')}>
        {formatted || 'Ajouter des dates'}
      </button>
      <input ref={ref} type="date" value={value} min={min} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none" tabIndex={-1} />
    </div>
  );
}

export default function HeroSection({ onSearch, initialValues }: HeroSectionProps) {
  const { session, setSearchSession } = useSearchStore();
  const [search, setSearch] = useState(initialValues?.search || session?.search || '');
  const [city, setCity] = useState(initialValues?.city || session?.city || '');
  const [checkIn, setCheckIn] = useState(initialValues?.checkIn || session?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialValues?.checkOut || session?.checkOut || '');
  const [type, setType] = useState(initialValues?.type || session?.type || 'hotel');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (session && !initialValues?.checkIn) {
      setCheckIn(session.checkIn || '');
      setCheckOut(session.checkOut || '');
      setSearch(session.search || '');
      setCity(session.city || '');
      if (session.type) setType(session.type);
    }
  }, [session]);

  const today = toDateInputValue(new Date());
  const minCheckOut = checkIn || today;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: SearchParams = {
      search: search.trim() || undefined,
      city: city.trim() || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      type,
    };
    setSearchSession(params);
    onSearch(params);
  };

  return (
    <section className="relative bg-white dark:bg-gray-950 pb-16 pt-16">
      {/* Image : diaporama + bords bas légèrement arrondis */}
      <div className="relative h-[540px] md:h-[600px] rounded-b-[2.5rem] overflow-hidden">
        {SLIDES.map((src, i) => (
          <div
            key={i}
            className={cn('absolute inset-0 transition-opacity duration-1000 ease-in-out', i === slide ? 'opacity-100' : 'opacity-0')}
          >
            <Image src={src} alt="Hébergement en Côte d'Ivoire" fill priority={i === 0} className="object-cover" sizes="100vw" />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/35" />

        {/* Titre centré */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white w-full px-4 pb-28">
          <motion.h1
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold italic drop-shadow-lg xl:whitespace-nowrap"
          >
            Votre séjour commence ici...
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg md:text-2xl font-medium drop-shadow xl:whitespace-nowrap"
          >
            Trouvez des séjours uniques dans des hôtels, des résidences et bien plus encore.
          </motion.p>
        </div>
      </div>

      {/* Carte de recherche (chevauche le bord bas de l'image) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-20 -mt-28 md:-mt-24 w-full max-w-5xl mx-auto px-4"
      >
        {/* Onglets type de bien */}
        <div className="flex justify-center relative z-20">
          <div className="flex gap-1 overflow-x-auto max-w-full bg-gradient-to-r from-neutral-800 to-black rounded-full p-1.5 shadow-xl">
            {PROPERTY_TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'bg-white text-black' : 'text-white/90 hover:bg-white/10'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulaire (chevauche les onglets) */}
        <form onSubmit={handleSubmit} className="-mt-6 bg-white rounded-3xl shadow-2xl px-2 pt-8 pb-2">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            {/* Destination */}
            <div className="flex-[1.4] px-5 py-3 lg:border-r border-gray-200">
              <p className="text-[15px] font-semibold text-gray-900 mb-0.5">Destination</p>
              <SearchInputWithAutocomplete
                value={city || search}
                onChange={(value, kind, extra) => {
                  setSearch(value);
                  if (kind === 'city') setCity(value);
                  else if (kind === 'accommodation' && extra?.city) setCity(extra.city);
                  else setCity(value);
                }}
                placeholder="Où allez-vous ?"
                showIcon={false}
                inputClassName="!border-0 !p-0 text-gray-500 placeholder-gray-400 focus:ring-0 focus:outline-none text-sm w-full"
              />
            </div>

            {/* Arrivée */}
            <DateField label="Arrivée" value={checkIn} min={today}
              onChange={(v) => { setCheckIn(v); if (checkOut && v && checkOut < v) setCheckOut(''); }} />

            {/* Départ */}
            <DateField label="Départ" value={checkOut} min={minCheckOut} disabled={!checkIn}
              onChange={setCheckOut} />

            {/* Bouton Rechercher */}
            <div className="p-2 flex">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap transition-all hover:scale-[1.02] active:scale-95 w-full md:w-auto"
              >
                <Search className="w-5 h-5" />
                Rechercher
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
