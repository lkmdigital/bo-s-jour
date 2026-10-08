'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Play } from 'lucide-react';

/*
 * Bouton rond flottant qui ouvre le film de présentation.
 *
 * Le lecteur (scènes, maquettes) n'est chargé qu'au survol ou au clic, pour ne
 * rien coûter aux pages. Les éléments audio sont créés DANS le geste de clic et
 * « débloqués » aussitôt : sans ça, Safari iOS refuserait de lancer le son
 * quelques centaines de millisecondes plus tard, une fois le lecteur chargé.
 *
 * Lien direct : ajouter #presentation à l'adresse ouvre le film (le navigateur
 * peut alors exiger un clic sur « Lire » pour le son).
 */

const loadPlayer = () => import('./FilmPlayer');
const FilmPlayer = dynamic(loadPlayer, { ssr: false });

// Mêmes pages publiques que l'animation d'ouverture (app/layout.tsx)
const PUBLIC_PAGES = /^\/(?:accommodations(?:\/.*)?|rooms\/.+|avis-clients|faq|help|contact|voyageur|partenaire)?\/?$/;

const MUSIC_SRC = '/film/musique.m4a';
const VOICE_SRC = '/film/voix-off.m4a';

function createAudio(src: string, volume: number) {
  const el = new Audio(src);
  el.preload = 'auto';
  el.volume = volume;
  // Déblocage dans le geste utilisateur (iOS) : lecture puis pause immédiate.
  // Si le lecteur a déjà lancé la lecture entre-temps (data-started), on n'y touche pas.
  el.play()
    .then(() => {
      if (!el.dataset.started) el.pause();
    })
    .catch(() => undefined);
  return el;
}

export default function FilmLauncher() {
  const pathname = usePathname();
  const [audio, setAudio] = useState<{ music: HTMLAudioElement; voice: HTMLAudioElement } | null>(null);

  const open = useCallback(() => {
    // La musique démarre à 0 et monte en fondu : le déblocage reste inaudible.
    setAudio({ music: createAudio(MUSIC_SRC, 0), voice: createAudio(VOICE_SRC, 1) });
  }, []);

  const close = useCallback(() => {
    setAudio((a) => {
      a?.music.pause();
      a?.voice.pause();
      return null;
    });
    if (window.location.hash === '#presentation') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === '#presentation') open();
  }, [open]);

  if (!audio && !PUBLIC_PAGES.test(pathname ?? '')) return null;

  return (
    <>
      {!audio && (
        <button
          type="button"
          onClick={open}
          onPointerEnter={loadPlayer}
          onFocus={loadPlayer}
          aria-label="Voir la présentation de bo séjour (2 min 30)"
          title="Voir la présentation (2 min 30)"
          className="group fixed right-3 z-40 h-[52px] w-[52px] md:h-[72px] md:w-[72px] rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,.35)] transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#FF0000] md:bottom-6 md:right-6 bottom-[calc(5rem+env(safe-area-inset-bottom))]"
        >
          {/* Texte qui tourne autour du bouton (écrans larges seulement : illisible en 52 px) */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 hidden h-full w-full motion-safe:animate-[spin_14s_linear_infinite] md:block" aria-hidden="true">
            <defs>
              <path id="film-launcher-ring" d="M50 50 m-39 0 a39 39 0 1 1 78 0 a39 39 0 1 1 -78 0" />
            </defs>
            <text className="fill-black text-[10.5px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>
              <textPath href="#film-launcher-ring" startOffset="0">
                Découvrir bo séjour • 2 min 30 •
              </textPath>
            </text>
          </svg>
          <span className="absolute left-1/2 top-1/2 flex h-[42px] w-[42px] md:h-[38px] md:w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF0000] text-white transition-colors group-hover:bg-[#CC0000]">
            <span className="absolute inset-0 rounded-full bg-[#FF0000] opacity-40 motion-safe:animate-ping" style={{ animationDuration: '2.4s' }} />
            <Play className="relative ml-0.5 h-5 w-5 fill-white md:h-[18px] md:w-[18px]" />
          </span>
        </button>
      )}
      {audio && <FilmPlayer music={audio.music} voice={audio.voice} onClose={close} />}
    </>
  );
}
