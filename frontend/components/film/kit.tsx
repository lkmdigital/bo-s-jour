/* eslint-disable @next/next/no-img-element -- maquettes animées image par image :
   next/image (chargement paresseux, conteneurs `fill`) gênerait le minutage. */
import type { CSSProperties, ReactNode } from 'react';
import {
  LOGO_VIEWBOX,
  LOGO_PATHS,
  ACCENT_TRANSFORM,
  SLOGAN_GLYPHS,
  SLOGAN_BASELINE,
  SLOGAN_USES,
} from '@/components/intro/brandIntroLogo';

/*
 * Boîte à outils du film de présentation.
 *
 * Tout est piloté par le temps : chaque scène reçoit `t` (secondes écoulées
 * depuis son début) et en déduit ses styles. Aucune animation CSS ni état
 * interne : on peut donc mettre en pause, avancer ou reculer n'importe où et
 * obtenir toujours la même image.
 */

export const RED = '#FF0000';

export interface SceneProps {
  /** Secondes écoulées depuis le début de la scène */
  t: number;
  /** Écran plus haut que large : mise en page verticale */
  portrait: boolean;
}

// ─── Temps & interpolation ────────────────────────────────────────────────

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Progression 0 → 1 entre `at` et `at + dur` */
export const seg = (t: number, at: number, dur = 0.6) => clamp((t - at) / dur);

/** Apparition : fondu + glissement (+ zoom éventuel) */
export function enter(
  t: number,
  at: number,
  { dur = 0.6, x = 0, y = 24, scale = 1, back = false }: { dur?: number; x?: number; y?: number; scale?: number; back?: boolean } = {}
): CSSProperties {
  const raw = seg(t, at, dur);
  const p = back ? easeBack(raw) : easeOut(raw);
  return {
    opacity: clamp(raw * 1.6),
    transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${lerp(scale, 1, p)})`,
  };
}

/** Bosse 0 → 1 → 0 sur `dur` secondes (surbrillances, impulsions) */
export const pulse = (t: number, at: number, dur = 1) => {
  const p = seg(t, at, dur);
  return p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI);
};

/** Texte tapé au clavier */
export const typed = (text: string, t: number, at: number, cps = 14) =>
  text.slice(0, clamp(Math.floor((t - at) * cps), 0, text.length));

/** Nombre d'instants déjà passés (pour des états successifs) */
export const stepAt = (t: number, times: number[]) => times.filter((x) => t >= x).length;

/** Valeur qui glisse d'un palier au suivant à chaque instant donné */
export function tween(t: number, keys: Array<[at: number, value: number]>, dur = 0.5) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    v = lerp(v, keys[i][1], easeInOut(seg(t, keys[i][0], dur)));
  }
  return v;
}

/** Position d'un curseur le long d'étapes [instant, x, y] */
export function along(t: number, keys: Array<[at: number, x: number, y: number]>) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    const [t0, x0, y0] = keys[i - 1];
    const [t1, x1, y1] = keys[i];
    if (t <= t1) {
      const p = easeInOut(clamp((t - t0) / (t1 - t0)));
      return { x: lerp(x0, x1, p), y: lerp(y0, y1, p) };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last[1], y: last[2] };
}

/** Le curseur est-il « enfoncé » (clic) à cet instant ? */
export const pressed = (t: number, clicks: number[]) => clicks.some((c) => t >= c && t < c + 0.18);

export const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;

export const photo = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Photos déjà utilisées par le site (toutes vérifiées) */
export const PHOTOS = {
  hero: '1566073771259-6a8506099945',
  resort: '1571003123894-1f0594d2b5d9',
  room: '1582719478250-c89cae4dc85b',
  nature: '1470071459604-3b5ec3a7fe05',
  poolResort: '1520250497591-112f2f40a3f4',
  hotel: '1551882547-ff40c63fe5fa',
  hotelFront: '1542314831-068cd1dbfeeb',
  room2: '1590490360182-c33d57733427',
  room3: '1611892440504-42a792e24d32',
  beach: '1507525428034-b723cf961d3e',
  bedroom: '1505693416388-ac5ce068fe85',
  resort2: '1540541338287-41700207dee6',
  beachHouse: '1499793983690-e29da59ef1c2',
  villa: '1596394516093-501ba68a0ba6',
  pool: '1584132967334-10e028bd69f7',
  room4: '1631049307264-da0ec9d70304',
  lobby: '1564501049412-61c2a3083791',
  resort3: '1445019980597-93fa8acb246c',
} as const;

export function Photo({ id, w = 800, className = '', style }: { id: string; w?: number; className?: string; style?: CSSProperties }) {
  return <img src={photo(id, w)} alt="" draggable={false} className={`object-cover ${className}`} style={style} />;
}

// ─── Mise à l'échelle ─────────────────────────────────────────────────────

/** Affiche un élément de taille fixe (w × h) réduit/agrandi d'un facteur `scale` */
export function Scaled({ w, h, scale, children, style }: { w: number; h: number; scale: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ width: w * scale, height: h * scale, position: 'relative', flexShrink: 0, ...style }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Appareils ─────────────────────────────────────────────────────────────

export const DESKTOP = { w: 1000, h: 650, bar: 36 } as const;
export const PHONE = { w: 300, h: 620 } as const;

export function DesktopFrame({ children, url = 'bosejour.ci' }: { children: ReactNode; url?: string }) {
  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ width: DESKTOP.w, height: DESKTOP.h, boxShadow: '0 30px 80px -20px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.08)' }}
    >
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4" style={{ height: DESKTOP.bar }}>
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        <div className="mx-auto flex h-6 w-[380px] items-center justify-center gap-1.5 rounded-md bg-white text-[12px] text-gray-500">
          <LockIcon className="h-3 w-3" /> {url}
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ height: DESKTOP.h - DESKTOP.bar }}>
        {children}
      </div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative rounded-[46px] bg-[#111] p-[10px]"
      style={{ width: PHONE.w, height: PHONE.h, boxShadow: '0 30px 70px -15px rgba(0,0,0,.45), inset 0 0 0 2px #333' }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-white">
        <div className="absolute inset-x-0 top-0 z-20 flex h-[40px] items-center justify-between px-6 text-[12px] font-semibold text-black">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[2px]">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[3px] rounded-sm bg-black" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-black p-[1px]">
              <span className="block h-full w-[75%] rounded-[1px] bg-black" />
            </span>
          </span>
        </div>
        <div className="absolute left-1/2 top-[10px] z-30 h-[24px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-0 pt-[40px]">{children}</div>
      </div>
    </div>
  );
}

/** Curseur de souris */
export function Cursor({ x, y, down = false, visible = 1 }: { x: number; y: number; down?: boolean; visible?: number }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute z-50"
      style={{ left: x, top: y, opacity: visible, transform: `scale(${down ? 0.85 : 1})`, transformOrigin: '4px 3px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }}
    >
      <path d="M4 2 L4 20 L9 15.5 L12.5 22.5 L15.5 21 L12 14 L18.5 14 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Onde de toucher (mobile) */
export function Tap({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  const p = seg(t, at, 0.5);
  if (p <= 0 || p >= 1) return null;
  return (
    <span
      className="pointer-events-none absolute z-50 rounded-full"
      style={{
        left: x - 22,
        top: y - 22,
        width: 44,
        height: 44,
        background: 'rgba(0,0,0,.18)',
        border: '2px solid rgba(255,255,255,.9)',
        transform: `scale(${0.4 + p * 0.8})`,
        opacity: 1 - p,
      }}
    />
  );
}

/** Anneau de mise en évidence, `p` de 0 à 1 */
export function Ring({ p, radius = 12, inset = -6 }: { p: number; radius?: number; inset?: number }) {
  if (p <= 0) return null;
  return (
    <span
      className="pointer-events-none absolute z-40"
      style={{ inset, borderRadius: radius, border: `3px solid ${RED}`, boxShadow: `0 0 0 ${6 * p}px rgba(255,0,0,${0.18 * p})`, opacity: p }}
    />
  );
}

// ─── Icônes (traits simples, pas de dépendance) ───────────────────────────

type IconProps = { className?: string; style?: CSSProperties };
const icon = (d: ReactNode) =>
  function Icon({ className = 'h-4 w-4', style }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        {d}
      </svg>
    );
  };

export const LockIcon = icon(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const PinIcon = icon(<><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>);
export const CalendarIcon = icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const UsersIcon = icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const StarIcon = ({ className = 'h-4 w-4', filled = true }: { className?: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? '#F5A400' : 'none'} stroke="#F5A400" strokeWidth="1.8" strokeLinejoin="round">
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
export const CheckIcon = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const WifiIcon = icon(<><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.2a5 5 0 0 1 6 0" /><circle cx="12" cy="19.5" r="1" /></>);
export const PoolIcon = icon(<><path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 9h8" /></>);
export const SnowIcon = icon(<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5" />);
export const CarIcon = icon(<><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v3H3z" /><circle cx="7.5" cy="13" r="1" /><circle cx="16.5" cy="13" r="1" /></>);
export const CoffeeIcon = icon(<><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3" /></>);
export const UtensilsIcon = icon(<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M9 3v5a2 2 0 0 1-2 2M17 21V3c-2 1-3.5 3.5-3.5 7 0 2 1.5 3 3.5 3" />);
export const WaveIcon = icon(<path d="M2 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 9c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />);
export const ShieldIcon = icon(<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>);
export const MailIcon = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>);
export const ChatIcon = icon(<path d="M4 5h16v11H9l-5 4z" />);
export const GiftIcon = icon(<><rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12M12 9C10 4 6 5 7.5 7.5 8.5 9 12 9 12 9zm0 0c2-5 6-4 4.5-1.5C15.5 9 12 9 12 9z" /></>);
export const BuildingIcon = icon(<><path d="M4 21V5l8-2v18M12 21h8V9l-8-2" /><path d="M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01" /></>);
export const LeafIcon = icon(<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7" />);
export const BedIcon = icon(<><path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6" /><circle cx="7" cy="11" r="2" /></>);
export const HomeIcon = icon(<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>);
export const ChevronLeft = icon(<path d="m15 5-7 7 7 7" />);
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);

// ─── Logo officiel, assemblé pièce par pièce ──────────────────────────────

const pieceStyle = (t: number, at: number, kind: 'pop' | 'rise' | 'drop' | 'fade' | 'scale', dur = 0.45): CSSProperties => {
  const raw = seg(t, at, dur);
  const p = kind === 'fade' ? easeOut(raw) : easeBack(raw);
  const base: CSSProperties = { transformBox: 'fill-box', transformOrigin: kind === 'drop' ? '50% 100%' : 'center' };
  switch (kind) {
    case 'scale':
      return { ...base, transform: `scale(${p})` };
    case 'pop':
      return { ...base, opacity: clamp(raw * 2), transform: `scale(${lerp(0.4, 1, p)}) rotate(${(1 - p) * -10}deg)` };
    case 'rise':
      return { ...base, opacity: clamp(raw * 2), transform: `translateY(${(1 - p) * 36}px)` };
    case 'drop':
      return { ...base, opacity: clamp(raw * 2), transform: `translateY(${(1 - p) * -60}px)` };
    default:
      return { ...base, opacity: p, transform: `translateY(${(1 - p) * 8}px)` };
  }
};

/** Logo boséjour (tracés officiels de la charte), assemblé à partir de `at` */
export function AnimatedLogo({ t, at = 0, className, style }: { t: number; at?: number; className?: string; style?: CSSProperties }) {
  const word: Array<keyof typeof LOGO_PATHS> = ['s', 'e', 'j', 'o2', 'u', 'r'];
  const dotsFrom = SLOGAN_USES.length - 3;
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} style={{ overflow: 'visible', ...style }} aria-label="boséjour">
      <defs>
        {Object.entries(SLOGAN_GLYPHS).map(([id, d]) => (
          <path key={id} id={`film-${id}`} d={d} />
        ))}
      </defs>
      <path d={LOGO_PATHS.circle} fill="#000" style={pieceStyle(t, at, 'scale', 0.5)} />
      <path d={LOGO_PATHS.b} fill={RED} style={pieceStyle(t, at + 0.3, 'pop')} />
      <path d={LOGO_PATHS.o} fill={RED} style={pieceStyle(t, at + 0.38, 'pop')} />
      {word.map((k, i) => (
        <path key={k} d={LOGO_PATHS[k]} fill="#000" style={pieceStyle(t, at + 0.45 + i * 0.07, 'rise')} />
      ))}
      <g style={pieceStyle(t, at + 1.05, 'fade', 0.3)}>
        <path d={LOGO_PATHS.accent} transform={ACCENT_TRANSFORM} fill="none" stroke="#1D1D1B" strokeWidth={4} />
      </g>
      <g fill="#000">
        {SLOGAN_USES.map(([id, x], i) => (
          <use
            key={i}
            href={`#film-${id}`}
            x={x}
            y={SLOGAN_BASELINE}
            style={i < dotsFrom ? pieceStyle(t, at + 1.3 + i * 0.018, 'fade', 0.3) : pieceStyle(t, at + 1.9 + (i - dotsFrom) * 0.12, 'fade', 0.25)}
          />
        ))}
      </g>
      <path d={LOGO_PATHS.pin} fill={RED} style={pieceStyle(t, at + 0.9, 'drop', 0.5)} />
    </svg>
  );
}

// ─── Habillage commun des scènes ──────────────────────────────────────────

/** Fond clair des scènes « produit » */
export function LightBackdrop({ t }: { t: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#FBF8F3' }}>
      <div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 900,
          right: -300,
          bottom: -420,
          background: 'radial-gradient(circle, rgba(255,0,0,.16), rgba(255,0,0,0) 65%)',
          transform: `translate(${Math.sin(t / 3) * 20}px, ${Math.cos(t / 4) * 14}px)`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, left: -260, top: -280, background: 'radial-gradient(circle, rgba(247,232,198,.9), rgba(247,232,198,0) 70%)' }}
      />
    </div>
  );
}

/** Bloc de titre d'étape : numéro, titre, sous-titre et puces optionnelles */
export function StepTitle({
  t,
  n,
  title,
  sub,
  chips = [],
  at = 0.2,
  portrait,
}: {
  t: number;
  n?: string;
  title: string;
  sub?: string;
  chips?: Array<{ at: number; label: ReactNode }>;
  at?: number;
  portrait: boolean;
}) {
  return (
    <div className={portrait ? 'text-center' : ''}>
      {n && (
        <div className="mb-3 font-bold tracking-[0.2em] text-[#FF0000]" style={{ fontSize: 22, ...enter(t, at, { y: 12 }) }}>
          {n}
        </div>
      )}
      <h2 className="font-extrabold leading-[1.05] text-black" style={{ fontSize: portrait ? 64 : 56, letterSpacing: '-0.02em', ...enter(t, at + 0.12, { y: 30 }) }}>
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-[#4B5F5A]" style={{ fontSize: portrait ? 28 : 22, lineHeight: 1.35, ...enter(t, at + 0.3, { y: 20 }) }}>
          {sub}
        </p>
      )}
      {chips.length > 0 && (
        <div className={`mt-6 flex flex-wrap gap-3 ${portrait ? 'justify-center' : ''}`}>
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 font-semibold text-white"
              style={{ fontSize: portrait ? 24 : 19, ...enter(t, c.at, { y: 14, scale: 0.8, back: true, dur: 0.45 }) }}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mise en page standard d'une scène : texte + appareil.
 * Paysage (1280 × 720) : texte à gauche, appareil à droite.
 * Portrait (720 × 1280) : texte en haut, appareil dessous.
 */
export function Split({ portrait, text, children }: { portrait: boolean; text: ReactNode; children: ReactNode }) {
  if (portrait) {
    return (
      <>
        <div className="absolute inset-x-[50px] top-[70px] flex h-[290px] flex-col justify-center">{text}</div>
        <div className="absolute inset-x-[20px] bottom-[60px] top-[380px] flex items-center justify-center">{children}</div>
      </>
    );
  }
  return (
    <>
      <div className="absolute bottom-0 left-[70px] top-0 flex w-[420px] flex-col justify-center">{text}</div>
      <div className="absolute bottom-[40px] left-[510px] right-[30px] top-[40px] flex items-center justify-center">{children}</div>
    </>
  );
}

/** Facteurs d'échelle des appareils selon l'orientation */
export const deviceScale = (portrait: boolean) => ({
  desktop: portrait ? 0.67 : 0.72,
  phone: portrait ? 1.36 : 0.98,
});
