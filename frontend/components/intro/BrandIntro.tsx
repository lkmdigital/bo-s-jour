'use client';

import { useEffect, useRef } from 'react';
import styles from './BrandIntro.module.css';
import {
  LOGO_VIEWBOX,
  LOGO_PATHS,
  ACCENT_TRANSFORM,
  SLOGAN_GLYPHS,
  SLOGAN_BASELINE,
  SLOGAN_USES,
} from './brandIntroLogo';

/**
 * Animation d'ouverture bo séjour (≈ 4 s, une fois par session).
 *
 * Toute la chorégraphie est en CSS : le calque est rendu côté serveur et ne
 * s'affiche que si le script inline de `app/layout.tsx` a posé
 * `<html data-intro>` avant le premier rendu. L'animation démarre donc dès la
 * première image, sans attendre l'hydratation, et se termine d'elle-même même
 * si le JavaScript échoue. Le JS ne sert qu'à « passer » l'intro et à retirer
 * l'attribut une fois le rideau levé.
 *
 * Déroulé : dégradé rouge des intercalaires de la charte → trajet en pointillés
 * suivi par un avion → l'épingle (« destination choisie ») tombe → un cercle
 * blanc envahit l'écran depuis l'impact → le logo s'assemble autour de cette
 * même épingle → le slogan s'écrit, ses trois points s'allument → le rideau se lève.
 */

// Trajet du voyage (repère du logo) : part d'en bas à gauche, fait la boucle
// signature de la charte (page 16) et s'arrête au-dessus du « j ».
const TRAIL =
  'M 330 690 C 470 660 560 560 650 500 C 740 440 790 380 770 330 C 752 288 690 300 702 340 C 714 380 790 362 830 316 C 852 291 870 276 880.5 268';

// Avion orienté vers +x, centré sur l'origine (animateMotion le fait pivoter).
const PLANE =
  'M 12 0 L -2 -2.2 L -7 -11 L -10 -11 L -7 -2.2 L -12 -2.2 L -14.5 -6 L -16.5 -6 L -15 0 L -16.5 6 L -14.5 6 L -12 2.2 L -7 2.2 L -10 11 L -7 11 L -2 2.2 Z';

// Ordre d'apparition des lettres de « séjour » (le j naît sous l'épingle).
const WORD: ReadonlyArray<keyof typeof LOGO_PATHS> = ['s', 'e', 'j', 'o2', 'u', 'r'];

const delay = (s: number) => ({ animationDelay: `${s}s` });

export default function BrandIntro() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el || !root.hasAttribute('data-intro')) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.removeAttribute('data-intro');
      cleanup();
    };
    const skip = () => el.setAttribute('data-skip', '');
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el) finish();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        skip();
      }
    };
    // Filet : si `animationend` ne vient jamais (onglet en arrière-plan…).
    const timer = window.setTimeout(finish, 6000);

    el.addEventListener('animationend', onEnd);
    el.addEventListener('click', skip);
    window.addEventListener('keydown', onKey);

    function cleanup() {
      window.clearTimeout(timer);
      el!.removeEventListener('animationend', onEnd);
      el!.removeEventListener('click', skip);
      window.removeEventListener('keydown', onKey);
    }
    return cleanup;
  }, []);

  return (
    <div ref={ref} className={styles.overlay} aria-hidden="true">
      <div className={styles.glow} />

      <div className={styles.stage}>
        {/* Arrière-plan : trajet + avion, recouverts ensuite par le cercle blanc */}
        <svg className={styles.layer} viewBox={LOGO_VIEWBOX} overflow="visible">
          <defs>
            <mask id="bs-intro-trail" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
              <path className={styles.trailReveal} d={TRAIL} pathLength={1} />
            </mask>
          </defs>
          <path className={styles.trail} d={TRAIL} mask="url(#bs-intro-trail)" />
          <g className={styles.plane}>
            <path d={PLANE} />
            <animateMotion
              path={TRAIL}
              begin="0.25s"
              dur="1s"
              fill="freeze"
              rotate="auto"
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.45 0 0.55 1"
            />
          </g>
        </svg>

        <div className={styles.flood} />

        {/* Premier plan : le logo officiel, pièce par pièce */}
        <svg className={styles.layer} viewBox={LOGO_VIEWBOX} overflow="visible">
          <defs>
            {Object.entries(SLOGAN_GLYPHS).map(([id, d]) => (
              <path key={id} id={`bs-intro-${id}`} d={d} />
            ))}
          </defs>

          <path className={styles.circle} d={LOGO_PATHS.circle} fill="#000" />
          <path className={styles.pop} style={delay(1.7)} d={LOGO_PATHS.b} fill="#FF0000" />
          <path className={styles.pop} style={delay(1.78)} d={LOGO_PATHS.o} fill="#FF0000" />

          {WORD.map((k, i) => (
            <path key={k} className={styles.rise} style={delay(1.8 + i * 0.055)} d={LOGO_PATHS[k]} fill="#000" />
          ))}

          <g className={styles.accent}>
            <path
              d={LOGO_PATHS.accent}
              transform={ACCENT_TRANSFORM}
              fill="none"
              stroke="#1D1D1B"
              strokeWidth={4}
            />
          </g>

          <g fill="#000">
            {SLOGAN_USES.map(([id, x], i) => {
              const dotIndex = i - (SLOGAN_USES.length - 3);
              return (
                <use
                  key={i}
                  href={`#bs-intro-${id}`}
                  x={x}
                  y={SLOGAN_BASELINE}
                  className={dotIndex >= 0 ? styles.dot : styles.glyph}
                  style={delay(dotIndex >= 0 ? 2.8 + dotIndex * 0.13 : 2.2 + i * 0.018)}
                />
              );
            })}
          </g>

          <circle className={styles.ripple} cx={880.5} cy={373} r={6} />
          <path className={styles.pin} d={LOGO_PATHS.pin} fill="#FF0000" />
        </svg>
      </div>

      <span className={styles.skip}>
        <span className={styles.labelFr}>Passer</span>
        <span className={styles.labelEn}>Skip</span>
      </span>
    </div>
  );
}
