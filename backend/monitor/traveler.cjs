// Parcours « voyageur » de bout en bout, sur mobile, sur l'établissement de test :
// recherche depuis l'accueil → fiche → chambre → connexion → demande de réservation →
// validation par le partenaire de test (API) → page de paiement → ouverture de la passerelle MaliaPay
// (le parcours s'arrête là : aucun paiement n'est jamais effectué).
// OPS_FULL=1 : va jusqu'au clic « Payer » et vérifie la redirection vers MaliaPay ; sinon s'arrête à la page de paiement.
const { main } = require('./lib.cjs');

const FULL = process.env.OPS_FULL === '1';
const SHOP = 'Établissement de test';
const MALIA = /malia/i;

function isoDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

main('traveler', async (j) => {
  const page = await j.start({ mobile: true });
  const apiHeaders = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Ops-Monitor': j.secret };
  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${j.apiUrl}/api${path}`, { method, headers: { ...apiHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };

  // ── 1. Accueil et recherche (le bug mobile du 2026-10-21 se serait vu ici) ────────────────
  await j.step('Accueil', () => j.visit('/'));
  await j.step('Recherche depuis l\'accueil', async () => {
    await page.locator('input[placeholder="Où allez-vous ?"]').first().fill(SHOP);
    await page.getByRole('button', { name: /Rechercher/ }).last().click();
    await page.waitForURL(/\/accommodations\?/, { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await j.assertHealthy('résultats de recherche');
    await page.locator('a[href^="/accommodations/"]').filter({ hasText: SHOP }).first().waitFor({ timeout: 20000 });
  });

  // ── 2. Fiche et chambre ───────────────────────────────────────────────────────────────────
  let accommodationId;
  let roomId;
  await j.step('Fiche de l\'établissement', async () => {
    await page.locator('a[href^="/accommodations/"]').filter({ hasText: SHOP }).first().click();
    await page.waitForURL(/\/accommodations\/\d+/, { timeout: 20000 });
    accommodationId = page.url().match(/\/accommodations\/(\d+)/)[1];
    await page.getByRole('heading', { name: new RegExp(SHOP) }).first().waitFor({ timeout: 20000 });
    await j.assertHealthy('fiche');
  });
  await j.step('Chambre', async () => {
    await page.getByRole('button', { name: /^Réserver$/ }).first().click();
    await page.waitForURL(/\/rooms\/\d+/, { timeout: 20000 });
    roomId = page.url().match(/\/rooms\/(\d+)/)[1];
    await page.getByText('Réserver cette chambre').first().waitFor({ timeout: 15000 });
    await j.assertHealthy('chambre');
  });

  // ── 3. Connexion voyageur ─────────────────────────────────────────────────────────────────
  await j.step('Connexion voyageur', () => j.login('OPS_TRAVELER_EMAIL', 'OPS_TRAVELER_PASSWORD', '/auth/login', (url) => !/\/auth\/login/.test(url.pathname)));

  // ── 4. Demande de réservation ─────────────────────────────────────────────────────────────
  const offset = 40 + Math.floor(Math.random() * 250); // dates variées : jamais de collision avec un reste de test
  const checkIn = isoDate(offset);
  const checkOut = isoDate(offset + 2);
  let bookingId;
  await j.step('Assistant de réservation', async () => {
    await j.visit(`/bookings/new?accommodation=${accommodationId}&room=${roomId}&check_in=${checkIn}&check_out=${checkOut}&guests=2`);
    await page.getByText('Récapitulatif').first().waitFor({ timeout: 15000 });
    // Étape 1 : récapitulatif des dates et du prix
    await page.getByRole('button', { name: /Continuer/ }).click();
    // Étape 2 : type de voyageur (Particulier, présélectionné)
    await page.getByRole('button', { name: /Continuer/ }).click();
    // Étape 3 : coordonnées — numéro factice (aucun message réel n'est envoyé aux numéros 2250000…)
    const first = page.getByLabel(/Prénom\(s\)/);
    if (!(await first.inputValue())) await first.fill('Voyageur');
    const last = page.getByLabel(/^Nom/);
    if (!(await last.first().inputValue())) await last.first().fill('Test');
    const phone = page.locator('input[type="tel"]').first();
    await phone.fill('0000000001');
    j.data.débordement_mobile = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const country = page.getByLabel(/Pays de résidence/);
    if (!(await country.inputValue())) await country.fill("Côte d'Ivoire");
    await page.getByRole('button', { name: /Continuer/ }).click();
    // Étape 4 : vérification, conditions générales et validation
    await page.locator('input[type="checkbox"]').last().check();
    const [response] = await Promise.all([
      page.waitForResponse((r) => /\/bookings(\?.*)?$/.test(new URL(r.url()).pathname + new URL(r.url()).search) && r.request().method() === 'POST', { timeout: 30000 }),
      page.getByRole('button', { name: /Réserver maintenant/ }).click(),
    ]);
    if (response.status() >= 300) throw new Error(`Création de la demande refusée (HTTP ${response.status()}) : ${(await response.text()).slice(0, 160)}`);
    bookingId = (await response.json()).id;
    if (!bookingId) throw new Error('La demande a été acceptée mais sans identifiant de réservation.');
    j.data.booking = bookingId;
  });

  // ── 5. Le partenaire de test confirme la disponibilité (appel API, comme son espace le ferait) ─
  await j.step('Validation par le partenaire', async () => {
    const login = await api('POST', '/login', { body: { email: process.env.OPS_HOST_EMAIL, password: process.env.OPS_HOST_PASSWORD } });
    if (!login.json.token) throw new Error(`Connexion du partenaire de test impossible (HTTP ${login.status})`);
    const approve = await api('POST', `/bookings/${bookingId}/approve`, { token: login.json.token });
    await api('POST', '/logout', { token: login.json.token });
    if (approve.status >= 300) throw new Error(`Validation de la demande refusée (HTTP ${approve.status}) : ${JSON.stringify(approve.json).slice(0, 160)}`);
  });

  // ── 6. Paiement : on va jusqu'à la passerelle, jamais au-delà ─────────────────────────────
  let gatewayUrl = null;
  await page.context().route((url) => MALIA.test(url.host) && !/api\./.test(url.host) && url.host !== new URL(j.baseUrl).host, (route) => {
    gatewayUrl = route.request().url();
    return route.abort();
  });
  await j.step('Page de paiement', async () => {
    await j.visit(`/bookings/${bookingId}/payment`);
    await page.getByRole('button', { name: /Payer/ }).first().waitFor({ timeout: 20000 });
    // Un moyen de paiement doit être proposé (Wave, Orange, MTN, carte…).
    const methods = await page.locator('button, label, [role="radio"]').filter({ hasText: /Wave|Orange|MTN|Moov|Visa|Djamo/i }).count();
    if (methods === 0) throw new Error('Aucun moyen de paiement proposé sur la page de paiement.');
    j.data.moyens = methods;
  });
  if (FULL) {
    await j.step('Ouverture de la passerelle de paiement', async () => {
      await page.locator('button, label, [role="radio"]').filter({ hasText: /Wave|Orange|MTN|Visa|Djamo/i }).first().click();
      await page.getByRole('button', { name: /Payer/ }).first().click();
      await page.waitForFunction(() => true, null, { timeout: 1000 }).catch(() => {});
      const start = Date.now();
      while (!gatewayUrl && Date.now() - start < 25000) {
        const err = await page.locator('.text-red-700, .text-red-400').first().innerText().catch(() => '');
        if (err) throw new Error(`Le paiement n'a pas pu être initié : ${err.slice(0, 160)}`);
        await page.waitForTimeout(500);
      }
      if (!gatewayUrl) throw new Error('Aucune redirection vers la passerelle MaliaPay après le clic sur « Payer ».');
      j.data.passerelle = new URL(gatewayUrl).host;
    });
  }
});
