# Alignement fiche établissement sur la maquette Figma

Base : `app/accommodations/[id]/page.tsx` (déjà ~70% : galerie, onglets, carte, avis, politiques, similaires).
Objectif : coller au mockup fourni (8 écrans).

## Écarts à traiter (par priorité)

### A. En-tête & titre
- [x] Boutons **favori + partager** présents (overlay galerie — pattern équivalent, conservé).
- [~] **Étoiles à côté du nom** : on affiche note review + étoile + « (N avis) ». Pas d'étoiles de **classement hôtelier** (aucun champ `star_rating` en base → fabriquer serait trompeur). Décision : garder la note réelle.
- [~] **Header compact recherche inline** : la barre de recherche vit en page résultats ; sur la fiche l'encart de réservation (sidebar) tient ce rôle. Non dupliqué.

### B. Galerie
- [x] Grille galerie Airbnb + lightbox OK. Badge conservé en **« Voir toutes les photos (N) »** (plus clair qu'un « 10+ » cryptique — meilleur UX).

### C. Onglet Aperçu — ✅ FAIT
- [x] **Descriptif** : intro en gras (chambres/voyageurs) + texte `line-clamp-4` + **« Afficher plus / moins »** (`descExpanded`).
- [x] **Commodités** : grille 1→2 colonnes à icônes, 6 par défaut + **« Afficher les N équipements »** (`amenitiesExpanded`). Vérifié live (14 équipements).
- [~] Encart réservation : sidebar existante conservée (dates, invités, total, Réserver). Libellé « Tarifs : De X à Y » non ajouté (mineur).

### D. Onglet Chambres — cartes riches — ✅ FAIT (l'essentiel)
- [x] Filtres pills (Toutes / N chambres) présents.
- [x] Carte horizontale : image (compteur multi-photos), nom + catégorie (rouge), lits/personnes/m² (icônes), équipements + vue, dispo, prix/nuit, **« Prix total »**, **« Plus de détails »** + **Réserver**. Vérifié live (id 2, 3 chambres).
- [~] Badge note « Excellent 5.0 » par chambre + **prix barré « 10% de réduction »** : **non ajoutés** (pas de note ni de promo par chambre en base → fabriquer serait trompeur pour l'utilisateur).

### E. Onglet Avis — note globale — ✅ DÉJÀ FAIT
- [x] Bloc **Note globale** : histogramme (5→1) + **catégories** (Commodités, Propreté, Communications, Emplacement, Valeur) notées avec icônes.
- [x] Cartes d'avis (avatar, nom, date, note, extrait, « Afficher plus ») + **« Afficher les N avis »**.

### F. Politiques
- [x] Liste à icônes (Enregistrement, Départ, Annulation, Fumer, Animaux…) — déjà en place.

### G. Nouvelles sections
- [ ] **« 12 choses à faire à proximité »** : nécessite des données d'activités géolocalisées (non disponibles). À brancher plus tard (source éditoriale/admin) — pas de contenu inventé.
- [~] **Similaires** : cartes existantes conservées ; enrichissements (encart « les voyageurs adorent… », prix barré) reportés (dépendent de données promo/highlight absentes).

## Ordre : C (Aperçu) ✅ → D (Chambres) ✅ → E (Avis) ✅ → A/B (header/galerie) ✅ → F (politiques) ✅ → G (activités/similaires) reporté (données manquantes).

## Principe appliqué : ne jamais afficher de donnée fabriquée à l'utilisateur final (fausse remise, fausse note, faux classement, fausses activités). Les blocs du mockup qui supposent des données absentes sont documentés et reportés jusqu'à ce que le client/l'admin puisse les renseigner.
