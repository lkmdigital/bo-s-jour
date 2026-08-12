import { create } from 'zustand';

export type TextScale = 'normal' | 'large' | 'larger';
export type PriceFormat = 'standard' | 'compact';
export type Density = 'comfortable' | 'compact';
export type DefaultSort = 'recommended' | 'price_asc' | 'price_desc' | 'rating';
export type LandingPage = 'home' | 'dashboard' | 'reservations' | 'recherche';

export const LANDING_PAGE_ROUTES: Record<LandingPage, string> = {
  home: '/',
  dashboard: '/dashboard/user',
  reservations: '/dashboard/user/reservations',
  recherche: '/dashboard/user/recherche',
};

interface AppearanceState {
  reduceMotion: boolean;
  textScale: TextScale;
  priceFormat: PriceFormat;
  density: Density;
  resultsPerPage: number;
  defaultSort: DefaultSort;
  landingPage: LandingPage;

  setReduceMotion: (v: boolean) => void;
  setTextScale: (v: TextScale) => void;
  setPriceFormat: (v: PriceFormat) => void;
  setDensity: (v: Density) => void;
  setResultsPerPage: (v: number) => void;
  setDefaultSort: (v: DefaultSort) => void;
  setLandingPage: (v: LandingPage) => void;
  reset: () => void;
}

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) === '1';
}
function readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return (allowed as readonly string[]).includes(v || '') ? (v as T) : fallback;
}
function readInt(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = parseInt(localStorage.getItem(key) || '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const KEYS = {
  reduceMotion: 'reduce_motion',
  textScale: 'text_scale',
  priceFormat: 'price_format',
  density: 'display_density',
  resultsPerPage: 'results_per_page',
  defaultSort: 'default_sort',
  landingPage: 'landing_page',
} as const;

export const useAppearanceStore = create<AppearanceState>((set) => ({
  reduceMotion: readBool(KEYS.reduceMotion),
  textScale: readEnum<TextScale>(KEYS.textScale, ['normal', 'large', 'larger'], 'normal'),
  priceFormat: readEnum<PriceFormat>(KEYS.priceFormat, ['standard', 'compact'], 'standard'),
  density: readEnum<Density>(KEYS.density, ['comfortable', 'compact'], 'comfortable'),
  resultsPerPage: readInt(KEYS.resultsPerPage, 9),
  defaultSort: readEnum<DefaultSort>(KEYS.defaultSort, ['recommended', 'price_asc', 'price_desc', 'rating'], 'recommended'),
  landingPage: readEnum<LandingPage>(KEYS.landingPage, ['home', 'dashboard', 'reservations', 'recherche'], 'home'),

  setReduceMotion: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.reduceMotion, v ? '1' : '0'); set({ reduceMotion: v }); },
  setTextScale: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.textScale, v); set({ textScale: v }); },
  setPriceFormat: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.priceFormat, v); set({ priceFormat: v }); },
  setDensity: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.density, v); set({ density: v }); },
  setResultsPerPage: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.resultsPerPage, String(v)); set({ resultsPerPage: v }); },
  setDefaultSort: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.defaultSort, v); set({ defaultSort: v }); },
  setLandingPage: (v) => { if (typeof window !== 'undefined') localStorage.setItem(KEYS.landingPage, v); set({ landingPage: v }); },

  reset: () => {
    if (typeof window !== 'undefined') {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    }
    set({
      reduceMotion: false,
      textScale: 'normal',
      priceFormat: 'standard',
      density: 'comfortable',
      resultsPerPage: 9,
      defaultSort: 'recommended',
      landingPage: 'home',
    });
  },
}));
