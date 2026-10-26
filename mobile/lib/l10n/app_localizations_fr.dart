// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appName => 'boséjour';

  @override
  String get slogan => 'Votre séjour commence ici…';

  @override
  String get navHome => 'Accueil';

  @override
  String get navExplore => 'Explorer';

  @override
  String get navBookings => 'Réservations';

  @override
  String get navAccount => 'Compte';

  @override
  String get homeGreeting => 'Où allez-vous ?';

  @override
  String get homeSearchHint => 'Rechercher un hébergement, une ville…';

  @override
  String get homeDestinations => 'Destinations populaires';

  @override
  String get homeDiscover => 'Hébergements à découvrir';

  @override
  String homeFromPrice(String price) {
    return 'dès $price FCFA';
  }

  @override
  String homeAccommodationsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hébergements',
      one: '1 hébergement',
      zero: 'Aucun hébergement',
    );
    return '$_temp0';
  }

  @override
  String get exploreTitle => 'Explorer';

  @override
  String get exploreEmpty =>
      'Aucun hébergement ne correspond à votre recherche.';

  @override
  String explorePerNight(String price) {
    return '$price FCFA / nuit';
  }

  @override
  String exploreReviews(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count avis',
      one: '1 avis',
    );
    return '$_temp0';
  }

  @override
  String get bookingsTitle => 'Mes réservations';

  @override
  String get bookingsLoginPrompt =>
      'Connectez-vous pour retrouver vos réservations.';

  @override
  String get bookingsComingSoon =>
      'Le suivi de vos réservations arrive bientôt dans l\'application. En attendant, retrouvez-les sur le site.';

  @override
  String get bookingsOpenSite => 'Ouvrir sur le site';

  @override
  String get accountTitle => 'Mon compte';

  @override
  String get accountLogout => 'Se déconnecter';

  @override
  String get accountHelp => 'Centre d\'aide';

  @override
  String get accountTerms => 'Conditions générales';

  @override
  String get accountPrivacy => 'Politique de confidentialité';

  @override
  String accountVersion(String version) {
    return 'Version $version';
  }

  @override
  String get roleTraveler => 'Voyageur';

  @override
  String get roleHost => 'Partenaire';

  @override
  String get roleAdmin => 'Administrateur';

  @override
  String get loginTitle => 'Accéder à mon espace';

  @override
  String get loginSubtitle =>
      'Connectez-vous pour réserver et suivre vos séjours.';

  @override
  String get loginEmail => 'E-mail';

  @override
  String get loginEmailHint => 'votre@email.com';

  @override
  String get loginPassword => 'Mot de passe';

  @override
  String get loginShowPassword => 'Afficher le mot de passe';

  @override
  String get loginHidePassword => 'Masquer le mot de passe';

  @override
  String get loginSubmit => 'Accéder à mon espace';

  @override
  String get loginForgot => 'Mot de passe oublié ?';

  @override
  String get loginNoAccount => 'Pas encore de compte ?';

  @override
  String get loginCreate => 'Créer mon espace';

  @override
  String get loginEmailRequired => 'Saisissez votre e-mail.';

  @override
  String get loginEmailInvalid => 'Cette adresse e-mail n\'est pas valide.';

  @override
  String get loginPasswordRequired => 'Saisissez votre mot de passe.';

  @override
  String get loginNeedsOtp =>
      'Ce compte demande un code de vérification envoyé par e-mail. Cette étape n\'est pas encore disponible dans l\'application : connectez-vous une première fois depuis le site.';

  @override
  String get loginNeedsTwoFactor =>
      'La double authentification de ce compte n\'est pas encore prise en charge dans l\'application. Connectez-vous depuis le site.';

  @override
  String get retry => 'Réessayer';

  @override
  String get errorGeneric =>
      'Un problème est survenu. Réessayez dans un instant.';

  @override
  String get errorNetwork =>
      'Impossible de joindre boséjour. Vérifiez votre connexion internet.';

  @override
  String get errorSession => 'Votre session a expiré. Reconnectez-vous.';

  @override
  String get errorServer =>
      'Un problème est survenu de notre côté. Ce n\'est pas de votre faute : réessayez dans un instant.';

  @override
  String get errorTooMany =>
      'Trop de tentatives. Patientez un instant avant de réessayer.';

  @override
  String get typeHotel => 'Hôtel';

  @override
  String get typeLodge => 'Écolodge';

  @override
  String get typeGuesthouse => 'Maison d\'hôtes';

  @override
  String get typeApartment => 'Résidence';

  @override
  String get typeOther => 'Hébergement';

  @override
  String get newBadge => 'Nouveau';
}
