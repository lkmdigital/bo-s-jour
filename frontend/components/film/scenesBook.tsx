/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import {
  type SceneProps,
  clamp,
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
  PHONE,
  DesktopFrame,
  PhoneFrame,
  Cursor,
  Tap,
  Ring,
  AnimatedLogo,
  LightBackdrop,
  StepTitle,
  Split,
  deviceScale,
  StarIcon,
  CheckIcon,
  LockIcon,
  CoffeeIcon,
  MailIcon,
  ChatIcon,
  GiftIcon,
  UserIcon,
  BuildingIcon,
  ChevronLeft,
} from './kit';

/*
 * Scènes 6 à 11 : chambres, mobile, paiement, confirmation, après, conclusion.
 * `t` = secondes depuis le début de la scène.
 *
 * Fidélité au produit (vérifiée dans le code le 2026-10-02) :
 * - la chambre se choisit sur la fiche (bouton « Réserver » de la chambre) ; le
 *   nombre de chambres et les petits-déjeuners se règlent à l'étape
 *   « Récapitulatif » de l'assistant (BookingWizard) ;
 * - la dernière étape se valide par « Réserver maintenant » après acceptation
 *   des CGV, puis la demande attend la confirmation du partenaire
 *   (réglage host_approval_required, actif par défaut) avant tout paiement ;
 * - paiement (PaymentOptionsService) : « Paiement intégral » avec réduction
 *   (5 % par défaut) ou « Garantie de réservation », dont le montant est défini par
 *   l'établissement (1re nuit, pourcentage ou montant fixe ; ici la 1re nuit), le
 *   solde étant réglé à l'établissement à l'arrivée ;
 * - après paiement : code de confirmation à 8 caractères + numéro BS-AAAA-NNNNNN,
 *   envoyés par e-mail et WhatsApp.
 */

const NIGHTS = 3;
const ROOM_PRICE = 85000;
const BREAKFAST_PRICE = 7500;
const BREAKFASTS = 6; // 2 personnes × 3 matins
const TOTAL = 2 * ROOM_PRICE * NIGHTS + BREAKFASTS * BREAKFAST_PRICE; // 555 000 FCFA
const FULL_DISCOUNT = 5; // % (valeur par défaut de full_payment_discount_percent)
const FULL_AMOUNT = Math.round(TOTAL * (1 - FULL_DISCOUNT / 100)); // 527 250 FCFA
const GUARANTEE = TOTAL / NIGHTS; // garantie paramétrée « 1re nuit » : 185 000 FCFA
const BALANCE = TOTAL - GUARANTEE; // 370 000 FCFA à régler à l'arrivée
const CODE = '7F3A9C21';
const BOOKING_NUMBER = 'BS-2026-000148';

/** Barre d'application mobile commune */
function AppBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex h-[44px] items-center gap-2 border-b border-gray-100 px-3 text-[14px] font-bold">
      <ChevronLeft className="h-5 w-5" />
      <span className="flex-1 truncate">{title}</span>
      {right}
    </div>
  );
}

function PhoneButton({ label, t, tapAt = [] as number[], glow = 0, muted = false }: { label: string; t: number; tapAt?: number[]; glow?: number; muted?: boolean }) {
  const press = tapAt.reduce((m, a) => Math.max(m, pulse(t, a, 0.25)), 0);
  return (
    <div
      className={`absolute inset-x-4 bottom-4 flex h-[46px] items-center justify-center rounded-2xl text-[14px] font-bold ${muted ? 'bg-gray-200 text-gray-400' : 'bg-[#FF0000] text-white'}`}
      style={{ transform: `scale(${1 - press * 0.05})`, boxShadow: `0 0 0 ${glow * 8}px rgba(255,0,0,${0.2 * glow})` }}
    >
      {label}
    </div>
  );
}

const STEP_LABELS = ['Récapitulatif', 'Voyageur', 'Coordonnées', 'Vérification'];

function Stepper({ step, t, glowAt, compact = true }: { step: number; t: number; glowAt?: number; compact?: boolean }) {
  const glow = glowAt ? pulse(t, glowAt, 1.4) : 0;
  return (
    <div className={`flex items-start justify-between ${compact ? 'px-4 py-3' : 'gap-8 px-6 py-3'}`}>
      {STEP_LABELS.map((l, i) => (
        <div key={l} className={`flex flex-col items-center gap-1 text-center font-semibold ${compact ? 'w-[60px] text-[9.5px]' : 'w-[90px] text-[11px]'}`}>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i <= step ? 'bg-[#FF0000] text-white' : 'bg-gray-100 text-gray-400'}`}
            style={{ transform: `scale(${1 + glow * 0.25 * Math.max(0, Math.sin((t - (glowAt ?? 0)) * 8 - i))})` }}
          >
            {i < step ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={i <= step ? 'text-black' : 'text-gray-400'}>{l}</span>
        </div>
      ))}
    </div>
  );
}

/** Étape « Récapitulatif » sur mobile (réutilisée pour la transition 6 → 7) */
function MobileRecap() {
  return (
    <div className="px-4 pt-3 text-[12px]">
      <Photo id={PHOTOS.beachHouse} w={500} className="h-[104px] w-full rounded-xl" />
      <div className="mt-2 text-[15px] font-bold">Lagune Lodge Assinie</div>
      <div className="text-gray-500">Assinie-Mafia</div>
      <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
        {[
          ['Dates', '18 → 21 déc. (3 nuits)'],
          ['Chambres', '2 × Bungalow vue lagune'],
          ['Petits-déjeuners', `${BREAKFASTS}`],
          ['Voyageurs', '2 adultes'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between px-3 py-2">
            <span className="text-gray-500">{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-[13px]">
        <span className="font-semibold">Total</span>
        <b className="text-[16px]">{fcfa(TOTAL)}</b>
      </div>
    </div>
  );
}

// ─── 6. Chambres (70 → 88 s) ──────────────────────────────────────────────
// A (0 → 2 s) : liste des chambres de la fiche, « Réserver » sur le bungalow.
// B (2 s →) : assistant de réservation, étape Récapitulatif : petits-déjeuners
// (3,0 s), nombre de chambres (4,8 s), total (6,6 s), « Continuer » (10,4 s).

const ROOMS = [
  { name: 'Bungalow vue lagune', detail: '2 personnes · lit double · terrasse', price: ROOM_PRICE, photo: PHOTOS.room2 },
  { name: 'Suite familiale', detail: '4 personnes · 2 chambres · salon', price: 120000, photo: PHOTOS.room4 },
];

export function SceneChambre({ t, portrait }: SceneProps) {
  const { desktop: s, phone: ps } = deviceScale(portrait);
  const wizard = easeInOut(seg(t, 1.9, 0.5));
  const breakfastOn = t >= 3.0;
  const breakfastQty = t < 3.3 ? 1 : BREAKFASTS;
  const rooms = t >= 4.8 ? 2 : 1;
  const total = tween(
    t,
    [
      [0, ROOM_PRICE * NIGHTS],
      [3.0, ROOM_PRICE * NIGHTS + BREAKFAST_PRICE],
      [3.4, ROOM_PRICE * NIGHTS + BREAKFASTS * BREAKFAST_PRICE],
      [4.8, TOTAL],
    ],
    0.6
  );
  const cur = along(t, [
    [0.2, 600, 560],
    [1.3, 896, 238],
    [1.6, 896, 238],
    [2.7, 48, 246],
    [3.1, 48, 246],
    [4.5, 590, 166],
    [4.9, 590, 166],
    [9.9, 818, 474],
  ]);
  // Transition vers le mobile : l'ordinateur s'efface, le téléphone arrive
  const handoff = easeInOut(seg(t, 11.6, 1.2));
  const phoneIn = easeOut(seg(t, 12.4, 0.9));

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <div className="relative">
            <div style={{ opacity: 1 - seg(t, 11.4, 0.5) }}>
              <StepTitle
                t={t}
                n="04"
                title="Choisissez"
                sub="Votre chambre, vos options, votre prix total."
                portrait={portrait}
                chips={[
                  { at: 1.5, label: 'Chambre' },
                  { at: 3.0, label: <><CoffeeIcon className="h-5 w-5" /> Petit-déjeuner</> },
                  { at: 4.8, label: 'Plusieurs chambres' },
                ]}
              />
            </div>
            <div className="absolute inset-0 flex flex-col justify-center" style={enter(t, 12.6, { y: 24 })}>
              <h2 className={`font-extrabold leading-[1.05] ${portrait ? 'text-center' : ''}`} style={{ fontSize: portrait ? 64 : 56, letterSpacing: '-0.02em' }}>
                Et sur mobile&nbsp;?
              </h2>
            </div>
          </div>
        }
      >
        <div className="relative flex items-center justify-center">
          <div style={{ opacity: 1 - handoff, transform: `translateX(${-handoff * 140}px) scale(${1 - handoff * 0.2})` }}>
            <Scaled w={DESKTOP.w} h={DESKTOP.h} scale={s}>
              <DesktopFrame url={t < 2.1 ? 'bosejour.ci/accommodations/lagune-lodge-assinie' : 'bosejour.ci/bookings/new'}>
                <div className="absolute inset-x-0 top-0 h-[56px] border-b border-gray-100 bg-white" />
                {/* A — Chambres disponibles sur la fiche */}
                <div className="absolute inset-x-0 bottom-0 top-[56px]" style={{ opacity: 1 - wizard }}>
                  <div className="absolute left-6 top-[14px] text-[20px] font-extrabold">Chambres disponibles</div>
                  {ROOMS.map((r, i) => (
                    <div key={r.name} className="absolute left-6 right-6 flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" style={{ top: 64 + i * 170, height: 150 }}>
                      <Photo id={r.photo} w={400} className="h-[118px] w-[180px] shrink-0 rounded-xl" />
                      <div className="flex-1 text-[12.5px]">
                        <div className="text-[15px] font-bold">{r.name}</div>
                        <div className="text-gray-500">{r.detail}</div>
                        <span className="mt-2 inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">Disponible</span>
                      </div>
                      <div className="flex w-[200px] flex-col items-end justify-between text-right text-[12px]">
                        <div>
                          <b className="text-[16px]">{fcfa(r.price)}</b>
                          <div className="text-gray-500">par nuit</div>
                          <div className="text-gray-500">
                            x {NIGHTS} nuits · <span className="text-gray-600">Prix total :</span> <b className="text-black">{fcfa(r.price * NIGHTS)}</b>
                          </div>
                        </div>
                        <span className="rounded-xl bg-[#FF0000] px-6 py-2 text-[13px] font-bold text-white" style={{ transform: `scale(${1 - (i === 0 ? pulse(t, 1.6, 0.25) : 0) * 0.08})` }}>
                          Réserver
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* B — Assistant de réservation, étape Récapitulatif */}
                <div className="absolute inset-x-0 bottom-0 top-[56px] bg-white" style={{ opacity: wizard }}>
                  <div className="border-b border-gray-100">
                    <Stepper step={0} t={t} compact={false} />
                  </div>
                  <div className="absolute left-6 top-[74px] w-[600px] space-y-3 text-[12.5px]">
                    <div className="relative flex items-center justify-between rounded-xl border border-gray-200 p-4">
                      <span>
                        <b className="block text-[13.5px]">Nombre de chambres</b>
                        <span className="text-gray-500">Plusieurs chambres de ce type en une seule réservation.</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border text-gray-400">−</span>
                        <b className="w-4 text-center text-[15px]" style={{ transform: `scale(${1 + pulse(t, 4.8, 0.3) * 0.5})` }}>{rooms}</b>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-900">+</span>
                      </span>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${breakfastOn ? 'bg-[#FF0000] text-white' : 'border border-gray-400'}`}>
                          {breakfastOn && <CheckIcon className="h-3 w-3" />}
                        </span>
                        <span>
                          <b className="flex items-center gap-1.5 text-[13.5px]"><CoffeeIcon className="h-4 w-4 text-[#FF0000]" /> Autre petit-déjeuner</b>
                          <span className="text-gray-500">Ajoutez des petits-déjeuners à votre réservation ({fcfa(BREAKFAST_PRICE)} / petit-déjeuner).</span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3 pl-7" style={{ opacity: seg(t, 3.0, 0.2) }}>
                        <span className="text-gray-600">Nombre de petits-déjeuners souhaité</span>
                        <span className="flex h-8 w-14 items-center rounded-lg border border-gray-300 px-2.5 font-semibold">{breakfastQty}</span>
                        <b>= {fcfa(breakfastQty * BREAKFAST_PRICE)}</b>
                      </div>
                    </div>
                  </div>
                  {/* Récapitulatif fixe */}
                  <div className="absolute left-[660px] top-[64px] w-[316px] overflow-hidden rounded-2xl border border-gray-100 bg-white text-[12.5px] shadow-xl">
                    <Photo id={PHOTOS.beachHouse} w={500} className="h-[96px] w-full" />
                    <div className="space-y-2 p-4">
                      <div>
                        <b className="text-[14px]">Lagune Lodge Assinie</b>
                        <div className="text-gray-500">Assinie-Mafia</div>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-500">3 nuits × {rooms} chambre{rooms > 1 ? 's' : ''}</span>
                        <b>{fcfa(rooms * ROOM_PRICE * NIGHTS)}</b>
                      </div>
                      <div className="flex justify-between" style={{ opacity: breakfastOn ? 1 : 0.3 }}>
                        <span className="text-gray-500">Petits-déjeuners ({breakfastQty})</span>
                        <b>{fcfa(breakfastQty * BREAKFAST_PRICE)}</b>
                      </div>
                      <div className="relative flex items-end justify-between border-t pt-2">
                        <span className="font-semibold">Total</span>
                        <b className="text-[20px]">{fcfa(Math.round(total / 500) * 500)}</b>
                        <Ring p={pulse(t, 6.6, 1.8)} radius={12} inset={-6} />
                      </div>
                      <div className="rounded-xl bg-[#FF0000] py-2.5 text-center text-[14px] font-bold text-white" style={{ transform: `scale(${1 - pulse(t, 10.4, 0.25) * 0.06})` }}>
                        Continuer
                      </div>
                    </div>
                  </div>
                </div>
                <Cursor x={cur.x} y={cur.y} down={pressed(t, [1.6, 3.0, 4.8, 10.4])} visible={seg(t, 0.2, 0.3) * (1 - seg(t, 11.2, 0.3))} />
              </DesktopFrame>
            </Scaled>
          </div>
          <div className="absolute" style={{ opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 80}px)` }}>
            <Scaled w={PHONE.w} h={PHONE.h} scale={ps}>
              <PhoneFrame>
                <AppBar title="Finaliser votre réservation" />
                <Stepper step={0} t={t} />
                <MobileRecap />
                <PhoneButton label="Continuer" t={t} />
              </PhoneFrame>
            </Scaled>
          </div>
        </div>
      </Split>
    </div>
  );
}

// ─── 7. Mobile (88 → 106 s) ───────────────────────────────────────────────
// Voix : récapitulatif 3,4 · voyageur 4,9 · personnel/entreprise 6,0–8,8 ·
// coordonnées 8,8 · vérification 9,6 · « votre demande part au partenaire » 10,8 ·
// « qui confirme la disponibilité » 13,3.

export function SceneMobile({ t, portrait }: SceneProps) {
  const ps = deviceScale(portrait).phone;
  const step = stepAt(t, [4.6, 8.9, 9.9]);
  const slide = tween(t, [[0, 0], [4.6, 1], [8.9, 2], [9.9, 3]], 0.45);
  const corporate = t >= 7.4 && t < 8.2;
  const cgv = t >= 10.3;
  const sent = seg(t, 11.0, 0.4);
  const confirmed = t >= 13.9;
  const traveler = (title: string, desc: string, Icon: typeof UserIcon, selected: boolean) => (
    <div className={`flex gap-3 rounded-2xl border-2 p-3 ${selected ? 'border-[#FF0000] bg-red-50/60' : 'border-gray-100'}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-[#FF0000] text-white' : 'bg-gray-100'}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span>
        <b className="block text-[13px]">{title}</b>
        <span className="text-[11px] text-gray-500">{desc}</span>
      </span>
    </div>
  );
  const field = (label: string, value: string) => (
    <div className="rounded-xl border border-gray-200 px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase text-gray-400">{label}</span>
      <span className="text-[13px] font-medium">{value || ' '}</span>
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
            n="05"
            title="Sur mobile aussi"
            sub="Quatre étapes, puis le partenaire confirme."
            portrait={portrait}
            chips={[
              { at: 3.4, label: 'Récapitulatif' },
              { at: 4.9, label: 'Voyageur' },
              { at: 8.8, label: 'Coordonnées' },
              { at: 9.6, label: 'Vérification' },
              { at: 13.3, label: <><CheckIcon className="h-5 w-5" /> Confirmé par le partenaire</> },
            ]}
          />
        }
      >
        <Scaled w={PHONE.w} h={PHONE.h} scale={ps}>
          <PhoneFrame>
            <div className="relative h-full">
              <AppBar title="Finaliser votre réservation" />
              <Stepper step={step} t={t} glowAt={9.7} />
              <div className="relative h-[400px] overflow-hidden">
                <div className="absolute inset-y-0 left-0 flex w-[1120px]" style={{ transform: `translateX(${-slide * 280}px)` }}>
                  <div className="w-[280px]">
                    <MobileRecap />
                  </div>
                  <div className="w-[280px] space-y-3 px-4 pt-3">
                    <div className="text-[15px] font-bold">Vous réservez…</div>
                    <div style={{ transform: `scale(${1 + pulse(t, 6.2, 0.6) * 0.03})` }}>
                      {traveler('À titre personnel', 'Voyageur particulier. Facture à votre nom.', UserIcon, !corporate)}
                    </div>
                    <div style={{ transform: `scale(${1 + pulse(t, 7.4, 0.6) * 0.03})` }}>
                      {traveler('Pour une entreprise', 'Voyageur corporate. Facture professionnelle.', BuildingIcon, corporate)}
                    </div>
                  </div>
                  <div className="w-[280px] space-y-2.5 px-4 pt-3">
                    <div className="text-[15px] font-bold">Vos coordonnées</div>
                    {field('Prénom', typed('Aya', t, 9.0, 20))}
                    {field('Nom', typed('Koné', t, 9.15, 20))}
                    {field('Téléphone', typed('+225 07 12 34 56 78', t, 9.3, 45))}
                    {field('E-mail', typed('aya.kone@email.ci', t, 9.45, 45))}
                  </div>
                  <div className="w-[280px] space-y-2.5 px-4 pt-3 text-[12px]">
                    <div className="text-[15px] font-bold">Vérification</div>
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                      {[
                        ['Séjour', '18 → 21 déc. · 3 nuits'],
                        ['Chambres', '2 × Bungalow vue lagune'],
                        ['Voyageur', 'Particulier — Aya Koné'],
                        ['Contact', '+225 07 12 34 56 78'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 px-3 py-2">
                          <span className="text-gray-500">{k}</span>
                          <b className="truncate">{v}</b>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-[13px]">
                      <span className="font-semibold">Total</span>
                      <b className="text-[16px]">{fcfa(TOTAL)}</b>
                    </div>
                    <div className="flex items-start gap-2.5 px-1 text-[11.5px]">
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${cgv ? 'bg-[#FF0000] text-white' : 'border border-gray-400'}`}>
                        {cgv && <CheckIcon className="h-3 w-3" />}
                      </span>
                      <span>
                        J&apos;ai lu et j&apos;accepte les <u>conditions générales de vente</u>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <PhoneButton label={step === 3 ? 'Réserver maintenant' : 'Continuer'} t={t} tapAt={[4.4, 8.7, 9.7, 10.8]} muted={step === 3 && !cgv} />
              <Tap t={t} at={4.4} x={140} y={521} />
              <Tap t={t} at={7.4} x={140} y={261} />
              <Tap t={t} at={8.2} x={140} y={183} />
              <Tap t={t} at={8.7} x={140} y={521} />
              <Tap t={t} at={9.7} x={140} y={521} />
              <Tap t={t} at={10.3} x={28} y={404} />
              <Tap t={t} at={10.8} x={140} y={521} />

              {/* Demande envoyée → confirmation du partenaire */}
              <div className="absolute inset-0 z-40 flex flex-col bg-white" style={{ opacity: sent, transform: `translateY(${(1 - sent) * 30}px)` }}>
                <AppBar title="Ma réservation" />
                <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
                  {confirmed ? (
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white" style={{ transform: `scale(${0.6 + easeOut(seg(t, 13.9, 0.4)) * 0.4})` }}>
                      <CheckIcon className="h-10 w-10" />
                    </span>
                  ) : (
                    <span className="relative flex h-20 w-20 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border-4 border-amber-100 border-t-amber-500" style={{ transform: `rotate(${t * 240}deg)` }} />
                      <BuildingIcon className="h-8 w-8 text-amber-600" />
                    </span>
                  )}
                  <b className="mt-5 text-[17px]">{confirmed ? 'Disponibilité confirmée' : 'Demande envoyée'}</b>
                  <p className="mt-2 text-[12.5px] text-gray-500">
                    {confirmed
                      ? 'Le partenaire a confirmé votre demande. Vous pouvez maintenant payer.'
                      : 'Votre demande est en attente de confirmation par le partenaire.'}
                  </p>
                  <div className="mt-6 w-full rounded-xl bg-gray-50 p-3 text-left text-[12px]">
                    <div className="flex justify-between"><span className="text-gray-500">Établissement</span><b>Lagune Lodge Assinie</b></div>
                    <div className="mt-1 flex justify-between"><span className="text-gray-500">Total</span><b>{fcfa(TOTAL)}</b></div>
                  </div>
                </div>
                <PhoneButton label="Payer maintenant" t={t} muted={!confirmed} glow={confirmed ? pulse(t, 15.4, 1.2) : 0} />
              </div>
              <WhatsAppBanner t={t} at={13.4} text="Le partenaire a confirmé votre demande : vous pouvez payer votre réservation." />
            </div>
          </PhoneFrame>
        </Scaled>
      </Split>
    </div>
  );
}

function WhatsAppBanner({ t, at, text, top = 6 }: { t: number; at: number; text: string; top?: number }) {
  return (
    <Notification
      t={t}
      at={at}
      top={top}
      icon={<img src="/images/payment-methods/whatsapp.png" alt="" className="h-8 w-8" />}
      app="WhatsApp · boséjour"
      text={text}
    />
  );
}

// ─── 8. Paiement (106 → 122 s) ────────────────────────────────────────────
// Voix : « la totalité » 2,9 · « avec une réduction » 4,0 · « la garantie demandée
// par l'établissement » 5,3 · Wave 8,8 · Orange Money 9,5 · MTN 10,3 · Djamo 11,3 ·
// Visa/Mastercard 11,9 · « en toute sécurité » 13,8.

const METHODS = [
  { label: 'Wave', logo: '/images/payment-methods/wave.png', at: 8.8 },
  { label: 'Orange Money', logo: '/images/payment-methods/orange-ci.png', at: 9.5 },
  { label: 'MTN MoMo', logo: '/images/payment-methods/mtn_momo.png', at: 10.3 },
  { label: 'Djamo', logo: '/images/payment-methods/djamo.png', at: 11.3 },
  { label: 'Visa · Mastercard', logo: '/images/payment-methods/visa-mastercard.png', at: 11.9 },
];

export function ScenePaiement({ t, portrait }: SceneProps) {
  const ps = deviceScale(portrait).phone;
  const guarantee = t >= 5.8;
  const amount = guarantee ? GUARANTEE : FULL_AMOUNT;
  const wave = t >= 12.6;
  const processing = seg(t, 13.4, 0.3) * (1 - seg(t, 15.0, 0.01));
  const done = seg(t, 15.0, 0.4);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            n="06"
            title="Payez comme vous voulez"
            sub="La totalité, ou la garantie de l'établissement."
            portrait={portrait}
            chips={[
              { at: 3.0, label: `Totalité −${FULL_DISCOUNT} %` },
              { at: 5.4, label: 'Garantie de réservation' },
              { at: 13.8, label: <><LockIcon className="h-5 w-5" /> Paiement sécurisé</> },
            ]}
          />
        }
      >
        <Scaled w={PHONE.w} h={PHONE.h} scale={ps}>
          <PhoneFrame>
            <div className="relative h-full">
              <AppBar
                title="Paiement"
                right={
                  <span className="flex items-center gap-1 text-[10.5px] font-semibold text-green-700">
                    <LockIcon className="h-3.5 w-3.5" /> Sécurisé
                  </span>
                }
              />
              <div className="space-y-2.5 px-4 pt-2.5 text-[11.5px]">
                <div className="flex gap-3 rounded-xl bg-gray-50 p-2">
                  <Photo id={PHOTOS.beachHouse} w={200} className="h-10 w-12 rounded-lg" />
                  <span>
                    <b className="block text-[12.5px]">Lagune Lodge Assinie</b>
                    <span className="text-gray-500">18 → 21 déc. · {fcfa(TOTAL)}</span>
                  </span>
                </div>
                <div className="space-y-2">
                  <div
                    className={`relative rounded-xl border-2 p-2.5 ${!guarantee ? 'border-[#FF0000] bg-red-50/60' : 'border-gray-100'}`}
                    style={{ transform: `scale(${1 - pulse(t, 3.0, 0.3) * 0.04})` }}
                  >
                    <div className="flex items-center justify-between">
                      <b>Paiement intégral</b>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700" style={{ transform: `scale(${1 + pulse(t, 4.0, 0.8) * 0.25})` }}>
                        −{FULL_DISCOUNT} %
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {fcfa(FULL_AMOUNT)} <s className="text-gray-400">{fcfa(TOTAL)}</s>
                    </span>
                  </div>
                  <div
                    className={`rounded-xl border-2 p-2.5 ${guarantee ? 'border-[#FF0000] bg-red-50/60' : 'border-gray-100'}`}
                    style={{ transform: `scale(${1 - pulse(t, 5.8, 0.3) * 0.04})` }}
                  >
                    <b className="block">Garantie de réservation</b>
                    <span className="text-gray-600">
                      {fcfa(GUARANTEE)} (1re nuit) · solde de {fcfa(BALANCE)} à l&apos;arrivée
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 font-bold">Moyen de paiement</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {METHODS.map((m, i) => (
                      <div
                        key={m.label}
                        className={`flex h-[46px] items-center gap-2 rounded-xl border-2 bg-white px-2 ${wave && i === 0 ? 'border-[#FF0000]' : 'border-gray-100'}`}
                        style={enter(t, m.at, { y: 12, scale: 0.7, back: true, dur: 0.4 })}
                      >
                        <img src={m.logo} alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
                        <span className="text-[10.5px] font-semibold leading-tight">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <PhoneButton label={`Payer ${fcfa(amount)}`} t={t} tapAt={[13.2]} />
              <Tap t={t} at={3.0} x={140} y={130} />
              <Tap t={t} at={5.8} x={140} y={192} />
              <Tap t={t} at={12.6} x={72} y={276} />
              <Tap t={t} at={13.2} x={140} y={521} />
              {/* Traitement sécurisé puis confirmation du paiement */}
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white px-8 text-center" style={{ opacity: Math.max(processing, done) }}>
                {done <= 0 ? (
                  <>
                    <span className="relative flex h-20 w-20 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-[#FF0000]" style={{ transform: `rotate(${t * 400}deg)` }} />
                      <LockIcon className="h-8 w-8" />
                    </span>
                    <b className="mt-5 text-[15px]">Paiement sécurisé en cours…</b>
                    <span className="mt-2 flex items-center gap-2 text-[12px] text-gray-500">
                      <img src="/images/payment-methods/wave.png" alt="" className="h-5 w-5 rounded" /> Wave
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white" style={{ transform: `scale(${0.5 + easeOut(done) * 0.5})` }}>
                      <CheckIcon className="h-10 w-10" />
                    </span>
                    <b className="mt-5 text-[16px]">Paiement reçu</b>
                    <span className="mt-1 text-[12px] text-gray-500">{fcfa(GUARANTEE)}</span>
                  </>
                )}
              </div>
            </div>
          </PhoneFrame>
        </Scaled>
      </Split>
    </div>
  );
}

// ─── 9. Confirmation (122 → 131 s) ────────────────────────────────────────

/** Confettis déterministes (pas d'aléatoire : même image à chaque instant) */
function Confetti({ t, at }: { t: number; at: number }) {
  const k = t - at;
  if (k < 0 || k > 4) return null;
  return (
    <>
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 37) % 280;
        const speed = 120 + ((i * 53) % 90);
        const y = -20 + k * speed;
        return (
          <span
            key={i}
            className="absolute z-30 h-2.5 w-1.5 rounded-sm"
            style={{
              left: x,
              top: y,
              background: ['#FF0000', '#000', '#F5A400', '#4B5F5A'][i % 4],
              transform: `rotate(${k * (200 + i * 20)}deg)`,
              opacity: 1 - clamp((k - 2.8) / 1.2),
            }}
          />
        );
      })}
    </>
  );
}

function Notification({ t, at, icon, app, text, top }: { t: number; at: number; icon: ReactNode; app: string; text: string; top: number }) {
  const p = easeOut(seg(t, at, 0.45));
  return (
    <div
      className="absolute inset-x-2.5 z-50 flex gap-2.5 rounded-2xl bg-white/95 p-2.5 text-[11px] shadow-xl ring-1 ring-black/5"
      style={{ top, opacity: p, transform: `translateY(${(1 - p) * -40}px)` }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">{icon}</span>
      <span className="min-w-0">
        <b className="block text-[11.5px]">{app}</b>
        <span className="text-gray-600">{text}</span>
      </span>
    </div>
  );
}

export function SceneConfirmation({ t, portrait }: SceneProps) {
  const ps = deviceScale(portrait).phone;
  const draw = easeOut(seg(t, 0.2, 0.7));
  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <Split
        portrait={portrait}
        text={
          <StepTitle
            t={t}
            n="07"
            title="C'est confirmé !"
            sub="Votre code de réservation, aussitôt."
            portrait={portrait}
            chips={[
              { at: 3.5, label: <><MailIcon className="h-5 w-5" /> E-mail</> },
              { at: 4.2, label: <><img src="/images/payment-methods/whatsapp.png" alt="" className="h-5 w-5" /> WhatsApp</> },
            ]}
          />
        }
      >
        <Scaled w={PHONE.w} h={PHONE.h} scale={ps}>
          <PhoneFrame>
            <div className="relative h-full overflow-hidden">
              <Confetti t={t} at={0.4} />
              {/* Le contenu descend pour laisser la place aux notifications (3,3 s) */}
              <div className="flex flex-col items-center px-5 pt-8 text-center" style={{ transform: `translateY(${easeInOut(seg(t, 3.2, 0.5)) * 96}px)` }}>
                <svg viewBox="0 0 80 80" className="h-16 w-16">
                  <circle cx="40" cy="40" r="36" fill="#16A34A" style={{ transform: `scale(${0.6 + draw * 0.4})`, transformOrigin: 'center' }} />
                  <path d="M24 41 L35 52 L57 30" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(seg(t, 0.6, 0.4))} />
                </svg>
                <div className="mt-3 text-[18px] font-extrabold" style={enter(t, 0.6, { y: 10 })}>Réservation confirmée !</div>
                <div className="mt-0.5 text-[11.5px] text-gray-500" style={enter(t, 0.8, { y: 10 })}>Réservation {BOOKING_NUMBER}</div>
                <div className="relative mt-4 w-full rounded-2xl border-2 border-dashed border-gray-200 p-3" style={enter(t, 1.8, { y: 10 })}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Code de confirmation</div>
                  <div className="mt-1 font-mono text-[22px] font-bold tracking-widest">{typed(CODE, t, 2.0, 14)}</div>
                  <Ring p={pulse(t, 2.4, 1.2)} radius={16} inset={-4} />
                </div>
                <div className="mt-3 w-full space-y-1 rounded-xl bg-gray-50 p-3 text-left text-[11.5px]" style={enter(t, 2.2, { y: 10 })}>
                  <div className="flex justify-between"><span className="text-gray-500">Montant payé</span><b>{fcfa(GUARANTEE)}</b></div>
                  <div className="flex justify-between"><span className="text-gray-500">Solde à régler à l&apos;arrivée</span><b>{fcfa(BALANCE)}</b></div>
                </div>
              </div>
              <Notification t={t} at={3.5} top={6} icon={<span className="flex h-full w-full items-center justify-center bg-black text-white"><MailIcon className="h-4 w-4" /></span>} app="E-mail · boséjour" text={`Réservation ${BOOKING_NUMBER} confirmée · Code ${CODE}`} />
              <WhatsAppBanner t={t} at={4.2} top={74} text={`Réservation confirmée ✅ Code : ${CODE}. À très bientôt !`} />
            </div>
          </PhoneFrame>
        </Scaled>
      </Split>
    </div>
  );
}

// ─── 10. Après le séjour (131 → 141 s) ────────────────────────────────────

export function SceneApres({ t, portrait }: SceneProps) {
  const cardStyle = (at: number) => enter(t, at, { y: 50, scale: 0.9, back: true, dur: 0.55 });
  const progress = easeInOut(seg(t, 4.6, 1.8)) * 0.85;
  const cards = [
    {
      at: 1.0,
      icon: ChatIcon,
      title: 'Échangez avec votre hôte',
      body: (
        <div className="space-y-2 text-[15px]">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#FF0000] px-3.5 py-2 text-white" style={enter(t, 1.4, { y: 10 })}>
            Bonjour ! Pouvons-nous arriver vers 14 h ?
          </div>
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2" style={enter(t, 2.2, { y: 10 })}>
            Bien sûr, nous vous attendons. Bon voyage !
          </div>
        </div>
      ),
    },
    {
      at: 2.6,
      icon: StarIcon,
      title: 'Laissez votre avis',
      body: (
        <div>
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ transform: `scale(${0.4 + easeOut(seg(t, 3.0 + i * 0.12, 0.3)) * 0.6})`, opacity: 0.25 + seg(t, 3.0 + i * 0.12, 0.2) * 0.75 }}>
                <StarIcon className="h-9 w-9" />
              </span>
            ))}
          </div>
          <p className="mt-3 text-[16px] italic text-gray-700">« {typed('Séjour magique au bord de la lagune !', t, 3.5, 24)} »</p>
          <p className="mt-2 text-[13px] text-gray-400">Après votre séjour</p>
        </div>
      ),
    },
    {
      at: 4.0,
      icon: GiftIcon,
      title: 'Cumulez des avantages',
      body: (
        <div>
          <div className="text-[14px] font-semibold text-gray-500">Programme de fidélité · points</div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#FF0000]" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 text-[13px] text-gray-500">Prochaine récompense</div>
          <span
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[15px] font-bold text-white"
            style={enter(t, 6.4, { y: 10, scale: 0.6, back: true, dur: 0.45 })}
          >
            <GiftIcon className="h-5 w-5 text-[#FF0000]" /> Bon de fidélité
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LightBackdrop t={t} />
      <div className={`absolute inset-x-0 text-center ${portrait ? 'top-[90px]' : 'top-[60px]'}`}>
        <div className="font-bold tracking-[0.2em] text-[#FF0000]" style={{ fontSize: 22, ...enter(t, 0.1, { y: 12 }) }}>08</div>
        <h2 className="font-extrabold" style={{ fontSize: portrait ? 64 : 56, letterSpacing: '-0.02em', ...enter(t, 0.2, { y: 24 }) }}>
          Et après&nbsp;?
        </h2>
      </div>
      <div
        className={`absolute flex gap-7 ${portrait ? 'inset-x-[50px] bottom-[80px] top-[300px] flex-col' : 'inset-x-[70px] bottom-[70px] top-[220px]'}`}
      >
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="flex flex-1 flex-col rounded-3xl bg-white p-7 shadow-xl" style={cardStyle(c.at)}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#FF0000]">
                <Icon className="h-6 w-6" />
              </span>
              <div className="mb-4 mt-3 text-[22px] font-extrabold">{c.title}</div>
              {c.body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 11. Conclusion (141 → 151,8 s) ───────────────────────────────────────

export function SceneOutro({ t, portrait }: SceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 120%, rgba(255,0,0,.18), rgba(255,0,0,0) 60%)', opacity: easeOut(seg(t, 0.5, 2)) }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
        <AnimatedLogo t={t} at={0.1} style={{ width: portrait ? 600 : 700 }} />
        <span
          className="mt-12 inline-flex items-center gap-3 rounded-full bg-[#FF0000] px-9 py-4 font-bold text-white shadow-2xl"
          style={{ fontSize: portrait ? 30 : 26, ...enter(t, 3.4, { y: 20, scale: 0.85, back: true }), boxShadow: `0 20px 50px -15px rgba(255,0,0,${0.5 + 0.3 * Math.sin(t * 3)})` }}
        >
          Réservez sur bosejour.ci
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-6 text-center text-[15px] text-gray-400" style={{ opacity: seg(t, 5, 1) }}>
        Musique : « Island of Happiness », raspberrymusic (Pixabay)
      </div>
    </div>
  );
}
