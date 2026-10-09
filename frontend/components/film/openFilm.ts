/**
 * Ouverture du film de présentation depuis n'importe quel bouton du site.
 *
 * Le lecteur vit dans FilmLauncher (monté une fois dans le layout). Un bouton l'ouvre en
 * émettant cet événement : l'écoute est synchrone, donc la création des éléments audio
 * reste dans le geste de clic, ce qu'exige Safari iOS pour autoriser le son.
 */
export const FILM_EVENT = 'bosejour:film';

export const openFilm = () => window.dispatchEvent(new Event(FILM_EVENT));

/** Précharge le lecteur (au survol ou au focus d'un bouton) pour une ouverture immédiate. */
export const preloadFilm = () => import('./FilmPlayer');
