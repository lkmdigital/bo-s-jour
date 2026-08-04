'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** 'color' = fond clair (rond noir + bo rouge + séjour noir), 'white' = fond sombre */
  variant?: 'color' | 'white';
  /** false = rendu texte (Baloo) au lieu de l'image */
  useImage?: boolean;
}

const SIZES = {
  sm: { h: 'h-8', w: 121, hpx: 40 },
  md: { h: 'h-12', w: 181, hpx: 60 },
  lg: { h: 'h-16', w: 242, hpx: 80 },
} as const;

export default function Logo({
  href = '/',
  className = '',
  size = 'md',
  variant = 'color',
  useImage = true,
}: LogoProps) {
  const s = SIZES[size];

  const logoContent = useImage ? (
    <Image
      src={variant === 'white' ? '/images/brand/logo-white.png' : '/images/brand/logo-black.png'}
      alt="bo séjour — Votre séjour commence ici..."
      width={s.w}
      height={s.hpx}
      className={`${s.h} w-auto object-contain ${className}`}
      priority
    />
  ) : (
    // Fallback texte en Baloo (charte)
    <span className={`font-logo inline-flex items-center gap-1.5 text-2xl leading-none ${className}`}>
      <span className="inline-flex items-center justify-center rounded-full bg-black text-primary px-2 py-1">
        bo
      </span>
      <span className={variant === 'white' ? 'text-white' : 'text-black'}>séjour</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center" aria-label="bo séjour — accueil">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
