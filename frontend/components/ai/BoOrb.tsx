'use client';

import { useId } from 'react';

/*
 * Bo, l'orbe de l'assistant boséjour : sphère noire brillante aux deux yeux rouges
 * (charte « Bo, l'orbe qui vous guide »). Entièrement vectoriel, donc net à toutes les tailles.
 *
 * États : `idle` (accueil, les yeux clignent), `thinking` (réflexion, trois points défilent),
 * `found` (yeux rieurs, quand Bo a trouvé des hébergements).
 */

export type BoState = 'idle' | 'thinking' | 'found';

interface Props {
  size?: number;
  state?: BoState;
  /** Halo rouge sous l'orbe, pour la grande version de l'écran d'accueil */
  shadow?: boolean;
  className?: string;
}

const RED = '#FF0000'; // rouge principal de la charte

export default function BoOrb({ size = 40, state = 'idle', shadow = false, className }: Props) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={shadow ? size * 1.12 : size}
      viewBox={shadow ? '0 0 100 112' : '0 0 100 100'}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="34%" cy="26%" r="80%">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.38" stopColor="#1c1c1c" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="100%" r="55%">
          <stop offset="0" stopColor={RED} stopOpacity="0.85" />
          <stop offset="1" stopColor={RED} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-floor`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={RED} stopOpacity="0.45" />
          <stop offset="1" stopColor={RED} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        <filter id={`${id}-eye`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {shadow && <ellipse cx="50" cy="104" rx="40" ry="6" fill={`url(#${id}-floor)`} />}

      <circle cx="50" cy="50" r="48" fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="50" width="100" height="50" fill={`url(#${id}-glow)`} />
        <ellipse cx="34" cy="24" rx="20" ry="11" fill="#fff" opacity="0.2" transform="rotate(-24 34 24)" />
        <circle cx="25" cy="21" r="3" fill="#fff" opacity="0.45" />
      </g>

      <g filter={`url(#${id}-eye)`} fill={RED} stroke={RED}>
        {state === 'found' ? (
          <g fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M29 56 L37 47 L45 56" />
            <path d="M55 56 L63 47 L71 56" />
          </g>
        ) : state === 'thinking' ? (
          <g stroke="none">
            <circle cx="38" cy="46" r="5" />
            <circle cx="62" cy="46" r="5" />
            <circle className="bo-dot" cx="40" cy="64" r="2.6" />
            <circle className="bo-dot" cx="50" cy="64" r="2.6" style={{ animationDelay: '0.18s' }} />
            <circle className="bo-dot" cx="60" cy="64" r="2.6" style={{ animationDelay: '0.36s' }} />
          </g>
        ) : (
          <g stroke="none">
            <rect className="bo-eye" x="33" y="40" width="9" height="21" rx="4.5" />
            <rect className="bo-eye" x="58" y="40" width="9" height="21" rx="4.5" />
          </g>
        )}
      </g>
    </svg>
  );
}
