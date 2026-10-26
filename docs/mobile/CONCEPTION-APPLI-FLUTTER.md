# boséjour — Conception de l'application mobile Flutter

Décisions prises le 2026-10-22 : **v1 = voyageur + partenaire**, **paiement via la page MaliaPay ouverte dans l'appli**,
code dans `mobile/` de ce dépôt, **comptes Apple/Google à créer** (au nom de HCS Consulting, recommandé).

## 1. Objectif
Une appli iOS et Android unique (Flutter) qui remplace la PWA : mêmes fonctions que le site pour le voyageur et le
partenaire, publiée sur l'App Store et Google Play. Le **site et l'API actuels restent la référence** : l'appli consomme la
même API Laravel (`https://api.bosejour.ci/api`), sans réécriture des règles métier (prix, disponibilité, garantie, commission).

## 2. Architecture technique
| Sujet | Choix | Pourquoi |
|---|---|---|
| Langage / socle | Flutter 3.44, Dart | Déjà installé sur le poste de développement |
| État | Riverpod | Simple à tester, standard actuel |
| Navigation | go_router | Liens profonds (retour de paiement, liens e-mail/WhatsApp) |
| Réseau | dio + intercepteurs | Jeton Bearer, renouvellement, erreurs 401/422/429 homogènes |
| Stockage sécurisé | flutter_secure_storage | Jeton d'accès dans le Keychain / Keystore, jamais en clair |
| Modèles | json_serializable | Typage fort des réponses API |
| Langues | ARB (FR, EN) | Identique au site (next-intl FR/EN) |
| Cartes | flutter_map (OpenStreetMap) | Même fournisseur que le site (`maps_provider = osm`) |
| Images | cached_network_image | Photos d'établissements |
| Notifications push | OneSignal | Déjà utilisé par le site et le serveur (OneSignalService) |
| Paiement | Page MaliaPay dans un navigateur intégré, retour par lien profond | Réutilise Wave/Orange/MTN/Visa-MC déjà branchés |
| Assistant Bo | Interface de chat native sur `POST /assistant/ask` | Cartes d'hébergements et lien de réservation déjà fournis par l'API |

**Authentification** : l'API produit déjà des jetons Sanctum « Bearer » (le code les prévoit pour le mobile, voir
`AuthController`). L'appli stocke le jeton dans le stockage sécurisé et l'envoie dans `Authorization: Bearer`. 2FA et
connexion sociale (Google) à traiter par étapes.

## 3. Écrans de la v1
**Voyageur** : démarrage et choix de langue · accueil (recherche destination/dates/voyageurs, villes populaires, offres) ·
résultats (liste + carte, filtres, tri) · fiche établissement (photos, équipements, chambres, avis, politique d'annulation,
calendrier de disponibilité) · réservation en 4 étapes (récapitulatif, voyageur, coordonnées, vérification) · choix
Paiement intégral / Garantie de réservation · paiement MaliaPay · confirmation · mes réservations (détail, annulation,
retrouver une réservation) · favoris · profil et pièces d'identité · programme de fidélité · notifications · assistant Bo ·
aide et contact · connexion / inscription / mot de passe oublié.

**Partenaire** : tableau de bord · demandes de réservation (accepter / refuser, délai de 24 h) · réservations ·
établissements (liste, création et modification, photos, chambres, tarifs, garantie) · calendrier et disponibilités ·
avis · messagerie · revenus et paiements · notifications · collaborateurs et permissions.

## 4. Modifications nécessaires côté serveur (avant la mise en ligne)
1. **Suppression de compte depuis l'appli** (obligatoire sur l'App Store et Google Play) : route inexistante aujourd'hui.
2. **Enregistrement de l'appareil pour les notifications** (identifiant OneSignal lié à l'utilisateur).
3. **Contrôle de version minimale** (`GET /app/config` : version minimale acceptée, message de mise à jour forcée).
4. **Liens profonds** : fichiers `/.well-known/assetlinks.json` (Android) et `apple-app-site-association` (iOS) servis par
   bosejour.ci ; la page de retour de paiement redirige vers l'appli.
5. **Durée de vie des jetons mobiles** : expiration et renouvellement (aujourd'hui sans expiration).
6. **Compte de démonstration** pour les relecteurs Apple/Google (voyageur et partenaire).

## 5. Phasage
| Phase | Contenu | Estimation indicative* |
|---|---|---|
| 0. Fondations | Projet, thème boséjour, API, connexion, navigation, CI | 1 à 2 semaines |
| 1. Voyageur | Recherche, fiche, réservation, paiement, mes réservations, profil, Bo | 6 à 8 semaines |
| 2. Partenaire | Demandes, réservations, établissements, calendrier, avis, messagerie | 6 à 8 semaines |
| 3. Publication | Recette, tests sur appareils, fiches des stores, relecture Apple/Google | 2 à 3 semaines |

\*Ordres de grandeur à confirmer ; la relecture Apple (1 à 3 jours en général) et la création du compte entreprise
(jusqu'à 2 semaines) se déroulent en parallèle du développement.

## 6. Publication sur les stores
**À préparer dès maintenant (démarches du client, longues)** :
- **Apple Developer Program** (99 $/an) au nom de HCS Consulting : exige un **numéro D-U-N-S** de l'entreprise (gratuit, 1 à 2 semaines).
- **Google Play Console** (25 $, une fois) : vérification d'identité de l'organisation ; les nouveaux comptes personnels
  doivent en plus mener un test fermé de 14 jours avec des testeurs avant la publication.
- Identifiant d'application : `ci.bosejour.app`.

**Exigences des stores à respecter** : politique de confidentialité (existe déjà), suppression de compte dans l'appli,
déclaration des données collectées, captures d'écran et description, classification d'âge, compte de démonstration pour la
relecture. **Paiement** : une réservation d'hébergement est un service consommé hors de l'appli, donc le paiement par
MaliaPay est autorisé sans achat intégré (App Store et Google Play).

## 7. Risques et points ouverts
- **Délai Apple** pour le compte entreprise : à lancer sans attendre.
- **Retour de paiement** : à valider de bout en bout (Wave, Orange, MTN) sur appareils réels, avec le lien profond.
- **Espace partenaire** : écrans nombreux (création d'établissement en plusieurs étapes, photos, calendrier) : prévoir de
  le livrer par incréments.
- **Icône et identité** : icône de l'appli à valider (logo ou orbe Bo).
- **Poste de développement** : licences Android à accepter (`flutter doctor --android-licenses`) et runtime du simulateur iOS à installer.
