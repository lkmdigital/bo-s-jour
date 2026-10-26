// Parcours « partenaire » : connexion par l'écran de connexion, puis lecture des écrans de gestion.
const { main } = require('./lib.cjs');

main('host', async (j) => {
  await j.start({ mobile: false });

  await j.step('Connexion partenaire', () => j.login('OPS_HOST_EMAIL', 'OPS_HOST_PASSWORD', '/auth/login', /\/dashboard\/host/));
  await j.step('Tableau de bord', () => j.visit('/dashboard/host'));
  await j.step('Mes établissements', () => j.visit('/dashboard/host/property'));
  await j.step('Réservations et demandes', () => j.visit('/dashboard/host/reservations'));
  await j.step('Calendrier', () => j.visit('/dashboard/host/calendar'));
  await j.step('Avis', () => j.visit('/dashboard/host/reviews'));
  await j.step('Messagerie', () => j.visit('/dashboard/host/inbox'));
  await j.step('Revenus', () => j.visit('/dashboard/host/revenue'));
});
