/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import {
  type SceneProps,
  clamp,
  lerp,
  seg,
  easeOut,
  easeInOut,
  enter,
  pulse,
  typed,
  stepAt,
  tween,
  along,
  pressed,
  fcfa,
  PHOTOS,
  Photo,
  Scaled,
  DESKTOP,
  DesktopFrame,
  Cursor,
  Ring,
  AnimatedLogo,
  LightBackdrop,
  StepTitle,
  Split,
  deviceScale,
  PinIcon,
  CalendarIcon,
  UsersIcon,
  SearchIcon,
  StarIcon,
  CheckIcon,
  ShieldIcon,
  WifiIcon,
  PoolIcon,
  SnowIcon,
  CarIcon,
  CoffeeIcon,
  UtensilsIcon,
  BuildingIcon,
  LeafIcon,
  BedIcon,
  HomeIcon,
} from './kit';

/*
 * Scènes 1 à 5 : intro, promesse, recherche, résultats, fiche.
 * `t` = secondes depuis le début de la scène ; les commentaires « voix » donnent
 * l'instant approximatif où la voix off prononce le mot illustré.
 */

/** Petit en-tête de site commun aux maquettes ordinateur */
function SiteHeader({ children, dark = false }: { children?: ReactNode; dark?: boolean }) {
  return (
    <div className={`relative z-10 flex h-[56px] items-center gap-6 px-6 ${dark ? '' : 'border-b border-gray-100 bg-white'}`}>
      <AnimatedLogo t={99} className="h-[34px] w-auto" />
      <div className="flex-1">{children}</div>
      <div className={`flex items-center gap-5 text-[13px] font-medium ${dark ? 'text-white' : 'text-gray-700'}`}>
        <span>Hébergements</span>
        <span>Destinations</span>
        <span>Devenir partenaire</span>
        <span className={`rounded-full px-4 py-1.5 ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>Connexion</span>
      </div>
    </div>
  );
}

// ─── 1. Intro (0 → 10 s) ──────────────────────────────────────────────────

export function SceneIntro({ t, portrait }: SceneProps) {
  const flood = easeInOut(seg(t, 0.6, 0.9));
  const out = seg(t, 9.2, 0.8);
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #000 42%, #5c0000 72%, #ff0000 100%)', opacity: easeOut(seg(t, 0, 1)) }} />
      <div
        className="absolute left-1/2 top-1/2 rounded-full bg-white"
        style={{ width: 3000, height: 3000, marginLeft: -1500, marginTop: -1500, transform: `scale(${flood})` }}
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: `scale(${1 + out * 0.08})`, opacity: 1 - out }}
      >
        <AnimatedLogo t={t} at={1.3} style={{ width: portrait ? 600 : 760 }} />
        <p
          className="mt-10 text-center font-medium text-[#4B5F5A]"
          style={{ fontSize: portrait ? 30 : 26, maxWidth: portrait ? 560 : 900, ...enter(t, 5.2, { y: 16 }) }}
        >
          La plateforme de réservation d&apos;hébergements en Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  );
}

// ─── 2. Promesse (10 → 24 s) ──────────────────────────────────────────────

const TYPES = [
  { label: 'Hôtels', icon: BuildingIcon, photo: PHOTOS.hotelFront, at: 0.8 },
  { label: 'Résidences', icon: HomeIcon, photo: PHOTOS.villa, at: 1.6 },
  { label: 'Écolodges', icon: LeafIcon, photo: PHOTOS.beachHouse, at: 2.5 },
  { label: "Maisons d'hôtes", icon: BedIcon, photo: PHOTOS.bedroom, at: 3.4 },
];
const CITIES = ['Abidjan', 'Assinie-Mafia', 'Grand-Bassam', 'Yamoussoukro', 'San-Pédro', 'Man', 'Korhogo', 'Jacqueville', 'Sassandra'];

export function ScenePromesse({ t, portrait }: SceneProps) {
  const tileW = portrait ? 300 : 330;
  const tileH = portrait ? 250 : 230;
  const stamp = seg(t, 8.6, 0.5);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            at={4.8}
            portrait={portrait}
            title="Les plus beaux séjours de Côte d'Ivoire"
            sub="Réunis sur une seule plateforme."
          />
        }
      >
        <div className="relative" style={{ transform: `translateY(${-seg(t, 0, 14) * 16}px)` }}>
          <div className="grid grid-cols-2 gap-5">
            {TYPES.map((ty, i) => {
              const Icon = ty.icon;
              return (
                <div
                  key={ty.label}
                  className="relative overflow-hidden rounded-3xl shadow-xl"
                  style={{ width: tileW, height: tileH, ...enter(t, ty.at, { y: 40, scale: 0.85, back: true, dur: 0.55 }), rotate: `${[-2, 1.5, 1, -1.5][i]}deg` }}
                >
                  <Photo id={ty.photo} w={700} className="absolute inset-0 h-full w-full" style={{ transform: `scale(${1.12 - seg(t, ty.at, 10) * 0.12})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0" />
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[20px] font-bold text-black">
                    <Icon className="h-5 w-5 text-[#FF0000]" /> {ty.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* « tous vérifiés avant d'être publiés » — voix ≈ 8,6 s */}
          <div
            className="absolute left-1/2 top-1/2 flex items-center gap-3 rounded-2xl bg-[#FF0000] px-7 py-4 text-white shadow-2xl"
            style={{
              opacity: clamp(stamp * 2),
              transform: `translate(-50%, -50%) rotate(-6deg) scale(${lerp(1.8, 1, easeOut(stamp))})`,
              fontSize: portrait ? 30 : 26,
            }}
          >
            <ShieldIcon className="h-9 w-9" />
            <span className="font-extrabold leading-tight">
              Vérifiés
              <br />
              <span className="text-[0.7em] font-semibold">avant publication</span>
            </span>
          </div>
        </div>
      </Split>
      {/* Bandeau des destinations */}
      <div
        className="absolute inset-x-0 bottom-0 flex h-[52px] items-center overflow-hidden bg-black text-white"
        style={{ opacity: easeOut(seg(t, 5, 0.8)) }}
      >
        <div className="flex shrink-0 gap-10 whitespace-nowrap pl-10 text-[20px] font-semibold" style={{ transform: `translateX(${-t * 60}px)` }}>
          {[...CITIES, ...CITIES, ...CITIES].map((c, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <PinIcon className="h-5 w-5 text-[#FF0000]" /> {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 3. Recherche (24 → 40 s) ─────────────────────────────────────────────
// Maquette 1000 × 614. Barre de recherche : y 300 → 376.

const FIELD = { y: 300, h: 76, dest: [40, 250], arr: [250, 440], dep: [440, 630], guests: [630, 820], btn: [830, 960] } as const;

function Calendar({ t }: { t: number }) {
  // Décembre 2026 commence un mardi.
  const start = stepAt(t, [6.0]) ? 18 : null;
  const end = stepAt(t, [6.8]) ? 21 : null;
  const cells = Array.from({ length: 35 }, (_, i) => i - 0); // index 0 = lundi 30 nov.
  return (
    <div className="absolute z-30 w-[300px] rounded-2xl bg-white p-4 text-[12px] shadow-2xl" style={{ left: 250, top: FIELD.y + FIELD.h + 10, ...enter(t, 5.3, { y: -8, dur: 0.3 }), opacity: seg(t, 5.3, 0.3) * (1 - seg(t, 7.5, 0.3)) }}>
      <div className="mb-2 text-center text-[13px] font-bold">Décembre 2026</div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="pb-1 font-semibold text-gray-400">{d}</span>
        ))}
        {cells.map((i) => {
          const day = i; // i = 1 → mardi 1er
          if (day < 1 || day > 31) return <span key={i} />;
          const isEdge = day === start || day === end;
          const inRange = start && end && day > start && day < end;
          return (
            <span
              key={i}
              className={`mx-auto flex h-[26px] w-[30px] items-center justify-center rounded-lg ${isEdge ? 'bg-[#FF0000] font-bold text-white' : inRange ? 'bg-red-50 text-[#FF0000]' : 'text-gray-700'}`}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="mt-2 border-t pt-2 text-center font-semibold" style={{ opacity: seg(t, 6.9, 0.3) }}>
        3 nuits · 18 → 21 déc.
      </div>
    </div>
  );
}

export function SceneRecherche({ t, portrait }: SceneProps) {
  const s = deviceScale(portrait).desktop;
  const destination = t < 4.5 ? typed('Assinie', t, 3.0, 9) : 'Assinie-Mafia';
  const adults = t >= 8.4 ? 2 : 1;
  const searching = seg(t, 10.0, 1.2);
  const results = easeInOut(seg(t, 11.2, 0.8));
  // Positions calculées sur la maquette : champs (y 338), suggestion (414),
  // jours 18 et 21 du calendrier, bouton « + » adultes, bouton Rechercher.
  const cur = along(t, [
    [1.4, 720, 560],
    [2.5, 120, 340],
    [3.9, 120, 340],
    [4.35, 140, 414],
    [4.6, 140, 414],
    [5.1, 310, 340],
    [5.3, 310, 340],
    [5.85, 438, 523],
    [6.1, 438, 523],
    [6.65, 285, 553],
    [6.95, 285, 553],
    [7.55, 700, 340],
    [7.8, 700, 340],
    [8.25, 810, 424],
    [8.6, 810, 424],
    [9.7, 895, 338],
  ]);
  const clicks = [2.6, 4.5, 5.2, 6.0, 6.8, 7.7, 8.4, 10.0];
  const fieldBox = (range: readonly [number, number], label: string, value: string, Icon: typeof PinIcon, active: boolean) => (
    <div className="relative flex h-full flex-col justify-center px-5" style={{ width: range[1] - range[0] }}>
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
        <Icon className="h-3.5 w-3.5 text-[#FF0000]" /> {label}
      </span>
      <span className={`mt-1 text-[14px] ${value ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
        {value || (label === 'Destination' ? 'Où allez-vous ?' : 'Ajouter')}
        {active && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-gray-900" style={{ opacity: Math.round(t * 2.5) % 2 }} />}
      </span>
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            n="01"
            title="Recherchez"
            sub="Une destination, vos dates, vos voyageurs."
            portrait={portrait}
            chips={[
              { at: 6.3, label: <><PinIcon className="h-5 w-5" /> Assinie</> },
              { at: 7.1, label: <><CalendarIcon className="h-5 w-5" /> 3 nuits</> },
              { at: 8.0, label: <><UsersIcon className="h-5 w-5" /> 2 adultes</> },
            ]}
          />
        }
      >
        <div style={enter(t, 0, { y: 60, dur: 0.8 })}>
          <Scaled w={DESKTOP.w} h={DESKTOP.h} scale={s}>
            <DesktopFrame>
              <Photo id={PHOTOS.hero} w={1400} className="absolute inset-0 h-full w-full" style={{ transform: `scale(${1.08 - seg(t, 0, 16) * 0.08})` }} />
              <div className="absolute inset-0 bg-black/45" />
              <SiteHeader dark />
              <div className="absolute inset-x-0 top-[110px] text-center text-white">
                <h1 className="text-[44px] font-extrabold italic">Votre séjour commence ici...</h1>
                <p className="mt-2 text-[16px] font-medium">Trouvez des séjours uniques dans des hôtels, des résidences et bien plus encore.</p>
              </div>
              <div className="absolute left-1/2 top-[240px] flex -translate-x-1/2 gap-1 rounded-full bg-black/60 p-1 text-[13px] font-semibold text-white">
                {['Hôtel', 'Écolodge', "Maison d'hôtes", 'Résidence'].map((x, i) => (
                  <span key={x} className={`rounded-full px-4 py-1.5 ${i === 0 ? 'bg-white text-black' : ''}`}>{x}</span>
                ))}
              </div>
              {/* Barre de recherche */}
              <div className="absolute flex items-center rounded-2xl bg-white shadow-2xl" style={{ left: FIELD.dest[0], top: FIELD.y, height: FIELD.h, width: FIELD.btn[1] - FIELD.dest[0] }}>
                {fieldBox(FIELD.dest, 'Destination', destination, PinIcon, t >= 2.6 && t < 4.5)}
                <span className="h-10 w-px bg-gray-200" />
                {fieldBox(FIELD.arr, 'Arrivée', t >= 6.0 ? 'ven. 18 déc.' : '', CalendarIcon, false)}
                <span className="h-10 w-px bg-gray-200" />
                {fieldBox(FIELD.dep, 'Départ', t >= 6.8 ? 'lun. 21 déc.' : '', CalendarIcon, false)}
                <span className="h-10 w-px bg-gray-200" />
                {fieldBox(FIELD.guests, 'Voyageurs', `${adults} adulte${adults > 1 ? 's' : ''}`, UsersIcon, false)}
                <span
                  className="ml-auto mr-3 flex h-[52px] items-center gap-2 rounded-xl bg-[#FF0000] px-5 text-[14px] font-bold text-white"
                  style={{ transform: `scale(${1 - pulse(t, 10.0, 0.25) * 0.08})` }}
                >
                  {searching > 0 && searching < 1 ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white" style={{ transform: `rotate(${t * 720}deg)` }} />
                  ) : (
                    <SearchIcon className="h-4 w-4" />
                  )}
                  Rechercher
                </span>
              </div>
              {/* Suggestions de destination */}
              <div
                className="absolute z-30 w-[300px] overflow-hidden rounded-2xl bg-white py-2 text-[13px] shadow-2xl"
                style={{ left: FIELD.dest[0], top: FIELD.y + FIELD.h + 10, opacity: seg(t, 3.5, 0.2) * (1 - seg(t, 4.6, 0.2)) }}
              >
                {['Assinie-Mafia', 'Assinie-Mafia · Plage', 'Grand-Bassam'].map((c, i) => (
                  <div key={c} className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 && t > 4.2 ? 'bg-gray-100' : ''}`}>
                    <PinIcon className="h-4 w-4 text-gray-400" />
                    <span>
                      <b>{c}</b>
                      <span className="block text-[11px] text-gray-400">Sud-Comoé, Côte d&apos;Ivoire</span>
                    </span>
                  </div>
                ))}
              </div>
              <Calendar t={t} />
              {/* Voyageurs */}
              <div
                className="absolute z-30 w-[240px] rounded-2xl bg-white p-4 text-[13px] shadow-2xl"
                style={{ left: 600, top: FIELD.y + FIELD.h + 10, opacity: seg(t, 7.8, 0.25) * (1 - seg(t, 9.2, 0.25)) }}
              >
                {[
                  ['Adultes', adults],
                  ['Enfants', 0],
                ].map(([label, n]) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <b>{label}</b>
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border text-gray-500">−</span>
                      <b className="w-3 text-center">{n}</b>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-900">+</span>
                    </span>
                  </div>
                ))}
              </div>
              {/* Les résultats arrivent */}
              <div
                className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white px-8 pt-6 shadow-2xl"
                style={{ height: 560, transform: `translateY(${(1 - results) * 600}px)` }}
              >
                <div className="text-[18px] font-bold">6 hébergements à Assinie-Mafia</div>
                <div className="mt-4 grid grid-cols-3 gap-5">
                  {[PHOTOS.beachHouse, PHOTOS.hero, PHOTOS.villa].map((id, i) => (
                    <div key={id} style={enter(t, 12 + i * 0.15, { y: 30 })}>
                      <Photo id={id} w={500} className="h-[150px] w-full rounded-xl" />
                      <div className="mt-2 h-3 w-3/4 rounded bg-gray-200" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
              <Cursor x={cur.x} y={cur.y} down={pressed(t, clicks)} visible={seg(t, 1.4, 0.3) * (1 - seg(t, 10.6, 0.3))} />
            </DesktopFrame>
          </Scaled>
        </div>
      </Split>
    </div>
  );
}

// ─── 4. Résultats (40 → 54 s) ─────────────────────────────────────────────

export const LISTINGS = [
  { name: 'Lagune Lodge Assinie', type: 'Écolodge', rating: '4,8', reviews: 126, price: 85000, photo: PHOTOS.beachHouse, pool: true },
  { name: 'Hôtel Les Palétuviers', type: 'Hôtel', rating: '4,6', reviews: 212, price: 62000, photo: PHOTOS.hero, pool: true },
  { name: 'Villa Coco Plage', type: 'Résidence', rating: '4,9', reviews: 48, price: 140000, photo: PHOTOS.villa, pool: true },
  { name: 'Maison Ébène', type: "Maison d'hôtes", rating: '4,7', reviews: 91, price: 38000, photo: PHOTOS.bedroom, pool: false },
  { name: 'Écolodge Mangrove', type: 'Écolodge', rating: '4,5', reviews: 67, price: 54000, photo: PHOTOS.nature, pool: false },
  { name: "Sable d'Or Resort", type: 'Hôtel', rating: '4,4', reviews: 305, price: 98000, photo: PHOTOS.resort2, pool: true },
];

// États successifs du filtrage : tout → Écolodge (7,0 s) → + Piscine (9,1 s)
const FILTER_STATES: Array<{ at: number; visible: number[] }> = [
  { at: 0, visible: [0, 1, 2, 3, 4, 5] },
  { at: 7.0, visible: [0, 4] },
  { at: 9.1, visible: [0] },
];

function cardPos(slot: number) {
  return { x: (slot % 3) * 238, y: Math.floor(slot / 3) * 250 };
}

export function SceneResultats({ t, portrait }: SceneProps) {
  const s = deviceScale(portrait).desktop;
  const state = stepAt(t, FILTER_STATES.slice(1).map((f) => f.at));
  const prev = FILTER_STATES[Math.max(0, state - 1)];
  const curr = FILTER_STATES[state];
  const p = state === 0 ? 1 : easeInOut(seg(t, curr.at + 0.1, 0.6));
  const count = curr.visible.length;
  const maxPrice = typed('100 000', t, 7.8, 12);
  // Filtres : case Écolodge (32, 141), champ « Max » (150, 258), case Piscine (32, 344)
  const cur = along(t, [
    [5.8, 520, 600],
    [6.8, 32, 141],
    [7.1, 32, 141],
    [7.55, 150, 258],
    [8.4, 150, 258],
    [8.9, 32, 344],
    [9.3, 32, 344],
    [11.2, 350, 200],
  ]);
  const clicks = [7.0, 7.65, 9.1, 11.6];
  const check = (on: boolean) => (
    <span className={`flex h-4 w-4 items-center justify-center rounded ${on ? 'bg-[#FF0000] text-white' : 'border border-gray-300'}`}>
      {on && <CheckIcon className="h-3 w-3" />}
    </span>
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            n="02"
            title="Comparez"
            sub="Photos, prix par nuit, notes des voyageurs."
            portrait={portrait}
            chips={[
              { at: 6.7, label: 'Type' },
              { at: 7.7, label: 'Budget' },
              { at: 8.6, label: 'Équipements' },
            ]}
          />
        }
      >
        <Scaled w={DESKTOP.w} h={DESKTOP.h} scale={s}>
          <DesktopFrame url="bosejour.ci/accommodations">
            <SiteHeader>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-[12px] font-semibold">
                <SearchIcon className="h-3.5 w-3.5" /> Assinie-Mafia · 18 – 21 déc. · 2 adultes
              </span>
            </SiteHeader>
            <div className="flex">
              {/* Filtres */}
              <div className="w-[220px] shrink-0 space-y-5 border-r border-gray-100 px-6 py-5 text-[12.5px]">
                <div>
                  <div className="mb-2 font-bold">Type d&apos;hébergement</div>
                  {['Hôtel', 'Écolodge', "Maison d'hôtes", 'Résidence'].map((ty) => (
                    <div key={ty} className="flex items-center gap-2 py-1">
                      {check(ty === 'Écolodge' && t >= 7.0)} {ty}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-2 font-bold">Prix par nuit (FCFA)</div>
                  <div className="flex gap-2">
                    <span className="flex h-7 flex-1 items-center rounded-md border border-gray-200 px-2 text-gray-400">Min</span>
                    <span className={`flex h-7 flex-1 items-center rounded-md border px-2 ${maxPrice ? 'border-[#FF0000] font-semibold text-gray-900' : 'border-gray-200 text-gray-400'}`}>
                      {maxPrice || 'Max'}
                    </span>
                  </div>
                  <div className="mt-2 h-[14px]" />
                </div>
                <div>
                  <div className="mb-2 font-bold">Équipements</div>
                  {['Piscine', 'Wi-Fi', 'Climatisation'].map((eq) => (
                    <div key={eq} className="flex items-center gap-2 py-1">
                      {check(eq === 'Piscine' && t >= 9.1)} {eq}
                    </div>
                  ))}
                </div>
              </div>
              {/* Grille */}
              <div className="relative flex-1 px-6 py-4">
                <div className="mb-3 text-[15px] font-bold">
                  {count} hébergement{count > 1 ? 's' : ''} à Assinie-Mafia
                </div>
                <div className="relative h-[500px]">
                  {LISTINGS.map((l, i) => {
                    const wasSlot = prev.visible.indexOf(i);
                    const isSlot = curr.visible.indexOf(i);
                    const from = cardPos(wasSlot >= 0 ? wasSlot : i);
                    const to = cardPos(isSlot >= 0 ? isSlot : wasSlot >= 0 ? wasSlot : i);
                    const op = state === 0 ? 1 : lerp(wasSlot >= 0 ? 1 : 0, isSlot >= 0 ? 1 : 0, p);
                    const hover = i === 0 ? seg(t, 11.3, 0.3) : 0;
                    const e = enter(t, 0.3 + i * 0.12, { y: 30 });
                    return (
                      <div
                        key={l.name}
                        className="absolute w-[220px] overflow-hidden rounded-2xl bg-white"
                        style={{
                          left: lerp(from.x, to.x, p),
                          top: lerp(from.y, to.y, p) - hover * 6,
                          opacity: op * (e.opacity as number),
                          boxShadow: `0 ${8 + hover * 16}px ${24 + hover * 20}px -12px rgba(0,0,0,.3)`,
                          transform: `${e.transform} scale(${(0.92 + 0.08 * op) * (1 - pulse(t, 11.6, 0.25) * 0.03)})`,
                        }}
                      >
                        <div className="relative">
                          <Photo id={l.photo} w={500} className="h-[138px] w-full" />
                          {i === 0 && <Ring p={pulse(t, 3.2, 1.1)} radius={14} inset={4} />}
                        </div>
                        <div className="relative px-3 pb-3 pt-2">
                          <div className="truncate text-[13px] font-bold">{l.name}</div>
                          <div className="text-[11px] text-gray-500">{l.type} · Assinie-Mafia</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="relative flex items-center gap-1 text-[12px] font-semibold">
                              <StarIcon className="h-3.5 w-3.5" /> {l.rating}
                              <span className="font-normal text-gray-400">({l.reviews})</span>
                              {i === 0 && <Ring p={pulse(t, 5.1, 1.2)} radius={8} inset={-5} />}
                            </span>
                            <span className="relative text-right text-[12px]">
                              <b>{fcfa(l.price)}</b>
                              <span className="block text-[10px] text-gray-400">/ nuit</span>
                              {i === 0 && <Ring p={pulse(t, 4.0, 1.1)} radius={8} inset={-5} />}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <Cursor x={cur.x} y={cur.y} down={pressed(t, clicks)} visible={seg(t, 5.8, 0.3)} />
          </DesktopFrame>
        </Scaled>
      </Split>
    </div>
  );
}

// ─── 5. Fiche (54 → 70 s) ─────────────────────────────────────────────────

const AMENITIES = [
  { label: 'Piscine', icon: PoolIcon },
  { label: 'Wi-Fi', icon: WifiIcon },
  { label: 'Climatisation', icon: SnowIcon },
  { label: 'Parking', icon: CarIcon },
  { label: 'Petit-déjeuner', icon: CoffeeIcon },
  { label: 'Restaurant', icon: UtensilsIcon },
];

export function SceneFiche({ t, portrait }: SceneProps) {
  const s = deviceScale(portrait).desktop;
  // Défilement : galerie → équipements (3,6 s) → avis (4,8 s) → annulation (6,3 s) → retour (9,6 s)
  const scroll = tween(t, [[0, 0], [3.4, 330], [4.6, 520], [6.1, 700], [9.6, 0]], 0.7);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            n="03"
            title="Tout est clair"
            sub="Avant même de réserver."
            portrait={portrait}
            chips={[
              { at: 2.8, label: 'Galerie' },
              { at: 3.6, label: 'Équipements' },
              { at: 4.6, label: 'Avis authentiques' },
              { at: 6.2, label: "Conditions d'annulation" },
            ]}
          />
        }
      >
        <Scaled w={DESKTOP.w} h={DESKTOP.h} scale={s}>
          <DesktopFrame url="bosejour.ci/accommodations/lagune-lodge-assinie">
            <SiteHeader />
            <div className="relative h-[558px] overflow-hidden">
              <div className="absolute inset-x-0 top-0 px-6" style={{ transform: `translateY(${-scroll}px)` }}>
                <div className="pt-4 text-[11px] text-gray-400">Assinie-Mafia › Écolodges › Lagune Lodge Assinie</div>
                <h3 className="mt-1 text-[26px] font-extrabold">Lagune Lodge Assinie</h3>
                <div className="flex items-center gap-2 text-[12.5px] text-gray-600">
                  <StarIcon className="h-4 w-4" /> <b className="text-black">4,8</b> · 126 avis · Écolodge · Assinie-Mafia
                </div>
                {/* Galerie */}
                <div className="relative mt-4 grid h-[300px] w-[640px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
                  {[PHOTOS.beachHouse, PHOTOS.room2, PHOTOS.pool, PHOTOS.beach, PHOTOS.room4].map((id, i) => (
                    <Photo key={id} id={id} w={i === 0 ? 900 : 400} className={`h-full w-full ${i === 0 ? 'col-span-2 row-span-2' : ''}`} style={enter(t, 0.3 + i * 0.12, { y: 0, scale: 1.08 })} />
                  ))}
                  <Ring p={pulse(t, 2.7, 1.1)} radius={16} inset={3} />
                </div>
                {/* Équipements */}
                <div className="mt-8 w-[640px]">
                  <div className="text-[17px] font-bold">Équipements</div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {AMENITIES.map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <div key={a.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-[13px] font-medium" style={enter(t, 3.5 + i * 0.08, { y: 14 })}>
                          <Icon className="h-5 w-5 text-[#FF0000]" /> {a.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Avis */}
                <div className="mt-8 w-[640px]">
                  <div className="text-[17px] font-bold">Avis des voyageurs</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[
                      { who: 'Aya K.', when: 'Novembre 2026', text: 'Un cadre magique au bord de la lagune, un accueil chaleureux. On reviendra !' },
                      { who: 'Marc T.', when: 'Octobre 2026', text: 'Bungalow très propre, petit-déjeuner excellent. Parfait pour un week-end.' },
                    ].map((r, i) => (
                      <div key={r.who} className="rounded-xl border border-gray-100 p-4 text-[12.5px]" style={enter(t, 4.7 + i * 0.15, { y: 14 })}>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[12px] font-bold text-white">{r.who[0]}</span>
                          <span>
                            <b>{r.who}</b>
                            <span className="block text-[11px] text-gray-400">{r.when}</span>
                          </span>
                        </div>
                        <div className="mt-2 flex gap-0.5">{[0, 1, 2, 3, 4].map((k) => <StarIcon key={k} className="h-3.5 w-3.5" />)}</div>
                        <p className="mt-1.5 text-gray-600">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Annulation */}
                <div className="relative mt-8 w-[640px] rounded-2xl border-2 border-gray-100 p-5 text-[13px]">
                  <Ring p={pulse(t, 6.4, 2.2)} radius={18} inset={-4} />
                  <div className="flex items-center gap-2 text-[17px] font-bold">
                    <ShieldIcon className="h-5 w-5 text-[#FF0000]" /> Politique d&apos;annulation : Modérée
                  </div>
                  <p className="mt-2 text-gray-600">Annulation gratuite jusqu&apos;à 24h avant l&apos;arrivée. Passé ce délai : 50 % conservé, 50 % en avoir.</p>
                </div>
                <div className="h-[200px]" />
              </div>
              {/* Carte de réservation, fixe */}
              <div className="absolute right-6 top-[86px] w-[290px] rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
                <div className="text-[12px] text-gray-500">à partir de</div>
                <div className="text-[22px] font-extrabold">
                  {fcfa(85000)} <span className="text-[12px] font-normal text-gray-500">/ nuit</span>
                </div>
                <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border text-[12px]">
                  <div className="border-r p-2.5"><b className="block text-[10px] uppercase text-gray-400">Arrivée</b>ven. 18 déc.</div>
                  <div className="p-2.5"><b className="block text-[10px] uppercase text-gray-400">Départ</b>lun. 21 déc.</div>
                </div>
                <div
                  className="mt-3 rounded-xl bg-[#FF0000] py-3 text-center text-[14px] font-bold text-white"
                >
                  Réserver
                </div>
              </div>
            </div>
          </DesktopFrame>
        </Scaled>
      </Split>
    </div>
  );
}

