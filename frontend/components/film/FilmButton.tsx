'use client';

import { Play } from 'lucide-react';
import { openFilm, preloadFilm } from './openFilm';

/** Bouton « Voir la présentation » : ouvre le film de présentation de la plateforme. */
export default function FilmButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openFilm}
      onPointerEnter={preloadFilm}
      onFocus={preloadFilm}
      className={`group inline-flex w-fit items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF0000] text-white transition-colors group-hover:bg-[#CC0000]">
        <span className="absolute inset-0 rounded-full bg-[#FF0000] opacity-40 motion-safe:animate-ping" style={{ animationDuration: '2.4s' }} />
        <Play className="relative ml-0.5 h-4 w-4 fill-white" />
      </span>
      <span>
        Voir la présentation <span className="font-normal text-gray-500">· 2 min 30</span>
      </span>
    </button>
  );
}
