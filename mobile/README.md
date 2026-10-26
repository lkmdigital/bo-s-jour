# boséjour — application mobile (Flutter)

Application iOS et Android de boséjour (voyageur, puis partenaire). Elle consomme la même API que le site
(`https://api.bosejour.ci/api`). Conception complète : [`docs/mobile/CONCEPTION-APPLI-FLUTTER.md`](../docs/mobile/CONCEPTION-APPLI-FLUTTER.md).

## Lancer l'appli

```bash
cd mobile
flutter pub get
flutter run                                   # contre l'API de production
flutter run --dart-define=API_URL=http://10.0.2.2:8000/api   # émulateur Android vers l'API locale (php artisan serve)
flutter run --dart-define=API_URL=http://127.0.0.1:8000/api  # simulateur iOS vers l'API locale
```

## Vérifier

```bash
flutter analyze          # analyse du code (doit rester à zéro remarque)
flutter test             # tests
flutter test --tags screenshots --run-skipped --update-goldens test/screenshots   # captures d'écran de contrôle (test/screenshots/out/)
flutter gen-l10n         # après avoir modifié lib/l10n/*.arb (les fichiers générés sont commités)
```

## Organisation

| Dossier | Rôle |
|---|---|
| `lib/core/` | Configuration, thème de marque, réseau (Dio, jeton, erreurs), stockage sécurisé, navigation |
| `lib/features/<fonction>/` | `data/` (appels API), `domain/` (modèles), `presentation/` (écrans et widgets) |
| `lib/l10n/` | Textes français et anglais (`app_fr.arb`, `app_en.arb`) |
| `assets/` | Polices DM Sans, Baloo 2, Dancing Script et logos de la marque |
| `test/` | Tests (réseau simulé, aucun accès internet) |

## Principes

- **Aucune règle métier dans l'appli** : prix, disponibilités, garantie, commission viennent de l'API.
- **Jeton d'accès** dans le Keychain (iOS) / Keystore (Android), jamais en clair ; un jeton refusé (401) ferme la session.
- **Erreurs** : les messages du serveur adressés au voyageur sont repris, les pannes techniques ne montrent jamais de détail.
- Identifiant d'application : `ci.bosejour.app`.

## État (phase 0)

Socle terminé : thème, réseau, connexion (e-mail + mot de passe), navigation à quatre onglets, accueil et recherche
branchés sur l'API. À venir (phase 1) : fiche établissement, réservation, paiement, réservations du voyageur, inscription,
code e-mail et double authentification, assistant Bo, notifications.
