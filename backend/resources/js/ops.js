// Espace Ops (Blade) — JS minimal, ajouté au besoin page par page.
// Pas de framework front : les interactions ponctuelles utilisent Alpine-like
// data-attributes gérés ici, ou du JS inline dans les vues.

document.addEventListener('DOMContentLoaded', () => {
  // Ferme automatiquement les bannières flash après quelques secondes.
  document.querySelectorAll('[data-flash]').forEach((el) => {
    setTimeout(() => {
      el.style.transition = 'opacity 300ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 5000);
  });
});
