// Parcours « administrateur » : connexion par le portail dédié, puis lecture des pages principales.
const { main } = require('./lib.cjs');

main('admin', async (j) => {
  await j.start({ mobile: false });

  await j.step('Connexion administrateur', () => j.login('OPS_ADMIN_EMAIL', 'OPS_ADMIN_PASSWORD', '/dashboard/admin/login', /\/dashboard\/admin(?!\/login)/));
  await j.step('Tableau de bord', () => j.visit('/dashboard/admin'));
  await j.step('Établissements', () => j.visit('/dashboard/admin/accommodations'));
  await j.step('Réservations', () => j.visit('/dashboard/admin/reservations'));
  await j.step('Paiements', () => j.visit('/dashboard/admin/paiements'));
  await j.step('Partenaires', () => j.visit('/dashboard/admin/hosts'));
  await j.step('Utilisateurs', () => j.visit('/dashboard/admin/users'));
  await j.step('Paramètres', () => j.visit('/dashboard/admin/settings'));
});
