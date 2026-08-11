// Stockage centralisé du token/utilisateur avec option « Se souvenir de moi ».
// - remember = true  -> localStorage (persiste après fermeture du navigateur)
// - remember = false -> sessionStorage (effacé à la fermeture de l'onglet/navigateur)
// La lecture regarde les deux, pour rester compatible avec l'existant.

const REMEMBER_KEY = 'auth_remember';
const REMEMBERED_EMAIL_KEY = 'remembered_email';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    return fn();
  } catch {
    return fallback;
  }
}

export function persistAuth(token: string, user: unknown, remember: boolean): void {
  safe(() => {
    const primary = remember ? window.localStorage : window.sessionStorage;
    const secondary = remember ? window.sessionStorage : window.localStorage;
    primary.setItem('token', token);
    primary.setItem('user', JSON.stringify(user));
    secondary.removeItem('token');
    secondary.removeItem('user');
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }, undefined);
}

export function isRemembered(): boolean {
  return safe(() => window.localStorage.getItem(REMEMBER_KEY) !== '0', true);
}

export function readToken(): string | null {
  return safe(() => window.localStorage.getItem('token') || window.sessionStorage.getItem('token'), null);
}

export function readUser(): string | null {
  return safe(() => window.localStorage.getItem('user') || window.sessionStorage.getItem('user'), null);
}

export function clearAuth(): void {
  safe(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.sessionStorage.removeItem('token');
    window.sessionStorage.removeItem('user');
  }, undefined);
}

// E-mail mémorisé (toujours en localStorage) pour préremplir le formulaire de connexion.
export function setRememberedEmail(email: string | null): void {
  safe(() => {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }, undefined);
}

export function getRememberedEmail(): string {
  return safe(() => window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '', '');
}
