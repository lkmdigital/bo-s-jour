/*
 * Parcours navigateur de la supervision : socle commun (lancement du navigateur, garde-fous, capture
 * d'écran en cas d'échec, rapport JSON). Lancé par `php artisan ops:browser-journeys <profil>` ; Playwright
 * est résolu via NODE_PATH (installation hors dépôt : ~/.bosejour-monitor ou /var/www/monbeaupays-monitor).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ERROR_SCREEN = /Un problème est survenu|Application error|Internal Server Error|Server Error|Cette page est introuvable|This page could not be found/i;
// Statistiques et notifications push : jamais chargées par le moniteur (ne pas fausser Google Analytics ni OneSignal).
const BLOCKED_HOSTS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|onesignal\.com/i;

class StepError extends Error {
  constructor(step, message) {
    super(message);
    this.step = step;
  }
}

class Journey {
  constructor(profile) {
    this.profile = profile;
    this.baseUrl = (process.env.OPS_BASE_URL || 'https://bosejour.ci').replace(/\/$/, '');
    this.apiUrl = (process.env.OPS_API_URL || 'https://api.bosejour.ci').replace(/\/$/, '');
    this.secret = process.env.OPS_MONITOR_SECRET || '';
    this.shotDir = process.env.OPS_SHOT_DIR || path.join(process.cwd(), 'shots');
    this.steps = [];
    this.serverErrors = [];
    this.pageErrors = [];
    this.screenshot = null;
    this.data = {};
  }

  async start({ mobile = false } = {}) {
    this.browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    this.context = await this.browser.newContext(
      mobile
        ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 bosejour-monitor/1.0' }
        : { viewport: { width: 1366, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 bosejour-monitor/1.0' }
    );
    await this.context.setDefaultTimeout(20000);
    const ownHosts = [new URL(this.baseUrl).host, new URL(this.apiUrl).host];
    await this.context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (BLOCKED_HOSTS.test(url.host)) return route.abort();
      if (this.secret && ownHosts.includes(url.host)) {
        return route.continue({ headers: { ...route.request().headers(), 'x-ops-monitor': this.secret } });
      }
      return route.continue();
    });
    this.page = await this.context.newPage();
    this.page.on('pageerror', (e) => this.pageErrors.push(String(e.message || e).slice(0, 200)));
    this.page.on('response', (r) => {
      const url = new URL(r.url());
      if (r.status() >= 500 && ownHosts.includes(url.host)) this.serverErrors.push(`${r.status()} ${r.request().method()} ${url.pathname}`);
    });
    return this.page;
  }

  /** Exécute une étape nommée ; en cas d'échec : capture d'écran puis arrêt du parcours. */
  async step(name, fn) {
    const t = Date.now();
    try {
      const out = await fn();
      this.steps.push({ name, ms: Date.now() - t });
      return out;
    } catch (e) {
      this.steps.push({ name, ms: Date.now() - t, error: String(e.message || e).split('\n')[0].slice(0, 300) });
      await this.capture(name);
      throw new StepError(name, String(e.message || e).split('\n')[0].slice(0, 300));
    }
  }

  async capture(label) {
    try {
      fs.mkdirSync(this.shotDir, { recursive: true });
      const file = `${this.profile}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      await this.page.screenshot({ path: path.join(this.shotDir, file), fullPage: false });
      this.screenshot = file;
    } catch (_) { /* la capture est un confort, jamais une cause d'échec */ }
  }

  /** Ouvre une page et vérifie qu'elle ne montre ni écran d'erreur ni réponse 5xx. */
  async visit(url, { expect = null, settle = 1200 } = {}) {
    const before = this.serverErrors.length;
    const res = await this.page.goto(url.startsWith('http') ? url : this.baseUrl + url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(settle);
    if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()} sur ${url}`);
    await this.assertHealthy(url);
    if (expect) await this.page.getByText(expect, { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
    if (this.serverErrors.length > before) throw new Error(`Erreur serveur pendant le chargement : ${this.serverErrors.slice(before).join(', ')}`);
  }

  async assertHealthy(where = '') {
    const body = await this.page.locator('body').innerText().catch(() => '');
    if (ERROR_SCREEN.test(body)) throw new Error(`Écran d'erreur affiché${where ? ' sur ' + where : ''} : « ${(body.match(ERROR_SCREEN) || [''])[0]} »`);
  }

  async login(emailEnv, passwordEnv, url, successPattern) {
    await this.visit(url);
    await this.page.locator('input[type="email"]').first().fill(process.env[emailEnv] || '');
    await this.page.locator('input[type="password"]').first().fill(process.env[passwordEnv] || '');
    await this.page.locator('button[type="submit"]').first().click();
    try {
      await this.page.waitForURL(successPattern, { timeout: 20000 });
    } catch (e) {
      // La connexion n'a pas abouti : on remonte le message affiché à l'écran (mot de passe refusé, compte bloqué…).
      const shown = await this.page.locator('[role="alert"], .text-red-600, .text-red-700, .text-red-500').allInnerTexts().catch(() => []);
      const text = shown.map((t) => t.trim()).filter(Boolean).slice(0, 2).join(' / ');
      throw new Error(`Connexion impossible : ${text || 'aucune redirection après validation du formulaire'}`);
    }
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.assertHealthy('après connexion');
  }

  async finish(error = null) {
    let status = 'ok';
    let message = `${this.steps.length} étapes OK`;
    if (error) {
      status = 'fail';
      message = error instanceof StepError ? `Étape « ${error.step} » : ${error.message}` : `Échec : ${String(error.message || error).split('\n')[0]}`;
    } else if (this.serverErrors.length) {
      status = 'fail';
      message = `Réponses 5xx pendant le parcours : ${[...new Set(this.serverErrors)].slice(0, 5).join(', ')}`;
    } else if (this.pageErrors.length) {
      status = 'warn';
      message = `Parcours OK mais ${this.pageErrors.length} erreur(s) JavaScript : ${[...new Set(this.pageErrors)].slice(0, 2).join(' | ')}`;
    }
    try { await this.browser.close(); } catch (_) { /* déjà fermé */ }

    return { status, message, screenshot: this.screenshot, steps: this.steps, serverErrors: this.serverErrors.slice(0, 10), pageErrors: this.pageErrors.slice(0, 10), data: this.data };
  }
}

/** Point d'entrée commun : exécute le parcours, imprime le rapport JSON sur la dernière ligne de la sortie. */
async function main(profile, body, options = {}) {
  const journey = new Journey(profile);
  let error = null;
  try {
    await journey.start(options);
    await body(journey);
  } catch (e) {
    error = e;
  }
  const report = await journey.finish(error);
  process.stdout.write('\n__OPS_RESULT__' + JSON.stringify(report) + '\n');
  process.exit(0);
}

module.exports = { Journey, StepError, main };
