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

  @override
  String get detailBack => 'Retour';

  @override
  String detailPhotoCounter(int current, int total) {
    return '$current / $total';
  }

  @override
  String detailGuests(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count voyageurs',
      one: '1 voyageur',
    );
    return '$_temp0';
  }

  @override
  String detailBedrooms(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count chambres',
      one: '1 chambre',
    );
    return '$_temp0';
  }

  @override
  String detailBathrooms(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count salles de bain',
      one: '1 salle de bain',
    );
    return '$_temp0';
  }

  @override
  String detailCheckIn(String time) {
    return 'Arrivée dès $time';
  }

  @override
  String detailCheckOut(String time) {
    return 'Départ avant $time';
  }

  @override
  String get detailAbout => 'À propos';

  @override
  String get detailReadMore => 'Lire la suite';

  @override
  String get detailReadLess => 'Réduire';

  @override
  String get detailAmenities => 'Équipements et services';

  @override
  String get detailRooms => 'Chambres';

  @override
  String detailFromPerNight(String price) {
    return 'dès $price FCFA / nuit';
  }

  @override
  String get detailPolicies => 'Réservation et paiement';

  @override
  String get detailCancelStrict =>
      'Annulation stricte : réservation non remboursable, aucune annulation gratuite.';

  @override
  String detailCancelModerate(int hours) {
    return 'Annulation modérée : gratuite jusqu\'à $hours h avant l\'arrivée. Passé ce délai, 50 % sont conservés et 50 % vous sont rendus en avoir.';
  }

  @override
  String detailCancelFlexible(int hours) {
    return 'Annulation flexible : gratuite jusqu\'à $hours h avant l\'arrivée. Ensuite, la garantie est transformée en avoir.';
  }

  @override
  String get detailSpecialConditions => 'Conditions particulières';

  @override
  String get detailReviews => 'Avis des voyageurs';

  @override
  String get detailNoReviews =>
      'Pas encore d\'avis : cet établissement vient d\'arriver sur boséjour.';

  @override
  String get detailHostReply => 'Réponse de l\'établissement';

  @override
  String get detailViewMap => 'Voir sur la carte';

  @override
  String get detailBook => 'Réserver';

  @override
  String get detailServiceReception24h => 'Réception 24 h/24';

  @override
  String get detailServiceShuttle => 'Navette';

  @override
  String get detailServiceLaundry => 'Blanchisserie';

  @override
  String get detailServicePets => 'Animaux acceptés';

  @override
  String get detailServiceSmoking => 'Espace fumeur';

  @override
  String get detailServiceBreakfast => 'Petit-déjeuner inclus';

  @override
  String get detailNotFound => 'Cet établissement n\'est plus disponible.';

  @override
  String detailStars(int count) {
    return '$count étoiles';
  }

  @override
  String get registerTitle => 'Créer mon espace';

  @override
  String get registerSubtitle =>
      'Réservez, suivez vos paiements et cumulez des points au même endroit.';

  @override
  String get registerTypeIndividual => 'Individuel';

  @override
  String get registerTypeIndividualSub => 'Pour mes voyages personnels';

  @override
  String get registerTypeCorporate => 'Entreprise';

  @override
  String get registerTypeCorporateSub =>
      'Déplacements professionnels, facture au nom de la société';

  @override
  String get registerCompany => 'Société';

  @override
  String get registerCompanyRequired => 'Saisissez le nom de la société.';

  @override
  String get registerFirstName => 'Prénom';

  @override
  String get registerLastName => 'Nom';

  @override
  String get registerNameRequired => 'Champ obligatoire.';

  @override
  String get registerPhone => 'Téléphone';

  @override
  String get registerPhoneHint => '07 07 00 00 00';

  @override
  String get registerPhoneInvalid => 'Ce numéro n\'est pas valide.';

  @override
  String get registerPasswordHint => '8 caractères minimum';

  @override
  String get registerPasswordTooShort => '8 caractères minimum.';

  @override
  String get registerReferral => 'Code d\'invitation (facultatif)';

  @override
  String registerReferralPartner(String name, String percent) {
    return 'Invitation de $name : −$percent % sur votre première réservation';
  }

  @override
  String get registerReferralKnown =>
      'Code reconnu : il sera appliqué à votre inscription.';

  @override
  String get registerReferralUnknown => 'Ce code n\'existe pas.';

  @override
  String get registerAcceptPrefix => 'J\'accepte les ';

  @override
  String get registerAcceptAnd => ' et la ';

  @override
  String get registerTermsLink => 'conditions générales';

  @override
  String get registerPrivacyLink => 'politique de confidentialité';

  @override
  String get registerTermsRequired => 'Acceptez les conditions pour continuer.';

  @override
  String get registerSubmit => 'Recevoir mon code';

  @override
  String get registerHaveAccount => 'Déjà un compte ?';

  @override
  String get registerLogin => 'Me connecter';

  @override
  String get otpTitle => 'Entrez le code reçu';

  @override
  String otpSubtitle(String email) {
    return 'Envoyé à $email, et par SMS si un numéro est enregistré. Il est valable 10 minutes.';
  }

  @override
  String get otpResend => 'Renvoyer le code';

  @override
  String otpResendIn(String seconds) {
    return 'Renvoyer dans $seconds s';
  }

  @override
  String get otpResent => 'Un nouveau code vient d\'être envoyé.';

  @override
  String get twoFaTitle => 'Double authentification';

  @override
  String get twoFaSubtitle =>
      'Saisissez le code à 6 chiffres de votre application d\'authentification.';

  @override
  String get twoFaUseRecovery => 'Utiliser un code de secours';

  @override
  String get twoFaUseCode => 'Utiliser le code de l\'application';

  @override
  String get twoFaRecoveryHint => 'Code de secours (8 caractères)';

  @override
  String get twoFaSubmit => 'Valider';

  @override
  String get forgotTitle => 'Mot de passe oublié';

  @override
  String get forgotSubtitle =>
      'Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.';

  @override
  String get forgotSubmit => 'Envoyer le lien';

  @override
  String get forgotSent =>
      'Lien envoyé. Vérifiez votre boîte de réception et vos courriers indésirables.';

  @override
  String get forgotBack => 'Retour à la connexion';

  @override
  String welcomeTitle(String name) {
    return 'Bienvenue, $name !';
  }

  @override
  String get welcomeSubtitle => 'Votre espace est prêt.';

  @override
  String welcomeDiscount(String percent) {
    return '−$percent % sur votre première réservation';
  }

  @override
  String get welcomeDiscountSub => 'Invitation appliquée automatiquement';

  @override
  String get welcomeCta => 'Découvrir les séjours';

  @override
  String get authBack => 'Retour';

  @override
  String get boLauncher => 'Demandez à Bo';

  @override
  String get boLauncherHint => 'Une question ?';

  @override
  String get boName => 'Bo';

  @override
  String get boSubtitle => 'Assistant boséjour';

  @override
  String get boHello => 'Bonjour !';

  @override
  String get boIntroTitle => 'Je suis Bo, votre assistant de séjour';

  @override
  String get boIntroText =>
      'Dites-moi où, quand et pour combien de personnes : je trouve, je compare et je prépare votre réservation, partout en Côte d\'Ivoire.';

  @override
  String get boTileHotel => 'Un hôtel à Abidjan';

  @override
  String get boTileHotelQuestion => 'Je cherche un hôtel à Abidjan';

  @override
  String get boTileWeekend => 'Un week-end à Assinie';

  @override
  String get boTileWeekendQuestion =>
      'Je cherche un hébergement pour un week-end à Assinie';

  @override
  String get boTileResidence => 'Une résidence meublée';

  @override
  String get boTileResidenceQuestion => 'Je cherche une résidence meublée';

  @override
  String get boTileBookings => 'Suivre ma réservation';

  @override
  String get boTileBookingsQuestion => 'Où en sont mes réservations ?';

  @override
  String get boInputHint => 'Demandez à Bo';

  @override
  String get boSend => 'Envoyer';

  @override
  String get boNewChat => 'Nouvelle conversation';

  @override
  String boToday(String time) {
    return 'Aujourd\'hui · $time';
  }

  @override
  String get boChoice => 'Choix de Bo';

  @override
  String get boPriceOnPage => 'Tarif sur la fiche';

  @override
  String get boView => 'Voir';

  @override
  String get boLoginRequired =>
      'Connectez-vous à votre espace voyageur pour discuter avec Bo.';

  @override
  String get boLogin => 'Me connecter';

  @override
  String get boErrorTooFast =>
      'Vous posez des questions un peu vite. Patientez une minute, puis réessayez.';

  @override
  String get boErrorGeneric =>
      'Bo n\'a pas pu répondre. Vérifiez votre connexion, puis réessayez.';

  @override
  String get boClose => 'Fermer la conversation avec Bo';
}
