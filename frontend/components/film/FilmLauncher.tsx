'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FILM_EVENT, preloadFilm } from './openFilm';

/*
 * Hôte du film de présentation : monté une fois dans le layout, il ouvre le lecteur quand
 * un bouton du site émet l'événement FILM_EVENT (voir openFilm.ts et FilmButton, placé dans
 * la section « Explorer » de l'accueil). Il n'affiche lui-même aucun bouton.
 *
 * Le lecteur (scènes, maquettes) n'est chargé qu'à la demande, pour ne rien coûter aux
 * pages. Les éléments audio sont créés DANS le geste de clic et « débloqués » aussitôt :
 * sans ça, Safari iOS refuserait de lancer le son une fois le lecteur chargé.
 *
 * Lien direct : ajouter #presentation à l'adresse ouvre le film (le navigateur peut alors
 * exiger un clic sur « Lire » pour le son).
 */

const FilmPlayer = dynamic(preloadFilm, { ssr: false });

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
  const [audio, setAudio] = useState<{ music: HTMLAudioElement; voice: HTMLAudioElement } | null>(null);

  const isOpen = useRef(false);

  const open = useCallback(() => {
    if (isOpen.current) return;
    isOpen.current = true;
    // Créés ici, de façon synchrone dans le geste de clic (et non dans une fonction de mise à
    // jour d'état, exécutée plus tard). La musique démarre à 0 et monte en fondu : le
    // déblocage reste inaudible.
    setAudio({ music: createAudio(MUSIC_SRC, 0), voice: createAudio(VOICE_SRC, 1) });
  }, []);

  const close = useCallback(() => {
    isOpen.current = false;
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
    window.addEventListener(FILM_EVENT, open);
    return () => window.removeEventListener(FILM_EVENT, open);
  }, [open]);

  return audio ? <FilmPlayer music={audio.music} voice={audio.voice} onClose={close} /> : null;
}
