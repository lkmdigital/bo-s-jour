'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Captions, CaptionsOff, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import narration from './narration.json';
import voiceDurations from './voiceDurations.json';
import type { SceneProps } from './kit';
import { SceneIntro, ScenePromesse, SceneRecherche, SceneResultats, SceneFiche } from './scenesDiscover';
import { SceneChambre, SceneMobile, ScenePaiement, SceneConfirmation, SceneApres, SceneOutro } from './scenesBook';

/*
 * Lecteur du film de présentation (≈ 2 min 30).
 *
 * L'image est calculée à partir d'une horloge maître (performance.now) : la
 * musique et la voix off y sont recalées en permanence. Si l'audio est lent à
 * charger ou bloqué, le film continue, et l'audio le rattrape dès qu'il peut.
 * La scène est dessinée sur une toile fixe (1280 × 720, ou 720 × 1280 sur un
 * écran en hauteur) mise à l'échelle de la fenêtre.
 */

const COMPONENTS: Record<string, ComponentType<SceneProps>> = {
  intro: SceneIntro,
  promesse: ScenePromesse,
  recherche: SceneRecherche,
  resultats: SceneResultats,
  fiche: SceneFiche,
  chambre: SceneChambre,
  mobile: SceneMobile,
  paiement: ScenePaiement,
  confirmation: SceneConfirmation,
  apres: SceneApres,
  outro: SceneOutro,
};

const CHAPTERS: Record<string, string> = {
  intro: 'bo séjour',
  promesse: 'La promesse',
  recherche: 'Recherche',
  resultats: 'Comparaison',
  fiche: "Fiche de l'établissement",
  chambre: 'Chambres et options',
  mobile: 'Sur mobile',
  paiement: 'Paiement',
  confirmation: 'Confirmation',
  apres: 'Après la réservation',
  outro: 'bo séjour',
};

const DURATION = narration.duration;
const DURS = voiceDurations as Record<string, number>;
const SCENES = narration.scenes.map((s, i, all) => ({
  ...s,
  end: i + 1 < all.length ? all[i + 1].start : DURATION,
  voiceEnd: s.voiceAt + (DURS[s.id] ?? 0),
  Component: COMPONENTS[s.id],
}));

/** Découpe la réplique en phrases, réparties au prorata de leur longueur */
const CUES = SCENES.flatMap((s) => {
  const parts = s.text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [s.text];
  const total = parts.reduce((n, p) => n + p.length, 0);
  let at = s.voiceAt;
  return parts.map((p) => {
    const d = ((s.voiceEnd - s.voiceAt) * p.length) / total;
    const cue = { from: at, to: at + d, text: p.trim() };
    at += d;
    return cue;
  });
});

const MUSIC_VOLUME = 0.6;
const MUSIC_UNDER_VOICE = 0.2;
const DRIFT = 0.35;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export interface FilmPlayerProps {
  /** Éléments audio créés (et débloqués) dans le geste de clic qui ouvre le film */
  music: HTMLAudioElement;
  voice: HTMLAudioElement;
  onClose: () => void;
}

export default function FilmPlayer({ music, voice, onClose }: FilmPlayerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = useRef({ offset: 0, startedAt: 0, running: false });
  const lastSync = useRef(new Map<HTMLAudioElement, number>());
  const hideTimer = useRef<number | undefined>(undefined);

  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const now = useCallback(() => {
    const c = clock.current;
    return Math.min(DURATION, c.running ? c.offset + (performance.now() - c.startedAt) / 1000 : c.offset);
  }, []);

  const play = useCallback(() => {
    const c = clock.current;
    if (c.offset >= DURATION - 0.05) c.offset = 0;
    c.startedAt = performance.now();
    c.running = true;
    setRunning(true);
    for (const el of [music, voice]) {
      el.dataset.started = '1';
      el.currentTime = c.offset;
      el.play().catch((err: DOMException) => {
        // Lecture refusée par le navigateur (ouverture par lien, sans clic) :
        // on fige le film et on affiche le bouton « Lire ».
        if (el === music && err?.name === 'NotAllowedError') {
          c.offset = 0;
          c.running = false;
          setRunning(false);
        }
      });
    }
  }, [music, voice]);

  const pause = useCallback(() => {
    const c = clock.current;
    c.offset = now();
    c.running = false;
    setRunning(false);
    music.pause();
    voice.pause();
  }, [music, voice, now]);

  const seek = useCallback(
    (x: number) => {
      const c = clock.current;
      c.offset = Math.max(0, Math.min(DURATION, x));
      c.startedAt = performance.now();
      music.currentTime = c.offset;
      voice.currentTime = c.offset;
      setT(c.offset);
    },
    [music, voice]
  );

  const toggle = useCallback(() => (clock.current.running ? pause() : play()), [pause, play]);

  // Développement uniquement : piloter le film depuis la console (réglage du minutage).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __film?: object };
    w.__film = { seek, play, pause, music, voice, at: (x: number) => (pause(), seek(x)) };
    return () => {
      delete w.__film;
    };
  }, [seek, play, pause, music, voice]);

  // Démarrage : attendre que la musique puisse jouer (4 s maximum), puis lancer.
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setLoading(false);
      play();
    };
    if (music.readyState >= 3) start();
    music.addEventListener('canplay', start);
    const fallback = window.setTimeout(start, 4000);
    return () => {
      music.removeEventListener('canplay', start);
      window.clearTimeout(fallback);
    };
  }, [music, play]);

  // Boucle d'animation : avance l'horloge, recale l'audio, gère le volume.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const time = now();
      setT(time);
      const c = clock.current;
      if (c.running && time >= DURATION) {
        c.offset = DURATION;
        c.running = false;
        setRunning(false);
        setControls(true);
        music.pause();
        voice.pause();
      }
      if (c.running) {
        const stamp = performance.now();
        for (const el of [music, voice]) {
          const last = lastSync.current.get(el) ?? 0;
          if (stamp - last < 1000) continue;
          if (el.paused || Math.abs(el.currentTime - time) > DRIFT) {
            lastSync.current.set(el, stamp);
            el.currentTime = time;
            if (el.paused) el.play().catch(() => undefined);
          }
        }
        const speaking = SCENES.some((s) => time >= s.voiceAt - 0.25 && time <= s.voiceEnd + 0.3);
        const target = speaking ? MUSIC_UNDER_VOICE : MUSIC_VOLUME;
        music.volume = Math.max(0, Math.min(1, music.volume + (target - music.volume) * 0.08));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [music, voice, now]);

  useEffect(() => {
    music.muted = muted;
    voice.muted = muted;
  }, [muted, music, voice]);

  // Arrêt complet à la fermeture
  useEffect(
    () => () => {
      music.pause();
      voice.pause();
    },
    [music, voice]
  );

  // Taille disponible → orientation et échelle de la toile
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Page figée derrière le film, focus sur le lecteur
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  const wake = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (clock.current.running) setControls(false);
    }, 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else rootRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    wake();
    if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    else if (e.key === ' ' || e.key === 'k') toggle();
    else if (e.key === 'ArrowRight') seek(now() + 5);
    else if (e.key === 'ArrowLeft') seek(now() - 5);
    else if (e.key === 'm') setMuted((m) => !m);
    else if (e.key === 'c') setCaptions((c) => !c);
    else if (e.key === 'f') toggleFullscreen();
    else return;
    e.preventDefault();
  };

  const portrait = box.h > box.w * 1.05;
  const W = portrait ? 720 : 1280;
  const H = portrait ? 1280 : 720;
  const scale = box.w ? Math.min(box.w / W, box.h / H) : 0;

  const idx = Math.max(0, SCENES.findIndex((s) => t >= s.start && t < s.end));
  const current = t >= DURATION ? SCENES.length - 1 : idx;
  const scene = SCENES[current];
  const previous = current > 0 && t < scene.start + 0.5 ? SCENES[current - 1] : null;
  const cue = CUES.find((c) => t >= c.from && t < c.to);
  const ended = t >= DURATION - 0.01;
  const chapterTitle = useMemo(() => CHAPTERS[scene.id], [scene.id]);

  const progressRef = useRef<HTMLDivElement>(null);
  const seekFromPointer = (clientX: number) => {
    const r = progressRef.current?.getBoundingClientRect();
    if (r) seek(((clientX - r.left) / r.width) * DURATION);
  };

  const ui = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Présentation de bo séjour"
      tabIndex={-1}
      onKeyDown={onKey}
      onPointerMove={wake}
      className="fixed inset-0 z-[2147483100] select-none overflow-hidden bg-black text-white outline-none"
      style={{ cursor: controls ? 'default' : 'none' }}
    >
      {/* Toile du film */}
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden text-black"
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
        onClick={() => {
          wake();
          if (!ended) toggle();
        }}
        aria-hidden="true"
      >
        {previous && <previous.Component t={t - previous.start} portrait={portrait} />}
        <div className="absolute inset-0" style={{ opacity: previous ? Math.min(1, (t - scene.start) / 0.5) : 1 }}>
          <scene.Component t={t - scene.start} portrait={portrait} />
        </div>
      </div>

      {/* Sous-titres */}
      {captions && cue && !ended && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center px-4 transition-[bottom] duration-200"
          style={{ bottom: controls ? 96 : 28 }}
          aria-live="off"
        >
          <span className="max-w-[min(92vw,820px)] rounded-lg bg-black/75 px-4 py-2 text-center text-[15px] font-medium leading-snug sm:text-[18px]">{cue.text}</span>
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FF0000]" />
        </div>
      )}

      {/* Lecture bloquée par le navigateur, ou film en pause : gros bouton */}
      {!loading && !running && !ended && (
        <button
          type="button"
          onClick={play}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF0000] shadow-2xl transition hover:scale-105"
          aria-label="Lire"
        >
          <Play className="ml-1 h-9 w-9 fill-white" />
        </button>
      )}

      {/* Fin du film */}
      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6 pb-28 sm:flex-row sm:justify-center sm:items-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/accommodations');
            }}
            className="rounded-full bg-[#FF0000] px-7 py-3.5 text-[16px] font-bold text-white shadow-xl transition hover:bg-[#CC0000]"
          >
            Trouver mon hébergement
          </button>
          <button
            type="button"
            onClick={() => {
              seek(0);
              play();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[16px] font-semibold text-black shadow-xl transition hover:bg-gray-100"
          >
            <RotateCcw className="h-4 w-4" /> Revoir
          </button>
        </div>
      )}

      {/* Fermer */}
      <button
        type="button"
        onClick={onClose}
        className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 transition hover:bg-black/80 sm:right-5 sm:top-5 ${controls || ended ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ marginTop: 'env(safe-area-inset-top)' }}
        aria-label="Fermer la présentation"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Barre de commandes */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-6 ${controls || ended ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div
          ref={progressRef}
          className="group relative h-5 cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons) seekFromPointer(e.clientX);
          }}
          role="slider"
          aria-label="Position dans la présentation"
          aria-valuemin={0}
          aria-valuemax={Math.round(DURATION)}
          aria-valuenow={Math.round(t)}
          aria-valuetext={`${fmt(t)} sur ${fmt(DURATION)}`}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25 group-hover:h-1.5" />
          <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#FF0000] group-hover:h-1.5" style={{ width: `${(t / DURATION) * 100}%` }} />
          {SCENES.slice(1).map((s) => (
            <span key={s.id} className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 bg-black/60" style={{ left: `${(s.start / DURATION) * 100}%` }} />
          ))}
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF0000] shadow" style={{ left: `${(t / DURATION) * 100}%` }} />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[13px] sm:gap-2">
          <button type="button" onClick={ended ? () => { seek(0); play(); } : toggle} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={running ? 'Pause' : 'Lire'}>
            {running ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
          </button>
          <button type="button" onClick={() => setMuted((m) => !m)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <span className="tabular-nums text-white/80">
            {fmt(t)} / {fmt(DURATION)}
          </span>
          <span className="ml-2 hidden truncate text-white/60 sm:inline">· {chapterTitle}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setCaptions((c) => !c)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={captions ? 'Masquer les sous-titres' : 'Afficher les sous-titres'} aria-pressed={captions}>
            {captions ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
          </button>
          <button type="button" onClick={toggleFullscreen} className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 sm:flex" aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}>
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
